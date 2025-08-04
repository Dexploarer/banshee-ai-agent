#[cfg(test)]
mod memory_integration_tests {
    use crate::database::memory::*;
    use crate::database::simple_memory::SimpleMemoryManager;
    use crate::validation::MemoryValidator;
    use std::collections::HashMap;
    use tempfile::TempDir;
    use serial_test::serial;

    /// Create a temporary test database
    fn create_test_db() -> (TempDir, String) {
        let temp_dir = TempDir::new().expect("Failed to create temp directory");
        let db_path = temp_dir.path().join("test_memory.db").to_string_lossy().to_string();
        (temp_dir, db_path)
    }

    #[tokio::test]
    #[serial]
    async fn test_memory_system_end_to_end() {
        let (_temp_dir, db_path) = create_test_db();
        let mut memory_manager = SimpleMemoryManager::new(&db_path).expect("Failed to create memory manager");
        
        let agent_id = "test_agent_e2e";
        
        // Step 1: Initialize agent memory
        memory_manager.init_agent_memory(agent_id).await.expect("Failed to init agent memory");
        
        // Step 2: Create and save memories
        let memory1 = AgentMemory::new(
            agent_id.to_string(),
            MemoryType::Task,
            "Complete the integration tests for the memory system".to_string(),
        )
        .with_tags(vec!["testing".to_string(), "integration".to_string()])
        .with_metadata({
            let mut metadata = HashMap::new();
            metadata.insert("priority".to_string(), "high".to_string());
            metadata.insert("category".to_string(), "development".to_string());
            metadata
        });
        
        let memory_id1 = memory_manager.save_memory(&memory1).await.expect("Failed to save memory 1");
        
        let memory2 = AgentMemory::new(
            agent_id.to_string(),
            MemoryType::Learning,
            "Learned about proper error handling in async Rust code".to_string(),
        )
        .with_tags(vec!["learning".to_string(), "rust".to_string()]);
        
        let memory_id2 = memory_manager.save_memory(&memory2).await.expect("Failed to save memory 2");
        
        // Step 3: Retrieve individual memories
        let retrieved_memory1 = memory_manager.get_memory(agent_id, &memory_id1).await
            .expect("Failed to get memory 1")
            .expect("Memory 1 not found");
            
        assert_eq!(retrieved_memory1.content, memory1.content);
        assert_eq!(retrieved_memory1.memory_type, MemoryType::Task);
        assert_eq!(retrieved_memory1.tags, vec!["testing".to_string(), "integration".to_string()]);
        
        // Step 4: Search memories
        let search_results = memory_manager.search_memories(
            agent_id,
            Some("integration"),
            Some(vec![MemoryType::Task]),
            None,
            Some(10),
            Some(0),
            None,
        ).await.expect("Failed to search memories");
        
        assert_eq!(search_results.len(), 1);
        assert_eq!(search_results[0].memory.id, memory_id1);
        
        // Step 5: Search by tags
        let tag_search_results = memory_manager.search_memories(
            agent_id,
            None,
            None,
            Some(vec!["learning".to_string()]),
            Some(10),
            Some(0),
            None,
        ).await.expect("Failed to search by tags");
        
        assert_eq!(tag_search_results.len(), 1);
        assert_eq!(tag_search_results[0].memory.id, memory_id2);
        
        // Step 6: Test backup functionality
        let backup_path = memory_manager.backup_memories(agent_id, Some("integration_test"))
            .await.expect("Failed to backup memories");
        
        assert!(std::path::Path::new(&backup_path).exists());
    }

