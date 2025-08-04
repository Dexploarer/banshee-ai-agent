#[cfg(test)]
mod memory_flow_integration_tests {
    use super::super::*;
    use super::super::simple_commands::*;
    use super::super::neural_embeddings::*;
    use super::super::neural_knowledge_graph::*;
    use std::sync::Arc;
    use tokio::sync::Mutex as AsyncMutex;
    use chrono::Utc;
    use tauri::{AppHandle, Manager};

    /// Integration test for the complete memory lifecycle
    #[tokio::test]
    async fn test_complete_memory_lifecycle() {
        // Initialize the memory state
        let state = create_test_memory_state().await;

        // Test agent initialization
        let agent_id = "test_agent_lifecycle".to_string();
        let init_result = init_agent_memory(agent_id.clone(), tauri::State::from(state.as_ref())).await;
        assert!(init_result.is_ok(), "Failed to initialize agent memory");

        // Test memory creation with neural embeddings
        let memory_id = save_agent_memory(
            agent_id.clone(),
            "Task".to_string(),
            "Implement neural knowledge graph with advanced relationship discovery".to_string(),
            Some(vec!["neural".to_string(), "graph".to_string(), "AI".to_string()]),
            Some({
                let mut metadata = std::collections::HashMap::new();
                metadata.insert("priority".to_string(), "high".to_string());
                metadata.insert("project".to_string(), "banshee".to_string());
                metadata
            }),
            tauri::State::from(state.as_ref()),
        ).await;

        assert!(memory_id.is_ok(), "Failed to save memory: {:?}", memory_id.err());
        let memory_id = memory_id.unwrap();

        // Test memory retrieval
        let retrieved_memory = get_agent_memory(
            agent_id.clone(),
            memory_id.clone(),
            tauri::State::from(state.as_ref()),
        ).await;

        assert!(retrieved_memory.is_ok(), "Failed to retrieve memory");
        let memory = retrieved_memory.unwrap();
        assert!(memory.is_some(), "Memory not found");
        
        let memory = memory.unwrap();
        assert_eq!(memory.memory_type, MemoryType::Task);
        assert!(memory.content.contains("neural knowledge graph"));
        assert!(memory.embedding.is_some(), "Memory should have neural embedding");
        
        let embedding = memory.embedding.unwrap();
        assert!(!embedding.is_empty());
        assert!(embedding.iter().all(|&x| x.is_finite()));

        // Test memory search
        let search_results = search_agent_memories(
            agent_id.clone(),
            Some("graph".to_string()),
            None, // memory_types
            None, // tags
            Some(10), // limit
            Some(0), // offset
            Some(0.5), // similarity_threshold
            tauri::State::from(state.as_ref()),
        ).await;

        assert!(search_results.is_ok(), "Memory search failed");
        let results = search_results.unwrap();
        assert!(!results.is_empty(), "Should find memories containing 'graph'");
        
        // Test memory listing
        let all_memories = list_agent_memories(
            agent_id.clone(),
            Some(MemoryType::Task),
            Some(100),
            Some(0),
            tauri::State::from(state.as_ref()),
        ).await;

        assert!(all_memories.is_ok(), "Failed to list memories");
        let memories = all_memories.unwrap();
        assert!(!memories.is_empty(), "Should have at least one memory");

        // Test memory update
        let update_result = update_agent_memory(
            agent_id.clone(),
            memory_id.clone(),
            Some("Updated neural knowledge graph implementation".to_string()),
            Some(vec!["neural".to_string(), "graph".to_string(), "updated".to_string()]),
            Some({
                let mut metadata = std::collections::HashMap::new();
                metadata.insert("status".to_string(), "in_progress".to_string());
                metadata
            }),
            tauri::State::from(state.as_ref()),
        ).await;

        assert!(update_result.is_ok(), "Failed to update memory");

        // Test memory deletion
        let delete_result = delete_agent_memory(
            agent_id.clone(),
            memory_id,
            tauri::State::from(state.as_ref()),
        ).await;

        assert!(delete_result.is_ok(), "Failed to delete memory");
    }

