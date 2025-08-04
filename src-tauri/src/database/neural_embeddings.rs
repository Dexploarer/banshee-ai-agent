use anyhow::{Result, anyhow};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use sha2::{Sha256, Digest};
use super::neural_network::{NeuralNetwork, NetworkBuilder, ActivationFunction, TrainingData};
use super::memory::{MemoryType, AgentMemory};
use serde::{Serialize, Deserialize};

/// Neural embedding service that uses FANN-inspired neural networks
/// to generate meaningful embeddings for different memory types
pub struct NeuralEmbeddingService {
    /// Cache for computed embeddings
    cache: Arc<RwLock<HashMap<String, Vec<f32>>>>,
    /// Neural networks specialized for different memory types
    memory_networks: HashMap<MemoryType, NeuralNetwork>,
    /// General purpose embedding network
    general_network: NeuralNetwork,
    /// Configuration for the service
    config: EmbeddingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingConfig {
    pub embedding_dim: usize,
    pub max_text_length: usize,
    pub learning_rate: f32,
    pub training_epochs: usize,
    pub cache_size_limit: usize,
}

impl Default for EmbeddingConfig {
    fn default() -> Self {
        Self {
            embedding_dim: 256,
            max_text_length: 512,
            learning_rate: 0.001,
            training_epochs: 100,
            cache_size_limit: 10000,
        }
    }
}

impl NeuralEmbeddingService {
    /// Create a new neural embedding service
    pub async fn new(config: Option<EmbeddingConfig>) -> Result<Self> {
        let config = config.unwrap_or_default();
        
        // Create general purpose embedding network
        let general_network = NetworkBuilder::new()
            .input_layer(config.max_text_length) // Text feature input
            .hidden_layer_with_activation(512, ActivationFunction::ReLU, 0.1)
            .hidden_layer_with_activation(384, ActivationFunction::GELU, 0.1)
            .output_layer(config.embedding_dim)
            .learning_rate(config.learning_rate)
            .build()?;

        // Create specialized networks for different memory types
        let mut memory_networks = HashMap::new();
        
        // Conversation memory network - optimized for dialogue understanding
        let conversation_network = NetworkBuilder::new()
            .input_layer(config.max_text_length)
            .hidden_layer_with_activation(256, ActivationFunction::Tanh, 0.1)
            .hidden_layer_with_activation(128, ActivationFunction::ReLU, 0.05)
            .output_layer(config.embedding_dim)
            .learning_rate(config.learning_rate * 1.2) // Slightly higher learning rate
            .build()?;
        memory_networks.insert(MemoryType::Conversation, conversation_network);

        // Task memory network - optimized for action/goal understanding
        let task_network = NetworkBuilder::new()
            .input_layer(config.max_text_length)
            .hidden_layer_with_activation(384, ActivationFunction::ReLU, 0.1)
            .hidden_layer_with_activation(192, ActivationFunction::GELU, 0.1)
            .output_layer(config.embedding_dim)
            .learning_rate(config.learning_rate)
            .build()?;
        memory_networks.insert(MemoryType::Task, task_network);

        // Learning memory network - optimized for knowledge extraction
        let learning_network = NetworkBuilder::new()
            .input_layer(config.max_text_length)
            .hidden_layer_with_activation(512, ActivationFunction::GELU, 0.15)
            .hidden_layer_with_activation(256, ActivationFunction::Tanh, 0.1)
            .output_layer(config.embedding_dim)
            .learning_rate(config.learning_rate * 0.8) // Slower learning for stability
            .build()?;
        memory_networks.insert(MemoryType::Learning, learning_network);

        // Pattern memory network - optimized for pattern recognition
        let pattern_network = NetworkBuilder::new()
            .input_layer(config.max_text_length)
            .hidden_layer_with_activation(128, ActivationFunction::ReLU, 0.2)
            .hidden_layer_with_activation(64, ActivationFunction::Sigmoid, 0.1)
            .output_layer(config.embedding_dim)
            .learning_rate(config.learning_rate * 1.5)
            .build()?;
        memory_networks.insert(MemoryType::Pattern, pattern_network);

        Ok(Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            memory_networks,
            general_network,
            config,
        })
    }