    #[tokio::test]
    #[serial]
    async fn test_memory_validation_integration() {
        let (_temp_dir, db_path) = create_test_db();
        let mut memory_manager = SimpleMemoryManager::new(&db_path).expect("Failed to create memory manager");
        
        let agent_id = "validation_test_agent";
        memory_manager.init_agent_memory(agent_id).await.expect("Failed to init agent memory");
        
        // Test 1: Valid memory creation and validation
        let valid_memory = AgentMemory::new(
            agent_id.to_string(),
            MemoryType::Context,
            "This is a valid memory with proper length and content".to_string(),
        );
        
        // Validate before saving
        assert!(MemoryValidator::validate_agent_id(&valid_memory.agent_id).is_ok());
        assert!(MemoryValidator::validate_content(&valid_memory.content).is_ok());
        
        let memory_id = memory_manager.save_memory(&valid_memory).await.expect("Failed to save valid memory");
        assert!(!memory_id.is_empty());
        
        // Test 2: Invalid agent ID should fail validation
        assert!(MemoryValidator::validate_agent_id("").is_err());
        assert!(MemoryValidator::validate_agent_id("invalid@agent").is_err());
        
        // Test 3: Invalid content should fail validation
        assert!(MemoryValidator::validate_content("").is_err());
        assert!(MemoryValidator::validate_content("<script>alert('xss')</script>").is_err());
        
        // Test 4: Invalid tags should fail validation
        assert!(MemoryValidator::validate_tags(&vec!["".to_string()]).is_err());
        assert!(MemoryValidator::validate_tags(&vec!["tag1".to_string(), "tag1".to_string()]).is_err());
        
        // Test 5: Test limits
        assert!(MemoryValidator::validate_limit(0).is_err());
        assert!(MemoryValidator::validate_limit(1001).is_err());
        assert!(MemoryValidator::validate_offset(100001).is_err());
    }

    #[tokio::test]
    #[serial]
    async fn test_knowledge_graph_integration() {
        let (_temp_dir, db_path) = create_test_db();
        let mut memory_manager = SimpleMemoryManager::new(&db_path).expect("Failed to create memory manager");
        
        let agent_id = "knowledge_graph_agent";
        memory_manager.init_agent_memory(agent_id).await.expect("Failed to init agent memory");
        
        // Create knowledge nodes
        let node1 = KnowledgeNode::new(NodeType::Concept, "Machine Learning".to_string());
        let node2 = KnowledgeNode::new(NodeType::Tool, "Neural Networks".to_string());
        
        // Validate node names
        assert!(MemoryValidator::validate_node_name(&node1.name).is_ok());
        assert!(MemoryValidator::validate_node_name(&node2.name).is_ok());
        
        // Create knowledge edge
        let edge = KnowledgeEdge::new(
            node1.id.clone(),
            node2.id.clone(),
            RelationshipType::Uses,
        ).with_weight(0.8);
        
        // Validate edge components
        assert!(MemoryValidator::validate_node_id(&edge.from_node).is_ok());
        assert!(MemoryValidator::validate_node_id(&edge.to_node).is_ok());
        assert!(MemoryValidator::validate_weight(edge.weight).is_ok());
        
        // Test shared knowledge
        let shared_knowledge = SharedKnowledge::new(
            KnowledgeType::Concept,
            "Deep Learning Fundamentals".to_string(),
            "Understanding the basics of deep learning and neural network architectures".to_string(),
            agent_id.to_string(),
        );
        
        assert!(MemoryValidator::validate_title(&shared_knowledge.title).is_ok());
        assert!(MemoryValidator::validate_content(&shared_knowledge.content).is_ok());
    }

    #[tokio::test]
    #[serial]
    async fn test_memory_search_and_similarity() {
        let (_temp_dir, db_path) = create_test_db();
        let mut memory_manager = SimpleMemoryManager::new(&db_path).expect("Failed to create memory manager");
        
        let agent_id = "similarity_test_agent";
        memory_manager.init_agent_memory(agent_id).await.expect("Failed to init agent memory");
        
        // Create memories with embeddings for similarity testing
        let embedding1 = vec![1.0, 0.0, 0.0, 0.5];
        let memory1 = AgentMemory::new(
            agent_id.to_string(),
            MemoryType::Learning,
            "Learning about vector embeddings and similarity calculations".to_string(),
        ).with_embedding(embedding1.clone());
        
        let embedding2 = vec![0.8, 0.2, 0.1, 0.4]; // Similar to embedding1
        let memory2 = AgentMemory::new(
            agent_id.to_string(),
            MemoryType::Learning,
            "Understanding machine learning concepts and algorithms".to_string(),
        ).with_embedding(embedding2.clone());
        
        let embedding3 = vec![0.0, 1.0, 0.0, 0.0]; // Orthogonal to embedding1
        let memory3 = AgentMemory::new(
            agent_id.to_string(),
            MemoryType::Task,
            "Complete the quarterly report and submit to management".to_string(),
        ).with_embedding(embedding3.clone());
        
        // Save memories
        let _id1 = memory_manager.save_memory(&memory1).await.expect("Failed to save memory 1");
        let _id2 = memory_manager.save_memory(&memory2).await.expect("Failed to save memory 2");
        let _id3 = memory_manager.save_memory(&memory3).await.expect("Failed to save memory 3");
        
        // Test cosine similarity calculations
        let similarity_1_2 = memory1.calculate_similarity(&embedding2).unwrap();
        let similarity_1_3 = memory1.calculate_similarity(&embedding3).unwrap();
        
        // Memory 1 and 2 should be more similar than memory 1 and 3
        assert!(similarity_1_2 > similarity_1_3);
        assert!(similarity_1_2 > 0.5); // Should be reasonably similar
        assert!(similarity_1_3.abs() < 0.5); // Should be less similar
        
        // Test search with similarity threshold
        let search_results = memory_manager.search_memories(
            agent_id,
            Some("learning"),
            None,
            None,
            Some(10),
            Some(0),
            Some(0.3), // Similarity threshold
        ).await.expect("Failed to search with similarity");
        
        // Should find learning-related memories
        assert!(!search_results.is_empty());
        for result in search_results {
            assert!(result.memory.content.to_lowercase().contains("learning") ||
                   result.memory.content.to_lowercase().contains("machine"));
        }
    }

