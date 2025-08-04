use anyhow::{Result, anyhow};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use sha2::{Sha256, Digest};

pub struct EmbeddingService {
    cache: Arc<RwLock<HashMap<String, Vec<f32>>>>,
    max_sequence_length: usize,
}

impl EmbeddingService {
    pub fn new() -> Result<Self> {
        Ok(Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            max_sequence_length: 512,
        })
    }

    pub async fn initialize(&self) -> Result<()> {
        // In a real implementation, you would load a pre-trained model
        // For now, we'll implement a simple embedding service
        // that can be replaced with actual transformer models
        
        // Initialize with a simple tokenizer (placeholder)
        // In production, you'd load something like:
        // - sentence-transformers/all-MiniLM-L6-v2
        // - sentence-transformers/all-mpnet-base-v2
        
        println!("Embedding service initialized (using simple implementation)");
        Ok(())
    }

    pub async fn embed_text(&self, text: &str) -> Result<Vec<f32>> {
        // Check cache first
        let cache_key = self.hash_text(text);
        
        {
            let cache = self.cache.read().await;
            if let Some(cached_embedding) = cache.get(&cache_key) {
                return Ok(cached_embedding.clone());
            }
        }

        // Generate embedding (simplified implementation)
        let embedding = self.generate_simple_embedding(text).await?;

        // Cache the result
        {
            let mut cache = self.cache.write().await;
            cache.insert(cache_key, embedding.clone());
        }

        Ok(embedding)
    }

    pub async fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        let mut embeddings = Vec::new();
        
        for text in texts {
            let embedding = self.embed_text(text).await?;
            embeddings.push(embedding);
        }

        Ok(embeddings)
    }

    // Simple embedding implementation using text features
    // In production, replace this with actual transformer model inference
    async fn generate_simple_embedding(&self, text: &str) -> Result<Vec<f32>> {
        const EMBEDDING_DIM: usize = 384; // Common dimension for sentence transformers
        
        let mut embedding = vec![0.0; EMBEDDING_DIM];
        
        // Simple feature extraction based on text characteristics
        let words: Vec<&str> = text.split_whitespace().collect();
        let word_count = words.len() as f32;
        let char_count = text.len() as f32;
        
        // Feature 1: Text length normalized
        embedding[0] = (word_count / 100.0).min(1.0);
        embedding[1] = (char_count / 1000.0).min(1.0);
        
        // Feature 2: Word frequency features (simplified to avoid lifetime issues)
        let word_count_feature = words.len() as f32 / 50.0; // Normalize by expected average
        if embedding.len() > 10 {
            embedding[10] = word_count_feature.min(1.0);
        }
        
        // Feature 3: Character n-gram features
        let mut char_features = vec![0.0; 256];
        for (i, ch) in text.chars().enumerate() {
            if i < 256 {
                char_features[i] = (ch as u32 as f32) / 1000.0;
            }
        }
        
        // Copy char features to embedding (first 256 dimensions after basic features)
        for (i, &val) in char_features.iter().enumerate() {
            if i + 2 < EMBEDDING_DIM {
                embedding[i + 2] = val;
            }
        }
        
        // Feature 4: Simple semantic features based on common patterns
        let semantic_keywords = [
            "error", "success", "learn", "task", "complete", "fail",
            "memory", "knowledge", "pattern", "relationship", "context"
        ];
        
        for (i, keyword) in semantic_keywords.iter().enumerate() {
            if text.to_lowercase().contains(keyword) {
                if i + 258 < EMBEDDING_DIM {
                    embedding[i + 258] = 1.0;
                }
            }
        }
        
        // Normalize the embedding vector
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm > 0.0 {
            for val in embedding.iter_mut() {
                *val /= norm;
            }
        }

        Ok(embedding)
    }

    fn hash_text(&self, text: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(text.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub async fn compute_similarity(&self, embedding1: &[f32], embedding2: &[f32]) -> f32 {
        cosine_similarity(embedding1, embedding2)
    }

    pub async fn find_similar_embeddings(
        &self,
        query_embedding: &[f32],
        candidate_embeddings: &[(String, Vec<f32>)],
        threshold: f32,
        top_k: usize,
    ) -> Vec<(String, f32)> {
        let mut similarities: Vec<(String, f32)> = candidate_embeddings
            .iter()
            .map(|(id, embedding)| {
                let similarity = cosine_similarity(query_embedding, embedding);
                (id.clone(), similarity)
            })
            .filter(|(_, similarity)| *similarity >= threshold)
            .collect();

        // Sort by similarity (descending)
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Take top k results
        similarities.truncate(top_k);
        similarities
    }

    pub async fn clear_cache(&self) {
        let mut cache = self.cache.write().await;
        cache.clear();
    }

    pub async fn get_cache_size(&self) -> usize {
        let cache = self.cache.read().await;
        cache.len()
    }
}

// Advanced embedding service that could be used with actual transformer models
pub struct TransformerEmbeddingService {
    model_name: String,
    embedding_service: EmbeddingService,
}

impl TransformerEmbeddingService {
    pub fn new(model_name: String) -> Result<Self> {
        Ok(Self {
            model_name,
            embedding_service: EmbeddingService::new()?,
        })
    }

    pub async fn initialize(&self) -> Result<()> {
        // In a real implementation, download and load the specified model
        // For example: sentence-transformers/all-MiniLM-L6-v2
        println!("Initializing transformer model: {}", self.model_name);
        self.embedding_service.initialize().await
    }

    pub async fn embed_text(&self, text: &str) -> Result<Vec<f32>> {
        // Preprocess text for the specific model
        let processed_text = self.preprocess_text(text);
        self.embedding_service.embed_text(&processed_text).await
    }

    fn preprocess_text(&self, text: &str) -> String {
        // Model-specific preprocessing
        match self.model_name.as_str() {
            "sentence-transformers/all-MiniLM-L6-v2" => {
                // Add special tokens or preprocessing as needed
                text.trim().to_string()
            }
            "sentence-transformers/all-mpnet-base-v2" => {
                // Different preprocessing for mpnet
                text.trim().to_string()
            }
            _ => text.to_string(),
        }
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

pub fn euclidean_distance(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return f32::INFINITY;
    }

    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).powi(2))
        .sum::<f32>()
        .sqrt()
}