    /// Generate embedding for text using appropriate neural network
    pub async fn embed_text(&self, text: &str, memory_type: Option<MemoryType>) -> Result<Vec<f32>> {
        // Check cache first
        let cache_key = self.generate_cache_key(text, &memory_type);
        
        {
            let cache = self.cache.read().await;
            if let Some(cached_embedding) = cache.get(&cache_key) {
                return Ok(cached_embedding.clone());
            }
        }

        // Preprocess text into neural network input
        let input_features = self.text_to_features(text)?;
        
        // Select appropriate network
        let embedding = if let Some(ref mem_type) = memory_type {
            if let Some(network) = self.memory_networks.get(mem_type) {
                network.run(&input_features)
            } else {
                self.general_network.run(&input_features)
            }
        } else {
            self.general_network.run(&input_features)
        };

        // Normalize the embedding
        let normalized_embedding = self.normalize_embedding(&embedding);

        // Cache the result (with size limit)
        {
            let mut cache = self.cache.write().await;
            if cache.len() >= self.config.cache_size_limit {
                // Remove oldest entries (simple LRU would be better, but this works)
                cache.clear();
            }
            cache.insert(cache_key, normalized_embedding.clone());
        }

        Ok(normalized_embedding)
    }

    /// Generate embeddings for multiple texts
    pub async fn embed_batch(
        &self, 
        texts: &[(String, Option<MemoryType>)]
    ) -> Result<Vec<Vec<f32>>> {
        let mut embeddings = Vec::new();
        
        for (text, memory_type) in texts {
            let embedding = self.embed_text(text, memory_type.clone()).await?;
            embeddings.push(embedding);
        }

        Ok(embeddings)
    }

    /// Generate embedding specifically for agent memory
    pub async fn embed_memory(&self, memory: &AgentMemory) -> Result<Vec<f32>> {
        // Combine content with metadata for richer embeddings
        let enhanced_text = self.enhance_text_with_metadata(memory);
        self.embed_text(&enhanced_text, Some(memory.memory_type.clone())).await
    }

    /// Train networks on memory data to improve embeddings
    pub async fn train_on_memories(&mut self, memories: &[AgentMemory]) -> Result<()> {
        if memories.is_empty() {
            return Ok(());
        }

        // Group memories by type for specialized training
        let mut memory_groups: HashMap<MemoryType, Vec<&AgentMemory>> = HashMap::new();
        for memory in memories {
            memory_groups.entry(memory.memory_type.clone())
                .or_insert_with(Vec::new)
                .push(memory);
        }

        // Prepare all training data first to avoid borrowing conflicts
        let mut prepared_training_data = HashMap::new();
        
        // Prepare training data for each memory type
        for (memory_type, group_memories) in &memory_groups {
            let training_data = self.prepare_training_data(group_memories)?;
            prepared_training_data.insert(memory_type.clone(), training_data);
        }
        
        // Prepare training data for general network
        let memory_refs: Vec<&AgentMemory> = memories.iter().collect();
        let all_training_data = self.prepare_training_data(&memory_refs)?;

        // Train each specialized network
        for (memory_type, training_data) in prepared_training_data {
            if let Some(network) = self.memory_networks.get_mut(&memory_type) {
                Self::train_network_static(network, &training_data, self.config.training_epochs, self.config.learning_rate).await?;
            }
        }

        // Train general network on all memories
        Self::train_network_static(&mut self.general_network, &all_training_data, self.config.training_epochs, self.config.learning_rate).await?;

        // Clear cache after training since embeddings will have changed
        {
            let mut cache = self.cache.write().await;
            cache.clear();
        }

        Ok(())
    }

    /// Compute similarity between two embeddings
    pub fn compute_similarity(&self, embedding1: &[f32], embedding2: &[f32]) -> f32 {
        cosine_similarity(embedding1, embedding2)
    }

    /// Find similar embeddings from a set of candidates
    pub async fn find_similar_memories(
        &self,
        query_text: &str,
        query_type: Option<MemoryType>,
        candidate_memories: &[AgentMemory],
        threshold: f32,
        top_k: usize,
    ) -> Result<Vec<(String, f32)>> {
        let query_embedding = self.embed_text(query_text, query_type).await?;
        
        let mut similarities = Vec::new();
        
        for memory in candidate_memories {
            let memory_embedding = self.embed_memory(memory).await?;
            let similarity = self.compute_similarity(&query_embedding, &memory_embedding);
            
            if similarity >= threshold {
                similarities.push((memory.id.clone(), similarity));
            }
        }

        // Sort by similarity (descending)
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Take top k results
        similarities.truncate(top_k);
        Ok(similarities)
    }

