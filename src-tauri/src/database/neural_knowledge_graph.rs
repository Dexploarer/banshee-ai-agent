use anyhow::{Result, anyhow};
use std::collections::HashMap;
use super::neural_network::{NeuralNetwork, NetworkBuilder, ActivationFunction};
use super::neural_embeddings::NeuralEmbeddingService;
use super::memory_sequence_models::{MemorySequenceAnalyzer, SequenceModelType};
use super::memory::{AgentMemory, MemoryType};
use super::simple_commands::{GraphNode, GraphEdge, KnowledgeGraphView};
use serde::{Serialize, Deserialize};
use ndarray::{Array1, Array2};
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc, Duration};

/// Neural Knowledge Graph Engine with Graph Neural Networks
pub struct NeuralKnowledgeGraph {
    /// Node embedding neural network
    node_network: NeuralNetwork,
    /// Edge/relationship embedding neural network  
    edge_network: NeuralNetwork,
    /// Graph attention network for relationship weighting
    attention_network: NeuralNetwork,
    /// Memory sequence analyzer for temporal patterns
    sequence_analyzer: MemorySequenceAnalyzer,
    /// Neural embedding service for content processing
    embedding_service: Arc<RwLock<NeuralEmbeddingService>>,
    /// Cached node embeddings
    node_embeddings: Arc<RwLock<HashMap<String, Vec<f32>>>>,
    /// Cached edge embeddings
    edge_embeddings: Arc<RwLock<HashMap<String, Vec<f32>>>>,
    /// Graph structure cache
    graph_structure: Arc<RwLock<GraphStructure>>,
    /// Configuration
    config: NeuralGraphConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeuralGraphConfig {
    pub node_embedding_dim: usize,
    pub edge_embedding_dim: usize,
    pub attention_heads: usize,
    pub max_neighbors: usize,
    pub temporal_window_hours: i64,
    pub similarity_threshold: f32,
    pub learning_rate: f32,
    pub cache_size_limit: usize,
}

impl Default for NeuralGraphConfig {
    fn default() -> Self {
        Self {
            node_embedding_dim: 128,
            edge_embedding_dim: 64,
            attention_heads: 4,
            max_neighbors: 50,
            temporal_window_hours: 24,
            similarity_threshold: 0.7,
            learning_rate: 0.001,
            cache_size_limit: 10000,
        }
    }
}

#[derive(Debug, Clone)]
struct GraphStructure {
    nodes: HashMap<String, NeuralGraphNode>,
    edges: HashMap<String, NeuralGraphEdge>,
    adjacency: HashMap<String, Vec<String>>, // node_id -> connected_node_ids
    reverse_adjacency: HashMap<String, Vec<String>>, // node_id -> nodes_pointing_to_this
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeuralGraphNode {
    pub id: String,
    pub node_type: String,
    pub name: String,
    pub content: String,
    pub memory_type: Option<MemoryType>,
    pub agent_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
    pub access_count: usize,
    pub embedding: Option<Vec<f32>>,
    pub properties: HashMap<String, String>,
    pub position: Option<(f32, f32)>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeuralGraphEdge {
    pub id: String,
    pub from_node: String,
    pub to_node: String,
    pub relationship_type: String,
    pub weight: f32,
    pub confidence: f32,
    pub created_at: DateTime<Utc>,
    pub last_updated: DateTime<Utc>,
    pub temporal_strength: f32,
    pub embedding: Option<Vec<f32>>,
    pub properties: HashMap<String, String>,
}

/// Relationship types discovered by neural analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum NeuralRelationshipType {
    /// Direct semantic similarity
    SemanticSimilarity,
    /// Temporal sequence relationship
    TemporalSequence,
    /// Causal relationship
    CausalRelation,
    /// Agent collaboration
    AgentCollaboration,
    /// Context sharing
    ContextSharing,
    /// Pattern similarity
    PatternSimilarity,
    /// Tool usage relationship
    ToolUsage,
    /// Error-solution relationship
    ErrorSolution,
}

impl NeuralKnowledgeGraph {
    /// Create a new neural knowledge graph
    pub async fn new(config: Option<NeuralGraphConfig>) -> Result<Self> {
        let config = config.unwrap_or_default();
        
        // Create node embedding network
        let node_network = NetworkBuilder::new()
            .input_layer(512) // Text features + metadata
            .hidden_layer_with_activation(256, ActivationFunction::GELU, 0.1)
            .hidden_layer_with_activation(128, ActivationFunction::ReLU, 0.1)
            .output_layer(config.node_embedding_dim)
            .learning_rate(config.learning_rate)
            .build()?;

        // Create edge embedding network
        let edge_network = NetworkBuilder::new()
            .input_layer(config.node_embedding_dim * 2 + 32) // Two node embeddings + relationship features
            .hidden_layer_with_activation(128, ActivationFunction::Tanh, 0.1)
            .hidden_layer_with_activation(64, ActivationFunction::ReLU, 0.05)
            .output_layer(config.edge_embedding_dim)
            .learning_rate(config.learning_rate)
            .build()?;

        // Create attention network for relationship weighting
        let attention_network = NetworkBuilder::new()
            .input_layer(config.node_embedding_dim + config.edge_embedding_dim)
            .hidden_layer_with_activation(64, ActivationFunction::LeakyReLU, 0.1)
            .hidden_layer_with_activation(32, ActivationFunction::Sigmoid, 0.1)
            .output_layer(config.attention_heads)
            .learning_rate(config.learning_rate * 0.5)
            .build()?;

        // Create sequence analyzer for temporal patterns
        let sequence_analyzer = MemorySequenceAnalyzer::new(256, 128, config.node_embedding_dim)?;

        // Create neural embedding service
        let embedding_service = Arc::new(RwLock::new(
            NeuralEmbeddingService::new(None).await?
        ));

        Ok(Self {
            node_network,
            edge_network,
            attention_network,
            sequence_analyzer,
            embedding_service,
            node_embeddings: Arc::new(RwLock::new(HashMap::new())),
            edge_embeddings: Arc::new(RwLock::new(HashMap::new())),
            graph_structure: Arc::new(RwLock::new(GraphStructure {
                nodes: HashMap::new(),
                edges: HashMap::new(),
                adjacency: HashMap::new(),
                reverse_adjacency: HashMap::new(),
            })),
            config,
        })
    }

