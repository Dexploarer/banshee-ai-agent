use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use anyhow::Result;
use uuid::Uuid;
use std::collections::HashMap;

// Agent Memory Types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentMemory {
    pub id: String,
    pub agent_id: String,
    pub memory_type: MemoryType,
    pub content: String,
    pub metadata: HashMap<String, String>,
    pub embedding: Option<Vec<f32>>,
    pub relevance_score: f32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub access_count: i32,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub enum MemoryType {
    Conversation,
    Task,
    Learning,
    Context,
    Tool,
    Error,
    Success,
    Pattern,
}

// Shared Knowledge Types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SharedKnowledge {
    pub id: String,
    pub knowledge_type: KnowledgeType,
    pub title: String,
    pub content: String,
    pub source_agents: Vec<String>,
    pub embedding: Option<Vec<f32>>,
    pub confidence_score: f32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: i32,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum KnowledgeType {
    Fact,
    Procedure,
    Pattern,
    Rule,
    Concept,
    Relationship,
}

// Knowledge Graph Types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KnowledgeNode {
    pub id: String,
    pub node_type: NodeType,
    pub name: String,
    pub properties: HashMap<String, String>,
    pub embedding: Option<Vec<f32>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum NodeType {
    Agent,
    Memory,
    Concept,
    Task,
    Tool,
    Context,
    Pattern,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KnowledgeEdge {
    pub id: String,
    pub from_node: String,
    pub to_node: String,
    pub relationship_type: RelationshipType,
    pub weight: f32,
    pub properties: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum RelationshipType {
    Knows,
    Uses,
    LearnedFrom,
    CollaboratesWith,
    DependsOn,
    Similar,
    Opposite,
    CausedBy,
    LeadsTo,
}

// Memory Search and Retrieval
#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryQuery {
    pub agent_id: Option<String>,
    pub memory_types: Option<Vec<MemoryType>>,
    pub content_search: Option<String>,
    pub tags: Option<Vec<String>>,
    pub embedding: Option<Vec<f32>>,
    pub similarity_threshold: Option<f32>,
    pub limit: Option<usize>,
    pub time_range: Option<(DateTime<Utc>, DateTime<Utc>)>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemorySearchResult {
    pub memory: AgentMemory,
    pub similarity_score: Option<f32>,
    pub relevance_rank: usize,
}

// Agent Interaction Tracking
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentInteraction {
    pub id: String,
    pub agent1_id: String,
    pub agent2_id: String,
    pub interaction_type: InteractionType,
    pub context: String,
    pub success: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum InteractionType {
    Collaboration,
    KnowledgeSharing,
    TaskHandoff,
    Conflict,
    Learning,
}

// Memory Statistics and Analytics
#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryStats {
    pub agent_id: String,
    pub total_memories: usize,
    pub memory_type_counts: HashMap<MemoryType, usize>,
    pub average_relevance: f32,
    pub most_accessed_memories: Vec<AgentMemory>,
    pub recent_learnings: Vec<AgentMemory>,
    pub knowledge_graph_size: usize,
}

impl AgentMemory {
    pub fn new(agent_id: String, memory_type: MemoryType, content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            agent_id,
            memory_type,
            content,
            metadata: HashMap::new(),
            embedding: None,
            relevance_score: 1.0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            access_count: 0,
            tags: Vec::new(),
        }
    }

    pub fn with_embedding(mut self, embedding: Vec<f32>) -> Self {
        self.embedding = Some(embedding);
        self
    }

    pub fn with_tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    pub fn with_metadata(mut self, metadata: HashMap<String, String>) -> Self {
        self.metadata = metadata;
        self
    }

    pub fn calculate_similarity(&self, other_embedding: &[f32]) -> Option<f32> {
        if let Some(ref embedding) = self.embedding {
            Some(cosine_similarity(embedding, other_embedding))
        } else {
            None
        }
    }
}

impl SharedKnowledge {
    pub fn new(knowledge_type: KnowledgeType, title: String, content: String, source_agent: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            knowledge_type,
            title,
            content,
            source_agents: vec![source_agent],
            embedding: None,
            confidence_score: 1.0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            version: 1,
            tags: Vec::new(),
        }
    }

    pub fn add_source_agent(&mut self, agent_id: String) {
        if !self.source_agents.contains(&agent_id) {
            self.source_agents.push(agent_id);
            self.confidence_score += 0.1; // Increase confidence with more sources
            self.updated_at = Utc::now();
            self.version += 1;
        }
    }
}

impl KnowledgeNode {
    pub fn new(node_type: NodeType, name: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            node_type,
            name,
            properties: HashMap::new(),
            embedding: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }
}

impl KnowledgeEdge {
    pub fn new(from_node: String, to_node: String, relationship_type: RelationshipType) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            from_node,
            to_node,
            relationship_type,
            weight: 1.0,
            properties: HashMap::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    pub fn with_weight(mut self, weight: f32) -> Self {
        self.weight = weight;
        self
    }
}

// Utility functions
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

pub fn extract_keywords(text: &str) -> Vec<String> {
    // Simple keyword extraction - can be enhanced with NLP
    text.split_whitespace()
        .filter(|word| word.len() > 3)
        .map(|word| word.to_lowercase())
        .collect()
}