    /// Get embedding statistics
    pub async fn get_stats(&self) -> EmbeddingStats {
        let cache = self.cache.read().await;
        EmbeddingStats {
            cache_size: cache.len(),
            cache_limit: self.config.cache_size_limit,
            embedding_dimension: self.config.embedding_dim,
            specialized_networks: self.memory_networks.len(),
        }
    }

    // Private helper methods

    /// Convert text to neural network input features
    fn text_to_features(&self, text: &str) -> Result<Vec<f32>> {
        let mut features = vec![0.0; self.config.max_text_length];
        
        // Character-level encoding with position awareness
        let chars: Vec<char> = text.chars().collect();
        for (i, &ch) in chars.iter().enumerate() {
            if i >= self.config.max_text_length {
                break;
            }
            
            // Normalize character to 0-1 range
            let char_value = (ch as u32 as f32) / 65536.0; // Unicode max
            features[i] = char_value;
        }

        // Add text statistics as features in remaining positions
        let text_len = chars.len();
        if text_len + 10 < self.config.max_text_length {
            let stats_start = self.config.max_text_length - 10;
            
            // Text length (normalized)
            features[stats_start] = (text_len as f32) / 1000.0;
            
            // Word count
            let word_count = text.split_whitespace().count();
            features[stats_start + 1] = (word_count as f32) / 100.0;
            
            // Average word length
            let avg_word_len = if word_count > 0 {
                text_len as f32 / word_count as f32
            } else {
                0.0
            };
            features[stats_start + 2] = avg_word_len / 20.0;
            
            // Punctuation density
            let punct_count = text.chars().filter(|c| c.is_ascii_punctuation()).count();
            features[stats_start + 3] = (punct_count as f32) / (text_len as f32 + 1.0);
            
            // Uppercase ratio
            let upper_count = text.chars().filter(|c| c.is_uppercase()).count();
            features[stats_start + 4] = (upper_count as f32) / (text_len as f32 + 1.0);
        }

        Ok(features)
    }

    /// Enhance memory text with metadata for richer embeddings
    fn enhance_text_with_metadata(&self, memory: &AgentMemory) -> String {
        let mut enhanced = memory.content.clone();
        
        // Add memory type context
        enhanced.push_str(&format!(" [TYPE:{}]", memory.memory_type));
        
        // Add relevant metadata
        for (key, value) in &memory.metadata {
            enhanced.push_str(&format!(" [{}:{}]", key, value));
        }
        
        // Add tags
        if !memory.tags.is_empty() {
            enhanced.push_str(&format!(" [TAGS:{}]", memory.tags.join(",")));
        }
        
        enhanced
    }

    /// Generate cache key for embeddings
    fn generate_cache_key(&self, text: &str, memory_type: &Option<MemoryType>) -> String {
        let mut hasher = Sha256::new();
        hasher.update(text.as_bytes());
        if let Some(ref mem_type) = memory_type {
            hasher.update(format!("{:?}", mem_type).as_bytes());
        }
        format!("{:x}", hasher.finalize())
    }

    /// Normalize embedding vector
    fn normalize_embedding(&self, embedding: &[f32]) -> Vec<f32> {
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm > 0.0 {
            embedding.iter().map(|x| x / norm).collect()
        } else {
            embedding.to_vec()
        }
    }

    /// Prepare training data from memories
    fn prepare_training_data(&self, memories: &[&AgentMemory]) -> Result<TrainingData> {
        let mut training_data = TrainingData::new();
        
        for memory in memories {
            let input_features = self.text_to_features(&self.enhance_text_with_metadata(memory))?;
            
            // Create target embedding based on memory similarity patterns
            // This is a simplified approach - in practice, you'd use more sophisticated targets
            let target_embedding = self.create_target_embedding(memory)?;
            
            training_data.add_example(input_features, target_embedding);
        }
        
        Ok(training_data)
    }