    /// Add a memory to the knowledge graph as a node
    pub async fn add_memory_node(&mut self, memory: &AgentMemory) -> Result<String> {
        let node_id = format!("memory_{}", memory.id);
        
        // Generate node embedding
        let embedding_service = self.embedding_service.read().await;
        let node_embedding = embedding_service.embed_memory(memory).await?;
        drop(embedding_service);

        // Create neural graph node
        let neural_node = NeuralGraphNode {
            id: node_id.clone(),
            node_type: "memory".to_string(),
            name: format!("Memory: {}", memory.memory_type),
            content: memory.content.clone(),
            memory_type: Some(memory.memory_type.clone()),
            agent_id: Some(memory.agent_id.clone()),
            created_at: memory.created_at,
            last_accessed: Utc::now(),
            access_count: memory.access_count as usize,
            embedding: Some(node_embedding.clone()),
            properties: memory.metadata.clone(),
            position: None,
        };

        // Store in graph structure
        {
            let mut graph = self.graph_structure.write().await;
            graph.nodes.insert(node_id.clone(), neural_node);
            graph.adjacency.entry(node_id.clone()).or_insert_with(Vec::new);
            graph.reverse_adjacency.entry(node_id.clone()).or_insert_with(Vec::new);
        }

        // Cache node embedding
        {
            let mut embeddings = self.node_embeddings.write().await;
            embeddings.insert(node_id.clone(), node_embedding);
            
            // Limit cache size
            if embeddings.len() > self.config.cache_size_limit {
                // Simple LRU: remove oldest entries
                let keys_to_remove: Vec<_> = embeddings.keys().take(embeddings.len() / 4).cloned().collect();
                for key in keys_to_remove {
                    embeddings.remove(&key);
                }
            }
        }

        // Auto-discover relationships with existing nodes
        self.discover_relationships(&node_id).await?;

        Ok(node_id)
    }

