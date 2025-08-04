use anyhow::{Result, anyhow};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use sha2::{Sha256, Digest};

// Note: Old EmbeddingService and TransformerEmbeddingService have been removed
// and replaced with NeuralEmbeddingService in neural_embeddings.rs

// Utility functions for embedding operations
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

pub fn k_means_clustering(
    embeddings: &[Vec<f32>],
    k: usize,
    max_iterations: usize,
) -> Result<Vec<usize>> {
    if embeddings.is_empty() || k == 0 {
        return Ok(vec![]);
    }

    if k > embeddings.len() {
        return Err(anyhow!("k cannot be greater than the number of embeddings"));
    }

    let embedding_dim = embeddings[0].len();
    if !embeddings.iter().all(|emb| emb.len() == embedding_dim) {
        return Err(anyhow!("All embeddings must have the same dimension"));
    }

    // Initialize centroids randomly
    let mut centroids: Vec<Vec<f32>> = Vec::new();
    for i in 0..k {
        centroids.push(embeddings[i].clone());
    }

    let mut assignments: Vec<usize> = vec![0; embeddings.len()];
    let mut converged = false;
    let mut iteration = 0;

    while !converged && iteration < max_iterations {
        // Assign points to nearest centroid
        let mut new_assignments: Vec<usize> = Vec::new();
        for embedding in embeddings {
            let mut min_distance = f32::INFINITY;
            let mut nearest_centroid = 0;

            for (centroid_idx, centroid) in centroids.iter().enumerate() {
                let distance = euclidean_distance(embedding, centroid);
                if distance < min_distance {
                    min_distance = distance;
                    nearest_centroid = centroid_idx;
                }
            }

            new_assignments.push(nearest_centroid);
        }

        // Check for convergence
        converged = new_assignments == assignments;
        assignments = new_assignments;

        // Update centroids
        for centroid_idx in 0..k {
            let cluster_points: Vec<&Vec<f32>> = embeddings
                .iter()
                .enumerate()
                .filter(|(i, _)| assignments[*i] == centroid_idx)
                .map(|(_, emb)| emb)
                .collect();

            if !cluster_points.is_empty() {
                let mut new_centroid = vec![0.0; embedding_dim];
                let cluster_len = cluster_points.len() as f32;
                
                for point in &cluster_points {
                    for (i, &val) in point.iter().enumerate() {
                        new_centroid[i] += val;
                    }
                }

                for val in new_centroid.iter_mut() {
                    *val /= cluster_len;
                }

                centroids[centroid_idx] = new_centroid;
            }
        }

        iteration += 1;
    }

    Ok(assignments)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        assert_eq!(cosine_similarity(&a, &b), 1.0);

        let c = vec![0.0, 1.0, 0.0];
        assert_eq!(cosine_similarity(&a, &c), 0.0);

        let d = vec![0.5, 0.0, 0.0];
        assert_eq!(cosine_similarity(&a, &d), 1.0);
    }

    #[test]
    fn test_k_means_clustering() {
        let embeddings = vec![
            vec![1.0, 1.0],
            vec![2.0, 2.0],
            vec![10.0, 10.0],
            vec![11.0, 11.0],
        ];

        let clusters = k_means_clustering(&embeddings, 2, 100).unwrap();
        assert_eq!(clusters.len(), 4);

        // Should have 2 clusters
        let unique_clusters: std::collections::HashSet<usize> = clusters.iter().cloned().collect();
        assert_eq!(unique_clusters.len(), 2);
    }
}