    /// Create target embedding for training
    fn create_target_embedding(&self, memory: &AgentMemory) -> Result<Vec<f32>> {
        let mut target = vec![0.0; self.config.embedding_dim];
        
        // Create semantic targets based on memory characteristics
        let content_hash = self.hash_text(&memory.content);
        let hash_bytes = hex::decode(&content_hash).map_err(|e| anyhow!("Hash decode error: {}", e))?;
        
        // Use hash to create deterministic but distributed target
        for (i, &byte) in hash_bytes.iter().enumerate() {
            if i < self.config.embedding_dim {
                target[i] = (byte as f32) / 255.0;
            }
        }
        
        // Add memory type bias
        let type_bias = match memory.memory_type {
            MemoryType::Conversation => 0.1,
            MemoryType::Task => 0.2,
            MemoryType::Learning => 0.3,
            MemoryType::Pattern => 0.4,
            MemoryType::Context => 0.5,
            MemoryType::Tool => 0.6,
            MemoryType::Error => 0.7,
            MemoryType::Success => 0.8,
        };
        
        if self.config.embedding_dim > 10 {
            target[self.config.embedding_dim - 1] = type_bias;
        }
        
        Ok(self.normalize_embedding(&target))
    }

    /// Train a neural network with training data (static version to avoid borrowing issues)
    async fn train_network_static(
        network: &mut NeuralNetwork, 
        training_data: &TrainingData, 
        epochs: usize,
        _learning_rate: f32
    ) -> Result<()> {
        if training_data.is_empty() {
            return Ok(());
        }

        let errors = network.train(
            &training_data.inputs,
            &training_data.outputs,
            epochs,
        )?;

        // Log training progress (in real implementation, use proper logging)
        let final_error = errors.last().unwrap_or(&f32::INFINITY);
        println!("Neural embedding training completed. Final error: {:.6}", final_error);

        Ok(())
    }

    /// Hash text for deterministic targets
    fn hash_text(&self, text: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(text.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EmbeddingStats {
    pub cache_size: usize,
    pub cache_limit: usize,
    pub embedding_dimension: usize,
    pub specialized_networks: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeuralEmbeddingResult {
    pub embedding: Vec<f32>,
    pub text: String,
    pub memory_type: Option<String>,
    pub similarity: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeuralEmbeddingSearchResult {
    pub text: String,
    pub similarity: f32,
    pub memory_type: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeuralEmbeddingRequest {
    pub text: String,
    pub memory_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeuralEmbeddingCandidate {
    pub text: String,
    pub embedding: Vec<f32>,
    pub memory_type: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[tokio::test]
    async fn test_neural_embedding_service() {
        let service = NeuralEmbeddingService::new(None).await.unwrap();
        
        let text = "This is a test memory about learning patterns";
        let embedding = service.embed_text(text, Some(MemoryType::Learning)).await.unwrap();
        
        assert_eq!(embedding.len(), 256); // Default embedding dimension
        
        // Test that the embedding is normalized
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_memory_type_specialization() {
        let service = NeuralEmbeddingService::new(None).await.unwrap();
        
        let text = "Complete the task successfully";
        let task_embedding = service.embed_text(text, Some(MemoryType::Task)).await.unwrap();
        let general_embedding = service.embed_text(text, None).await.unwrap();
        
        // Embeddings should be different due to network specialization
        let similarity = cosine_similarity(&task_embedding, &general_embedding);
        assert!(similarity < 1.0); // Should not be identical
    }

    #[tokio::test]
    async fn test_memory_embedding() {
        let service = NeuralEmbeddingService::new(None).await.unwrap();
        
        let memory = AgentMemory::new(
            "test_agent".to_string(),
            MemoryType::Learning,
            "This is a learning memory".to_string(),
        );
        
        let embedding = service.embed_memory(&memory).await.unwrap();
        assert_eq!(embedding.len(), 256);
    }

    #[test]
    fn test_text_to_features() {
        let config = EmbeddingConfig::default();
        let service = NeuralEmbeddingService {
            cache: Arc::new(RwLock::new(HashMap::new())),
            memory_networks: HashMap::new(),
            general_network: NetworkBuilder::new()
                .input_layer(10)
                .output_layer(5)
                .build()
                .unwrap(),
            config,
        };
        
        let features = service.text_to_features("Hello").unwrap();
        assert_eq!(features.len(), 512); // max_text_length
        assert!(features[0] > 0.0); // Should have some content from 'H'
    }
}