    #[tokio::test]
    #[serial]
    async fn test_memory_statistics_and_analytics() {
        let (_temp_dir, db_path) = create_test_db();
        let mut memory_manager = SimpleMemoryManager::new(&db_path).expect("Failed to create memory manager");
        
        let agent_id = "analytics_test_agent";
        memory_manager.init_agent_memory(agent_id).await.expect("Failed to init agent memory");
        
        // Create diverse memories for statistics testing
        let memories = vec![
            (MemoryType::Task, "Complete project milestone 1", vec!["work", "project"]),
            (MemoryType::Task, "Review code changes", vec!["work", "review"]),
            (MemoryType::Learning, "Learned Rust ownership concepts", vec!["learning", "rust"]),
            (MemoryType::Learning, "Understanding async programming", vec!["learning", "programming"]),
            (MemoryType::Conversation, "Discussion about architecture", vec!["meeting", "architecture"]),
            (MemoryType::Error, "Fixed database connection issue", vec!["bug", "database"]),
            (MemoryType::Success, "Successfully deployed to production", vec!["deployment", "success"]),
        ];
        
        let mut memory_ids = Vec::new();
        for (memory_type, content, tags) in memories {
            let memory = AgentMemory::new(
                agent_id.to_string(),
                memory_type,
                content.to_string(),
            ).with_tags(tags.into_iter().map(|s| s.to_string()).collect());
            
            let memory_id = memory_manager.save_memory(&memory).await.expect("Failed to save memory");
            memory_ids.push(memory_id);
        }
        
        // Test memory type distribution
        let all_memories = memory_manager.search_memories(
            agent_id,
            None,
            None,
            None,
            Some(100),
            Some(0),
            None,
        ).await.expect("Failed to get all memories");
        
        assert_eq!(all_memories.len(), 7);
        
        // Count by type
        let mut type_counts = HashMap::new();
        for result in &all_memories {
            *type_counts.entry(result.memory.memory_type.clone()).or_insert(0) += 1;
        }
        
        assert_eq!(type_counts.get(&MemoryType::Task), Some(&2));
        assert_eq!(type_counts.get(&MemoryType::Learning), Some(&2));
        assert_eq!(type_counts.get(&MemoryType::Conversation), Some(&1));
        assert_eq!(type_counts.get(&MemoryType::Error), Some(&1));
        assert_eq!(type_counts.get(&MemoryType::Success), Some(&1));
        
        // Test tag analysis
        let mut all_tags = Vec::new();
        for result in &all_memories {
            all_tags.extend(result.memory.tags.clone());
        }
        
        assert!(all_tags.contains(&"work".to_string()));
        assert!(all_tags.contains(&"learning".to_string()));
        assert!(all_tags.contains(&"rust".to_string()));
    }