    /// Discover relationships between nodes using neural analysis
    async fn discover_relationships(&mut self, node_id: &str) -> Result<()> {
        let graph = self.graph_structure.read().await;
        let current_node = graph.nodes.get(node_id)
            .ok_or_else(|| anyhow!("Node not found: {}", node_id))?
            .clone();
        drop(graph);

        let current_embedding = current_node.embedding.as_ref()
            .ok_or_else(|| anyhow!("Node has no embedding: {}", node_id))?
            .clone();

        // Find similar nodes within temporal window
        let temporal_threshold = Utc::now() - Duration::hours(self.config.temporal_window_hours);
        let mut candidate_relationships = Vec::new();

        {
            let graph = self.graph_structure.read().await;
            for (other_id, other_node) in &graph.nodes {
                if other_id == node_id || other_node.created_at < temporal_threshold {
                    continue;
                }

                if let Some(ref other_embedding) = other_node.embedding {
                    let similarity = cosine_similarity(&current_embedding, other_embedding);
                    
                    if similarity >= self.config.similarity_threshold {
                        let relationship_type = self.classify_relationship(&current_node, other_node, similarity).await?;
                        candidate_relationships.push((other_id.clone(), relationship_type, similarity));
                    }
                }
            }
        }

        // Create edges for discovered relationships
        for (other_node_id, rel_type, similarity) in candidate_relationships {
            self.create_neural_edge(node_id, &other_node_id, rel_type, similarity).await?;
        }

        Ok(())
    }

    /// Classify the type of relationship between two nodes
    async fn classify_relationship(
        &self,
        node1: &NeuralGraphNode,
        node2: &NeuralGraphNode,
        similarity: f32,
    ) -> Result<NeuralRelationshipType> {
        // Semantic similarity (high embedding similarity)
        if similarity > 0.9 {
            return Ok(NeuralRelationshipType::SemanticSimilarity);
        }

        // Same agent collaboration
        if node1.agent_id == node2.agent_id && node1.agent_id.is_some() {
            return Ok(NeuralRelationshipType::AgentCollaboration);
        }

        // Temporal sequence (same agent, close in time)
        if node1.agent_id == node2.agent_id {
            let time_diff = (node2.created_at - node1.created_at).num_minutes().abs();
            if time_diff < 60 { // Within 1 hour
                return Ok(NeuralRelationshipType::TemporalSequence);
            }
        }

        // Memory type patterns
        if let (Some(type1), Some(type2)) = (&node1.memory_type, &node2.memory_type) {
            match (type1, type2) {
                (MemoryType::Error, MemoryType::Success) | (MemoryType::Success, MemoryType::Error) => {
                    return Ok(NeuralRelationshipType::ErrorSolution);
                }
                (MemoryType::Tool, _) | (_, MemoryType::Tool) => {
                    return Ok(NeuralRelationshipType::ToolUsage);
                }
                (MemoryType::Pattern, _) | (_, MemoryType::Pattern) => {
                    return Ok(NeuralRelationshipType::PatternSimilarity);
                }
                _ => {}
            }
        }

        // Context sharing (similar content themes)
        if self.analyze_context_similarity(&node1.content, &node2.content).await? > 0.8 {
            return Ok(NeuralRelationshipType::ContextSharing);
        }

        // Default to semantic similarity
        Ok(NeuralRelationshipType::SemanticSimilarity)
    }

    /// Analyze context similarity between two text contents
    async fn analyze_context_similarity(&self, content1: &str, content2: &str) -> Result<f32> {
        let embedding_service = self.embedding_service.read().await;
        let emb1 = embedding_service.embed_text(content1, None).await?;
        let emb2 = embedding_service.embed_text(content2, None).await?;
        Ok(cosine_similarity(&emb1, &emb2))
    }