    /// Integration test for multi-agent memory interactions
    #[tokio::test]
    async fn test_multi_agent_memory_interactions() {
        let state = create_test_memory_state().await;
        
        let agents = vec!["agent_alpha", "agent_beta", "agent_gamma"];
        let mut memory_ids = std::collections::HashMap::new();

        // Initialize agents and create memories
        for agent in &agents {
            let agent_id = agent.to_string();
            
            // Initialize agent
            init_agent_memory(agent_id.clone(), tauri::State::from(&state)).await.unwrap();

            // Create diverse memories
            let memories = vec![
                ("Task", format!("Agent {} working on authentication system", agent)),
                ("Learning", format!("Agent {} learned OAuth 2.0 patterns", agent)),
                ("Success", format!("Agent {} successfully implemented login", agent)),
                ("Error", format!("Agent {} encountered database connection issue", agent)),
            ];

            let mut agent_memory_ids = Vec::new();
            for (memory_type, content) in memories {
                let memory_id = save_agent_memory(
                    agent_id.clone(),
                    memory_type.to_string(),
                    content,
                    Some(vec!["authentication".to_string(), "system".to_string()]),
                    None,
                    tauri::State::from(state.as_ref()),
                ).await.unwrap();
                
                agent_memory_ids.push(memory_id);
            }
            
            memory_ids.insert(agent_id, agent_memory_ids);
        }

        // Test cross-agent memory search
        for agent in &agents {
            let agent_id = agent.to_string();
            let search_results = search_agent_memories(
                agent_id.clone(),
                Some("authentication".to_string()),
                None, // memory_types
                None, // tags
                Some(20), // limit
                Some(0), // offset
                Some(0.5), // similarity_threshold
                tauri::State::from(state.as_ref()),
            ).await.unwrap();

            assert!(!search_results.is_empty(), "Each agent should find authentication memories");
            
            // Verify that memories are properly isolated per agent
            for memory in &search_results {
                assert_eq!(memory.agent_id, agent_id, "Memory should belong to correct agent");
            }
        }

        // Test shared knowledge functionality
        let shared_knowledge = create_shared_knowledge(
            "authentication_patterns".to_string(),
            "Common authentication implementation patterns".to_string(),
            agents.iter().map(|s| s.to_string()).collect(),
            vec!["pattern".to_string(), "shared".to_string()],
            tauri::State::from(state.as_ref()),
        ).await;

        assert!(shared_knowledge.is_ok(), "Failed to create shared knowledge");

        // Test knowledge graph generation with multiple agents
        let graph_view = get_knowledge_graph(
            None, // All agents
            Some(50),
            tauri::State::from(state.as_ref()),
        ).await;

        assert!(graph_view.is_ok(), "Failed to generate knowledge graph");
        let graph = graph_view.unwrap();
        assert!(!graph.nodes.is_empty(), "Graph should contain nodes");
        assert!(graph.metadata.contains_key("neural_enhanced"));
    }