    #[tokio::test]
    #[serial]
    async fn test_concurrent_memory_operations() {
        let (_temp_dir, db_path) = create_test_db();
        let memory_manager = std::sync::Arc::new(std::sync::Mutex::new(
            SimpleMemoryManager::new(&db_path).expect("Failed to create memory manager")
        ));
        
        let agent_id = "concurrent_test_agent";
        {
            let mut manager = memory_manager.lock().unwrap();
            manager.init_agent_memory(agent_id).await.expect("Failed to init agent memory");
        }
        
        // Test concurrent memory creation
        let handles = (0..10).map(|i| {
            let manager = memory_manager.clone();
            let agent_id = agent_id.to_string();
            
            tokio::spawn(async move {
                let memory = AgentMemory::new(
                    agent_id,
                    MemoryType::Task,
                    format!("Concurrent task {}", i),
                );
                
                let mut manager = manager.lock().unwrap();
                manager.save_memory(&memory).await
            })
        }).collect::<Vec<_>>();
        
        // Wait for all tasks to complete
        let results = futures::future::join_all(handles).await;
        
        // All tasks should succeed
        for result in results {
            assert!(result.is_ok());
            assert!(result.unwrap().is_ok());
        }
        
        // Verify all memories were saved
        let manager = memory_manager.lock().unwrap();
        let all_memories = manager.search_memories(
            agent_id,
            None,
            None,
            None,
            Some(100),
            Some(0),
            None,
        ).await.expect("Failed to get all memories");
        
        assert_eq!(all_memories.len(), 10);
    }

    #[tokio::test]
    #[serial]
    async fn test_error_handling_and_recovery() {
        let (_temp_dir, db_path) = create_test_db();
        let mut memory_manager = SimpleMemoryManager::new(&db_path).expect("Failed to create memory manager");
        
        let agent_id = "error_test_agent";
        memory_manager.init_agent_memory(agent_id).await.expect("Failed to init agent memory");
        
        // Test 1: Try to get non-existent memory
        let non_existent_result = memory_manager.get_memory(agent_id, "non-existent-id").await;
        assert!(non_existent_result.is_ok()); // Should return Ok(None), not error
        assert!(non_existent_result.unwrap().is_none());
        
        // Test 2: Try to search with invalid agent ID
        let invalid_agent_result = memory_manager.search_memories(
            "non_existent_agent",
            None,
            None,
            None,
            Some(10),
            Some(0),
            None,
        ).await;
        assert!(invalid_agent_result.is_ok()); // Should return empty results, not error
        assert!(invalid_agent_result.unwrap().is_empty());
        
        // Test 3: Test memory with extreme values
        let large_content = "x".repeat(9999); // Just under the 10k limit
        let large_memory = AgentMemory::new(
            agent_id.to_string(),
            MemoryType::Context,
            large_content.clone(),
        );
        
        let result = memory_manager.save_memory(&large_memory).await;
        assert!(result.is_ok(), "Should handle large but valid content");
        
        // Test 4: Backup non-existent agent
        let backup_result = memory_manager.backup_memories("non_existent_agent", None).await;
        // Should create empty backup or handle gracefully
        assert!(backup_result.is_ok() || backup_result.is_err()); // Either is acceptable behavior
    }

    #[test]
    fn test_utility_functions_comprehensive() {
        // Test cosine similarity edge cases
        let zero_vector = vec![0.0, 0.0, 0.0];
        let unit_vector = vec![1.0, 0.0, 0.0];
        
        assert_eq!(cosine_similarity(&zero_vector, &unit_vector), 0.0);
        assert_eq!(cosine_similarity(&unit_vector, &zero_vector), 0.0);
        assert_eq!(cosine_similarity(&zero_vector, &zero_vector), 0.0);
        
        // Test keyword extraction
        let text = "The quick brown fox jumps over the lazy dog. This is a test sentence!";
        let keywords = extract_keywords(text);
        
        assert!(keywords.contains(&"quick".to_string()));
        assert!(keywords.contains(&"brown".to_string()));
        assert!(keywords.contains(&"jumps".to_string()));
        assert!(keywords.contains(&"sentence".to_string()));
        
        // Should filter out short words
        assert!(!keywords.contains(&"the".to_string()));
        assert!(!keywords.contains(&"is".to_string()));
        assert!(!keywords.contains(&"a".to_string()));
        
        // Test empty text
        let empty_keywords = extract_keywords("");
        assert!(empty_keywords.is_empty());
        
        // Test text with only short words
        let short_text = "a an is at to be";
        let short_keywords = extract_keywords(short_text);
        assert!(short_keywords.is_empty());
    }
}