    /// Create a neural edge between two nodes
    async fn create_neural_edge(
        &mut self,
        from_node: &str,
        to_node: &str,
        relationship_type: NeuralRelationshipType,
        confidence: f32,
    ) -> Result<String> {
        let edge_id = format!("edge_{}_{}", from_node, to_node);

        // Get node embeddings
        let node_embeddings = self.node_embeddings.read().await;
        let from_embedding = node_embeddings.get(from_node)
            .ok_or_else(|| anyhow!("From node embedding not found: {}", from_node))?
            .clone();
        let to_embedding = node_embeddings.get(to_node)
            .ok_or_else(|| anyhow!("To node embedding not found: {}", to_node))?
            .clone();
        drop(node_embeddings);

        // Create edge features
        let mut edge_features = Vec::new();
        edge_features.extend(from_embedding);
        edge_features.extend(to_embedding);
        
        // Add relationship type features
        let type_features = self.encode_relationship_type(&relationship_type);
        edge_features.extend(type_features);

        // Generate edge embedding
        let edge_embedding = self.edge_network.run(&edge_features);

        // Calculate temporal strength
        let now = Utc::now();
        let temporal_strength = self.calculate_temporal_strength(&now, &now);

        // Create neural graph edge
        let neural_edge = NeuralGraphEdge {
            id: edge_id.clone(),
            from_node: from_node.to_string(),
            to_node: to_node.to_string(),
            relationship_type: format!("{:?}", relationship_type),
            weight: confidence,
            confidence,
            created_at: now,
            last_updated: now,
            temporal_strength,
            embedding: Some(edge_embedding.clone()),
            properties: HashMap::new(),
        };

        // Store in graph structure
        {
            let mut graph = self.graph_structure.write().await;
            graph.edges.insert(edge_id.clone(), neural_edge);
            
            // Update adjacency lists
            graph.adjacency.entry(from_node.to_string()).or_default().push(to_node.to_string());
            graph.reverse_adjacency.entry(to_node.to_string()).or_default().push(from_node.to_string());
        }

        // Cache edge embedding
        {
            let mut embeddings = self.edge_embeddings.write().await;
            embeddings.insert(edge_id.clone(), edge_embedding);
        }

        Ok(edge_id)
    }

    /// Encode relationship type into feature vector
    fn encode_relationship_type(&self, rel_type: &NeuralRelationshipType) -> Vec<f32> {
        let mut features = vec![0.0; 8]; // 8 relationship types
        
        let index = match rel_type {
            NeuralRelationshipType::SemanticSimilarity => 0,
            NeuralRelationshipType::TemporalSequence => 1,
            NeuralRelationshipType::CausalRelation => 2,
            NeuralRelationshipType::AgentCollaboration => 3,
            NeuralRelationshipType::ContextSharing => 4,
            NeuralRelationshipType::PatternSimilarity => 5,
            NeuralRelationshipType::ToolUsage => 6,
            NeuralRelationshipType::ErrorSolution => 7,
        };
        
        features[index] = 1.0;
        features
    }

    /// Calculate temporal strength based on recency
    fn calculate_temporal_strength(&self, created_at: &DateTime<Utc>, now: &DateTime<Utc>) -> f32 {
        let hours_ago = (now.signed_duration_since(*created_at)).num_hours() as f32;
        let max_hours = self.config.temporal_window_hours as f32;
        (1.0 - (hours_ago / max_hours)).max(0.0)
    }