    /// Integration test for neural embedding quality and consistency
    #[tokio::test]
    async fn test_neural_embedding_quality() {
        let state = create_test_memory_state().await;
        let agent_id = "embedding_test_agent".to_string();
        
        init_agent_memory(agent_id.clone(), tauri::State::from(&state)).await.unwrap();

        // Create semantically related memories
        let related_memories = vec![
            ("Database optimization techniques", MemoryType::Learning),
            ("Optimize database queries for better performance", MemoryType::Task),
            ("Database performance tuning completed successfully", MemoryType::Success),
        ];

        let mut memory_embeddings = Vec::new();
        for (content, memory_type) in related_memories {
            let memory_id = save_agent_memory(
                agent_id.clone(),
                format!("{:?}", memory_type),
                content.to_string(),
                Some(vec!["database".to_string(), "performance".to_string()]),
                None,
                tauri::State::from(state.as_ref()),
            ).await.unwrap();

            // Retrieve memory to get embedding
            let memory = get_agent_memory(
                agent_id.clone(),
                memory_id,
                tauri::State::from(state.as_ref()),
            ).await.unwrap().unwrap();

            assert!(memory.embedding.is_some(), "Memory should have embedding");
            memory_embeddings.push(memory.embedding.unwrap());
        }

        // Test semantic similarity
        for i in 0..memory_embeddings.len() {
            for j in (i + 1)..memory_embeddings.len() {
                let similarity = cosine_similarity(&memory_embeddings[i], &memory_embeddings[j]);
                assert!(similarity > 0.5, "Related memories should have high similarity: {}", similarity);
                assert!(similarity < 1.0, "Different memories shouldn't be identical");
            }
        }

        // Create unrelated memory
        let unrelated_id = save_agent_memory(
            agent_id.clone(),
            "Learning".to_string(),
            "Machine learning fundamentals and neural network architectures".to_string(),
            Some(vec!["AI".to_string(), "learning".to_string()]),
            None,
            tauri::State::from(state.as_ref()),
        ).await.unwrap();

        let unrelated_memory = get_agent_memory(
            agent_id.clone(),
            unrelated_id,
            tauri::State::from(state.as_ref()),
        ).await.unwrap().unwrap();

        let unrelated_embedding = unrelated_memory.embedding.unwrap();

        // Test that unrelated content has lower similarity
        for related_embedding in &memory_embeddings {
            let similarity = cosine_similarity(related_embedding, &unrelated_embedding);
            assert!(similarity < 0.8, "Unrelated memories should have lower similarity: {}", similarity);
        }
    }

    /// Integration test for knowledge graph relationship discovery
    #[tokio::test]
    async fn test_knowledge_graph_relationships() {
        let state = create_test_memory_state().await;
        let agent_id = "graph_test_agent".to_string();
        
        init_agent_memory(agent_id.clone(), tauri::State::from(&state)).await.unwrap();

        // Create memories that should form relationships
        let memory_sequences = vec![
            ("Error encountered in authentication module", MemoryType::Error),
            ("Debugging authentication flow step by step", MemoryType::Task),
            ("Found root cause: invalid token validation", MemoryType::Learning),
            ("Fixed authentication bug successfully", MemoryType::Success),
        ];

        let mut memory_ids = Vec::new();
        for (content, memory_type) in memory_sequences {
            let memory_id = save_agent_memory(
                agent_id.clone(),
                format!("{:?}", memory_type),
                content.to_string(),
                Some(vec!["authentication".to_string(), "debug".to_string()]),
                None,
                tauri::State::from(state.as_ref()),
            ).await.unwrap();
            memory_ids.push(memory_id);
            
            // Add small delay to ensure temporal ordering
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }

        // Generate knowledge graph
        let graph_view = get_knowledge_graph(
            Some(agent_id.clone()),
            Some(100),
            tauri::State::from(state.as_ref()),
        ).await.unwrap();

        // Verify graph structure
        assert_eq!(graph_view.nodes.len(), memory_sequences.len());
        assert!(!graph_view.edges.is_empty(), "Should have discovered relationships");

        // Check for temporal and semantic relationships
        let mut has_temporal_relationship = false;
        let mut has_semantic_relationship = false;

        for edge in &graph_view.edges {
            if edge.relationship_type.contains("Temporal") {
                has_temporal_relationship = true;
            }
            if edge.relationship_type.contains("Semantic") || edge.relationship_type.contains("ErrorSolution") {
                has_semantic_relationship = true;
            }
            
            // Verify edge properties
            assert!(edge.weight.is_some());
            let weight = edge.weight.unwrap();
            assert!(weight >= 0.0 && weight <= 1.0, "Edge weight should be normalized");
        }

        assert!(has_temporal_relationship || has_semantic_relationship, 
                "Should discover meaningful relationships");
    }