pub fn manhattan_distance(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return f32::INFINITY;
    }

    a.iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y).abs())
        .sum()
}

// Embedding clustering utilities
pub fn k_means_clustering(
    embeddings: &[Vec<f32>],
    k: usize,
    max_iterations: usize,
) -> Result<Vec<usize>> {
    if embeddings.is_empty() || k == 0 {
        return Err(anyhow!("Invalid input for clustering"));
    }

    let n = embeddings.len();
    let dim = embeddings[0].len();
    
    // Initialize centroids randomly
    let mut centroids = Vec::new();
    for _ in 0..k {
        let mut centroid = vec![0.0; dim];
        for j in 0..dim {
            centroid[j] = rand::random::<f32>() * 2.0 - 1.0; // Random between -1 and 1
        }
        centroids.push(centroid);
    }

    let mut assignments = vec![0; n];
    
    for _iteration in 0..max_iterations {
        let mut changed = false;

        // Assign points to closest centroids
        for (i, embedding) in embeddings.iter().enumerate() {
            let mut best_cluster = 0;
            let mut best_distance = euclidean_distance(embedding, &centroids[0]);

            for (j, centroid) in centroids.iter().enumerate().skip(1) {
                let distance = euclidean_distance(embedding, centroid);
                if distance < best_distance {
                    best_distance = distance;
                    best_cluster = j;
                }
            }

            if assignments[i] != best_cluster {
                assignments[i] = best_cluster;
                changed = true;
            }
        }

        if !changed {
            break;
        }

        // Update centroids
        let mut cluster_counts = vec![0; k];
        for centroid in centroids.iter_mut() {
            centroid.fill(0.0);
        }

        for (i, embedding) in embeddings.iter().enumerate() {
            let cluster = assignments[i];
            cluster_counts[cluster] += 1;
            for (j, &val) in embedding.iter().enumerate() {
                centroids[cluster][j] += val;
            }
        }

        for (cluster, centroid) in centroids.iter_mut().enumerate() {
            if cluster_counts[cluster] > 0 {
                for val in centroid.iter_mut() {
                    *val /= cluster_counts[cluster] as f32;
                }
            }
        }
    }

    Ok(assignments)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_embedding_service() {
        let service = EmbeddingService::new().unwrap();
        service.initialize().await.unwrap();

        let text = "This is a test memory about learning patterns";
        let embedding = service.embed_text(text).await.unwrap();
        
        assert_eq!(embedding.len(), 384);
        
        // Test that the embedding is normalized
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 2.0, 3.0];
        let b = vec![1.0, 2.0, 3.0];
        let similarity = cosine_similarity(&a, &b);
        assert!((similarity - 1.0).abs() < 0.01);

        let c = vec![-1.0, -2.0, -3.0];
        let similarity2 = cosine_similarity(&a, &c);
        assert!((similarity2 + 1.0).abs() < 0.01);
    }

    #[test]
    fn test_k_means_clustering() {
        let embeddings = vec![
            vec![1.0, 1.0],
            vec![1.1, 1.1],
            vec![5.0, 5.0],
            vec![5.1, 5.1],
        ];
        
        let assignments = k_means_clustering(&embeddings, 2, 100).unwrap();
        assert_eq!(assignments.len(), 4);
        
        // Points should be clustered correctly
        assert_eq!(assignments[0], assignments[1]);
        assert_eq!(assignments[2], assignments[3]);
        assert_ne!(assignments[0], assignments[2]);
    }
}