    /// Get neural-enhanced knowledge graph view
    pub async fn get_neural_graph_view(&self, agent_id: Option<String>) -> Result<KnowledgeGraphView> {
        let graph = self.graph_structure.read().await;
        
        let mut nodes = Vec::new();
        let mut edges = Vec::new();

        // Filter nodes by agent if specified
        for (node_id, neural_node) in &graph.nodes {
            if let Some(ref filter_agent) = agent_id {
                if neural_node.agent_id.as_ref() != Some(filter_agent) {
                    continue;
                }
            }

            // Convert to GraphNode
            let graph_node = GraphNode {
                id: node_id.clone(),
                node_type: neural_node.node_type.clone(),
                name: neural_node.name.clone(),
                properties: Some(neural_node.properties.clone()),
                position: neural_node.position,
            };
            nodes.push(graph_node);
        }

        // Get edges for visible nodes
        let visible_node_ids: std::collections::HashSet<_> = nodes.iter().map(|n| &n.id).collect();
        
        for (edge_id, neural_edge) in &graph.edges {
            if visible_node_ids.contains(&neural_edge.from_node) && 
               visible_node_ids.contains(&neural_edge.to_node) {
                
                let graph_edge = GraphEdge {
                    id: edge_id.clone(),
                    from_node: neural_edge.from_node.clone(),
                    to_node: neural_edge.to_node.clone(),
                    relationship_type: neural_edge.relationship_type.clone(),
                    weight: Some(neural_edge.weight),
                    properties: Some(neural_edge.properties.clone()),
                };
                edges.push(graph_edge);
            }
        }

        // Create metadata with neural statistics
        let mut metadata = HashMap::new();
        metadata.insert("total_nodes".to_string(), graph.nodes.len().to_string());
        metadata.insert("total_edges".to_string(), graph.edges.len().to_string());
        metadata.insert("visible_nodes".to_string(), nodes.len().to_string());
        metadata.insert("visible_edges".to_string(), edges.len().to_string());
        metadata.insert("neural_enhanced".to_string(), "true".to_string());

        Ok(KnowledgeGraphView {
            nodes,
            edges,
            metadata,
        })
    }

    /// Find similar memories using neural graph traversal
    pub async fn find_similar_memories(
        &self,
        query_memory: &AgentMemory,
        max_results: usize,
    ) -> Result<Vec<(String, f32)>> {
        // Generate query embedding
        let embedding_service = self.embedding_service.read().await;
        let query_embedding = embedding_service.embed_memory(query_memory).await?;
        drop(embedding_service);

        let mut similarities = Vec::new();
        
        // Compare with all cached node embeddings
        let node_embeddings = self.node_embeddings.read().await;
        for (node_id, node_embedding) in node_embeddings.iter() {
            let similarity = cosine_similarity(&query_embedding, node_embedding);
            similarities.push((node_id.clone(), similarity));
        }
        drop(node_embeddings);

        // Sort by similarity and return top results
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        similarities.truncate(max_results);

        Ok(similarities)
    }

    /// Perform graph neural network inference for relationship prediction
    pub async fn predict_relationships(&self, from_node_id: &str, candidate_nodes: &[String]) -> Result<Vec<(String, f32)>> {
        let node_embeddings = self.node_embeddings.read().await;
        let from_embedding = node_embeddings.get(from_node_id)
            .ok_or_else(|| anyhow!("From node not found: {}", from_node_id))?;

        let mut predictions = Vec::new();
        
        for candidate_id in candidate_nodes {
            if let Some(to_embedding) = node_embeddings.get(candidate_id) {
                // Create edge features
                let mut edge_features = Vec::new();
                edge_features.extend(from_embedding);
                edge_features.extend(to_embedding);
                edge_features.extend(vec![0.0; 8]); // Neutral relationship type
                
                // Get edge embedding
                let edge_embedding = self.edge_network.run(&edge_features);
                
                // Use attention network to predict relationship strength
                let mut attention_input = Vec::new();
                attention_input.extend(from_embedding);
                attention_input.extend(&edge_embedding);
                
                let attention_scores = self.attention_network.run(&attention_input);
                let relationship_strength = attention_scores.iter().sum::<f32>() / attention_scores.len() as f32;
                
                predictions.push((candidate_id.clone(), relationship_strength));
            }
        }

        // Sort by predicted strength
        predictions.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        Ok(predictions)
    }