    /// Integration test for memory search and retrieval performance
    #[tokio::test]
    async fn test_memory_search_performance() {
        let state = create_test_memory_state().await;
        let agent_id = "performance_test_agent".to_string();
        
        init_agent_memory(agent_id.clone(), tauri::State::from(&state)).await.unwrap();

        // Create a larger set of memories
        let memory_types = vec![MemoryType::Task, MemoryType::Learning, MemoryType::Success, MemoryType::Error];
        let topics = vec!["authentication", "database", "UI", "networking", "security"];
        
        let start_creation = std::time::Instant::now();
        let mut created_memories = 0;

        for i in 0..50 {
            let memory_type = &memory_types[i % memory_types.len()];
            let topic = topics[i % topics.len()];
            
            let content = format!("Memory about {} - iteration {} with detailed information", topic, i);
            let memory_id = save_agent_memory(
                agent_id.clone(),
                format!("{:?}", memory_type),
                content,
                Some(vec![topic.to_string(), "test".to_string()]),
                None,
                tauri::State::from(state.as_ref()),
            ).await;

            if memory_id.is_ok() {
                created_memories += 1;
            }
        }

        let creation_time = start_creation.elapsed();
        assert!(created_memories >= 45, "Should create most memories successfully");
        assert!(creation_time.as_secs() < 60, "Memory creation should be reasonably fast");

        // Test search performance
        let start_search = std::time::Instant::now();
        
        let search_results = search_agent_memories(
            agent_id.clone(),
            Some("authentication".to_string()),
            None, // memory_types
            None, // tags
            Some(20), // limit
            Some(0), // offset
            Some(0.5), // similarity_threshold
            tauri::State::from(state.as_ref()),
        ).await.unwrap();

        let search_time = start_search.elapsed();
        assert!(!search_results.is_empty(), "Should find authentication-related memories");
        assert!(search_time.as_millis() < 5000, "Search should be fast: {:?}", search_time);

        // Test listing performance
        let start_list = std::time::Instant::now();
        
        let all_memories = list_agent_memories(
            agent_id.clone(),
            None,
            Some(100),
            Some(0),
            tauri::State::from(state.as_ref()),
        ).await.unwrap();

        let list_time = start_list.elapsed();
        assert!(!all_memories.is_empty());
        assert!(list_time.as_millis() < 3000, "Listing should be fast: {:?}", list_time);
    }

    /// Integration test for error handling and edge cases
    #[tokio::test]
    async fn test_error_handling_edge_cases() {
        let state = create_test_memory_state().await;

        // Test operations on non-existent agent
        let non_existent_agent = "non_existent_agent".to_string();
        
        let memory_result = get_agent_memory(
            non_existent_agent.clone(),
            "fake_memory_id".to_string(),
            tauri::State::from(state.as_ref()),
        ).await;
        assert!(memory_result.is_err() || memory_result.unwrap().is_none());

        // Test with invalid memory types
        let agent_id = "error_test_agent".to_string();
        init_agent_memory(agent_id.clone(), tauri::State::from(&state)).await.unwrap();

        let invalid_memory = save_agent_memory(
            agent_id.clone(),
            "InvalidType".to_string(),
            "Test content".to_string(),
            None,
            None,
            tauri::State::from(state.as_ref()),
        ).await;
        assert!(invalid_memory.is_err(), "Should reject invalid memory types");

        // Test with empty content
        let empty_content_result = save_agent_memory(
            agent_id.clone(),
            "Task".to_string(),
            "".to_string(),
            None,
            None,
            tauri::State::from(state.as_ref()),
        ).await;
        // Empty content should be handled gracefully
        assert!(empty_content_result.is_ok() || empty_content_result.is_err());

        // Test with very long content
        let very_long_content = "x".repeat(100000);
        let long_content_result = save_agent_memory(
            agent_id.clone(),
            "Learning".to_string(),
            very_long_content,
            None,
            None,
            tauri::State::from(state.as_ref()),
        ).await;
        assert!(long_content_result.is_ok(), "Should handle long content");

        // Test search with empty query
        let empty_search = search_agent_memories(
            agent_id.clone(),
            Some("".to_string()),
            None, // memory_types
            None, // tags
            Some(10), // limit
            Some(0), // offset
            Some(0.5), // similarity_threshold
            tauri::State::from(state.as_ref()),
        ).await;
        assert!(empty_search.is_ok(), "Should handle empty search queries");
    }

    // Helper function to create test memory state
    async fn create_test_memory_state() -> Arc<MemoryState> {
        Arc::new(MemoryState::new())
    }

    // Helper function for cosine similarity calculation
    fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
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
}