    /// Get graph statistics
    pub async fn get_statistics(&self) -> NeuralGraphStatistics {
        let graph = self.graph_structure.read().await;
        let node_embeddings = self.node_embeddings.read().await;
        let edge_embeddings = self.edge_embeddings.read().await;

        NeuralGraphStatistics {
            total_nodes: graph.nodes.len(),
            total_edges: graph.edges.len(),
            cached_node_embeddings: node_embeddings.len(),
            cached_edge_embeddings: edge_embeddings.len(),
            avg_node_degree: if graph.nodes.is_empty() { 0.0 } else {
                graph.adjacency.values().map(|v| v.len()).sum::<usize>() as f32 / graph.nodes.len() as f32
            },
            relationship_types: self.count_relationship_types(&graph),
        }
    }

    /// Count relationship types in the graph
    fn count_relationship_types(&self, graph: &GraphStructure) -> HashMap<String, usize> {
        let mut counts = HashMap::new();
        for edge in graph.edges.values() {
            *counts.entry(edge.relationship_type.clone()).or_insert(0) += 1;
        }
        counts
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NeuralGraphStatistics {
    pub total_nodes: usize,
    pub total_edges: usize,
    pub cached_node_embeddings: usize,
    pub cached_edge_embeddings: usize,
    pub avg_node_degree: f32,
    pub relationship_types: HashMap<String, usize>,
}

/// Cosine similarity function for embeddings
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[tokio::test]
    async fn test_neural_knowledge_graph_creation() {
        let graph = NeuralKnowledgeGraph::new(None).await.unwrap();
        let stats = graph.get_statistics().await;
        
        assert_eq!(stats.total_nodes, 0);
        assert_eq!(stats.total_edges, 0);
    }

    #[tokio::test]
    async fn test_memory_node_addition() {
        let mut graph = NeuralKnowledgeGraph::new(None).await.unwrap();
        
        let memory = AgentMemory::new(
            "test_agent".to_string(),
            MemoryType::Task,
            "Test memory content".to_string(),
        );
        
        let node_id = graph.add_memory_node(&memory).await.unwrap();
        assert!(node_id.starts_with("memory_"));
        
        let stats = graph.get_statistics().await;
        assert_eq!(stats.total_nodes, 1);
    }

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let c = vec![1.0, 0.0, 0.0];
        
        assert_eq!(cosine_similarity(&a, &b), 0.0);
        assert_eq!(cosine_similarity(&a, &c), 1.0);
    }

    #[test]
    fn test_relationship_type_encoding() {
        let graph = NeuralKnowledgeGraph {
            node_network: NetworkBuilder::new().input_layer(1).output_layer(1).build().unwrap(),
            edge_network: NetworkBuilder::new().input_layer(1).output_layer(1).build().unwrap(),
            attention_network: NetworkBuilder::new().input_layer(1).output_layer(1).build().unwrap(),
            sequence_analyzer: MemorySequenceAnalyzer::new(32, 64, 128).unwrap(),
            embedding_service: Arc::new(RwLock::new(
                // This would require async context, so we'll skip this part in the test
                futures::executor::block_on(NeuralEmbeddingService::new(None)).unwrap()
            )),
            node_embeddings: Arc::new(RwLock::new(HashMap::new())),
            edge_embeddings: Arc::new(RwLock::new(HashMap::new())),
            graph_structure: Arc::new(RwLock::new(GraphStructure {
                nodes: HashMap::new(),
                edges: HashMap::new(),
                adjacency: HashMap::new(),
                reverse_adjacency: HashMap::new(),
            })),
            config: NeuralGraphConfig::default(),
        };
        
        let encoding = graph.encode_relationship_type(&NeuralRelationshipType::SemanticSimilarity);
        assert_eq!(encoding.len(), 8);
        assert_eq!(encoding[0], 1.0);
        assert!(encoding[1..].iter().all(|&x| x == 0.0));
    }
}