#[cfg(test)]
mod memory_tests {
    use crate::database::memory::*;
    use std::collections::HashMap;
    use chrono::Utc;

    #[test]
    fn test_agent_memory_creation() {
        let agent_id = "test_agent_123".to_string();
        let content = "This is a test memory for unit testing purposes.".to_string();
        
        let memory = AgentMemory::new(agent_id.clone(), MemoryType::Task, content.clone());
        
        assert_eq!(memory.agent_id, agent_id);
        assert_eq!(memory.memory_type, MemoryType::Task);
        assert_eq!(memory.content, content);
        assert_eq!(memory.access_count, 0);
        assert_eq!(memory.relevance_score, 1.0);
        assert!(!memory.id.is_empty());
        assert!(memory.tags.is_empty());
        assert!(memory.metadata.is_empty());
        assert!(memory.embedding.is_none());
    }

    #[test]
    fn test_agent_memory_with_embedding() {
        let memory = AgentMemory::new("agent".to_string(), MemoryType::Learning, "content".to_string());
        let embedding = vec![0.1, 0.2, 0.3, 0.4, 0.5];
        
        let memory_with_embedding = memory.with_embedding(embedding.clone());
        
        assert_eq!(memory_with_embedding.embedding, Some(embedding));
    }

    #[test]
    fn test_agent_memory_with_tags() {
        let memory = AgentMemory::new("agent".to_string(), MemoryType::Context, "content".to_string());
        let tags = vec!["important".to_string(), "testing".to_string()];
        
        let memory_with_tags = memory.with_tags(tags.clone());
        
        assert_eq!(memory_with_tags.tags, tags);
    }

    #[test]
    fn test_agent_memory_with_metadata() {
        let memory = AgentMemory::new("agent".to_string(), MemoryType::Tool, "content".to_string());
        let mut metadata = HashMap::new();
        metadata.insert("source".to_string(), "test".to_string());
        metadata.insert("priority".to_string(), "high".to_string());
        
        let memory_with_metadata = memory.with_metadata(metadata.clone());
        
        assert_eq!(memory_with_metadata.metadata, metadata);
    }

    #[test]
    fn test_agent_memory_calculate_similarity() {
        let embedding = vec![1.0, 0.0, 0.0];
        let memory = AgentMemory::new("agent".to_string(), MemoryType::Pattern, "content".to_string())
            .with_embedding(embedding);
        
        // Perfect match
        let similarity = memory.calculate_similarity(&[1.0, 0.0, 0.0]).unwrap();
        assert!((similarity - 1.0).abs() < f32::EPSILON);
        
        // Orthogonal vectors
        let similarity = memory.calculate_similarity(&[0.0, 1.0, 0.0]).unwrap();
        assert!(similarity.abs() < f32::EPSILON);
        
        // No embedding
        let memory_no_embedding = AgentMemory::new("agent".to_string(), MemoryType::Error, "content".to_string());
        assert!(memory_no_embedding.calculate_similarity(&[1.0, 0.0, 0.0]).is_none());
    }

    #[test]
    fn test_shared_knowledge_creation() {
        let knowledge = SharedKnowledge::new(
            KnowledgeType::Fact,
            "Test Knowledge".to_string(),
            "This is test knowledge content.".to_string(),
            "source_agent".to_string(),
        );
        
        assert_eq!(knowledge.knowledge_type, KnowledgeType::Fact);
        assert_eq!(knowledge.title, "Test Knowledge");
        assert_eq!(knowledge.content, "This is test knowledge content.");
        assert_eq!(knowledge.source_agents, vec!["source_agent".to_string()]);
        assert_eq!(knowledge.confidence_score, 1.0);
        assert_eq!(knowledge.version, 1);
        assert!(knowledge.tags.is_empty());
    }

    #[test]
    fn test_shared_knowledge_add_source_agent() {
        let mut knowledge = SharedKnowledge::new(
            KnowledgeType::Procedure,
            "Test Procedure".to_string(),
            "Step by step instructions.".to_string(),
            "agent1".to_string(),
        );
        
        let initial_confidence = knowledge.confidence_score;
        let initial_version = knowledge.version;
        
        // Add new source agent
        knowledge.add_source_agent("agent2".to_string());
        
        assert_eq!(knowledge.source_agents.len(), 2);
        assert!(knowledge.source_agents.contains(&"agent1".to_string()));
        assert!(knowledge.source_agents.contains(&"agent2".to_string()));
        assert!(knowledge.confidence_score > initial_confidence);
        assert_eq!(knowledge.version, initial_version + 1);
        
        // Try to add duplicate agent
        let pre_duplicate_confidence = knowledge.confidence_score;
        let pre_duplicate_version = knowledge.version;
        knowledge.add_source_agent("agent1".to_string());
        
        assert_eq!(knowledge.source_agents.len(), 2); // No change
        assert_eq!(knowledge.confidence_score, pre_duplicate_confidence);
        assert_eq!(knowledge.version, pre_duplicate_version);
    }

    #[test]
    fn test_knowledge_node_creation() {
        let node = KnowledgeNode::new(NodeType::Agent, "Test Agent Node".to_string());
        
        assert_eq!(node.node_type, NodeType::Agent);
        assert_eq!(node.name, "Test Agent Node");
        assert!(!node.id.is_empty());
        assert!(node.properties.is_empty());
        assert!(node.embedding.is_none());
    }

    #[test]
    fn test_knowledge_edge_creation() {
        let edge = KnowledgeEdge::new(
            "node1".to_string(),
            "node2".to_string(),
            RelationshipType::Knows,
        );
        
        assert_eq!(edge.from_node, "node1");
        assert_eq!(edge.to_node, "node2");
        assert_eq!(edge.relationship_type, RelationshipType::Knows);
        assert_eq!(edge.weight, 1.0);
        assert!(!edge.id.is_empty());
        assert!(edge.properties.is_empty());
    }

    #[test]
    fn test_knowledge_edge_with_weight() {
        let edge = KnowledgeEdge::new(
            "node1".to_string(),
            "node2".to_string(),
            RelationshipType::Similar,
        ).with_weight(0.75);
        
        assert_eq!(edge.weight, 0.75);
    }

    #[test]
    fn test_cosine_similarity() {
        // Identical vectors
        let vec1 = vec![1.0, 0.0, 0.0];
        let vec2 = vec![1.0, 0.0, 0.0];
        let similarity = cosine_similarity(&vec1, &vec2);
        assert!((similarity - 1.0).abs() < f32::EPSILON);
        
        // Orthogonal vectors
        let vec1 = vec![1.0, 0.0, 0.0];
        let vec2 = vec![0.0, 1.0, 0.0];
        let similarity = cosine_similarity(&vec1, &vec2);
        assert!(similarity.abs() < f32::EPSILON);
        
        // Opposite vectors
        let vec1 = vec![1.0, 0.0, 0.0];
        let vec2 = vec![-1.0, 0.0, 0.0];
        let similarity = cosine_similarity(&vec1, &vec2);
        assert!((similarity + 1.0).abs() < f32::EPSILON);
        
        // Different length vectors
        let vec1 = vec![1.0, 0.0];
        let vec2 = vec![1.0, 0.0, 0.0];
        let similarity = cosine_similarity(&vec1, &vec2);
        assert_eq!(similarity, 0.0);
        
        // Zero vectors
        let vec1 = vec![0.0, 0.0, 0.0];
        let vec2 = vec![1.0, 0.0, 0.0];
        let similarity = cosine_similarity(&vec1, &vec2);
        assert_eq!(similarity, 0.0);
    }

    #[test]
    fn test_extract_keywords() {
        let text = "This is a test sentence with some important keywords for extraction.";
        let keywords = extract_keywords(text);
        
        assert!(keywords.contains(&"test".to_string()));
        assert!(keywords.contains(&"sentence".to_string()));
        assert!(keywords.contains(&"important".to_string()));
        assert!(keywords.contains(&"keywords".to_string()));
        assert!(keywords.contains(&"extraction".to_string()));
        
        // Short words should be filtered out
        assert!(!keywords.contains(&"is".to_string()));
        assert!(!keywords.contains(&"a".to_string()));
        
        // Should be lowercase
        assert!(keywords.iter().all(|k| k.chars().all(|c| c.is_lowercase())));
    }

    #[test]
    fn test_memory_types_enum() {
        // Test all memory types
        let types = vec![
            MemoryType::Conversation,
            MemoryType::Task,
            MemoryType::Learning,
            MemoryType::Context,
            MemoryType::Tool,
            MemoryType::Error,
            MemoryType::Success,
            MemoryType::Pattern,
        ];
        
        for memory_type in types {
            let memory = AgentMemory::new("agent".to_string(), memory_type.clone(), "content".to_string());
            assert_eq!(memory.memory_type, memory_type);
        }
    }

    #[test]
    fn test_knowledge_types_enum() {
        let types = vec![
            KnowledgeType::Fact,
            KnowledgeType::Procedure,
            KnowledgeType::Pattern,
            KnowledgeType::Rule,
            KnowledgeType::Concept,
            KnowledgeType::Relationship,
        ];
        
        for knowledge_type in types {
            let knowledge = SharedKnowledge::new(
                knowledge_type.clone(),
                "Title".to_string(),
                "Content".to_string(),
                "agent".to_string(),
            );
            assert_eq!(knowledge.knowledge_type, knowledge_type);
        }
    }

    #[test]
    fn test_node_types_enum() {
        let types = vec![
            NodeType::Agent,
            NodeType::Memory,
            NodeType::Concept,
            NodeType::Task,
            NodeType::Tool,
            NodeType::Context,
            NodeType::Pattern,
        ];
        
        for node_type in types {
            let node = KnowledgeNode::new(node_type.clone(), "Node Name".to_string());
            assert_eq!(node.node_type, node_type);
        }
    }

    #[test]
    fn test_relationship_types_enum() {
        let types = vec![
            RelationshipType::Knows,
            RelationshipType::Uses,
            RelationshipType::LearnedFrom,
            RelationshipType::CollaboratesWith,
            RelationshipType::DependsOn,
            RelationshipType::Similar,
            RelationshipType::Opposite,
            RelationshipType::CausedBy,
            RelationshipType::LeadsTo,
        ];
        
        for relationship_type in types {
            let edge = KnowledgeEdge::new(
                "from".to_string(),
                "to".to_string(),
                relationship_type.clone(),
            );
            assert_eq!(edge.relationship_type, relationship_type);
        }
    }

    #[test]
    fn test_agent_interaction_creation() {
        let interaction = AgentInteraction {
            id: "interaction-123".to_string(),
            agent1_id: "agent1".to_string(),
            agent2_id: "agent2".to_string(),
            interaction_type: InteractionType::Collaboration,
            context: "Working together on a task".to_string(),
            success: true,
            created_at: Utc::now(),
        };
        
        assert_eq!(interaction.agent1_id, "agent1");
        assert_eq!(interaction.agent2_id, "agent2");
        assert_eq!(interaction.interaction_type, InteractionType::Collaboration);
        assert!(interaction.success);
    }

    #[test]
    fn test_memory_query_structure() {
        let query = MemoryQuery {
            agent_id: Some("test_agent".to_string()),
            memory_types: Some(vec![MemoryType::Task, MemoryType::Learning]),
            content_search: Some("important task".to_string()),
            tags: Some(vec!["urgent".to_string(), "work".to_string()]),
            embedding: Some(vec![0.1, 0.2, 0.3]),
            similarity_threshold: Some(0.8),
            limit: Some(50),
            offset: Some(0),
            time_range: None,
        };
        
        assert_eq!(query.agent_id, Some("test_agent".to_string()));
        assert_eq!(query.limit, Some(50));
        assert_eq!(query.similarity_threshold, Some(0.8));
    }

    #[test]
    fn test_memory_search_result_structure() {
        let memory = AgentMemory::new(
            "agent".to_string(),
            MemoryType::Task,
            "Test memory content".to_string(),
        );
        
        let search_result = MemorySearchResult {
            memory,
            similarity_score: Some(0.92),
            relevance_rank: 1,
        };
        
        assert_eq!(search_result.similarity_score, Some(0.92));
        assert_eq!(search_result.relevance_rank, 1);
        assert_eq!(search_result.memory.content, "Test memory content");
    }

    #[test]
    fn test_memory_stats_structure() {
        let mut type_counts = HashMap::new();
        type_counts.insert(MemoryType::Task, 5);
        type_counts.insert(MemoryType::Learning, 3);
        
        let memory1 = AgentMemory::new("agent".to_string(), MemoryType::Task, "Task 1".to_string());
        let memory2 = AgentMemory::new("agent".to_string(), MemoryType::Task, "Task 2".to_string());
        
        let stats = MemoryStats {
            agent_id: "test_agent".to_string(),
            total_memories: 8,
            memory_type_counts: type_counts,
            average_relevance: 0.85,
            most_accessed_memories: vec![memory1, memory2],
            recent_learnings: vec![],
            knowledge_graph_size: 25,
        };
        
        assert_eq!(stats.agent_id, "test_agent");
        assert_eq!(stats.total_memories, 8);
        assert_eq!(stats.average_relevance, 0.85);
        assert_eq!(stats.knowledge_graph_size, 25);
        assert_eq!(stats.most_accessed_memories.len(), 2);
    }
}

#[cfg(test)]
mod validation_comprehensive_tests {
    use crate::validation::MemoryValidator;
    use std::collections::HashMap;

    #[test]
    fn test_comprehensive_agent_id_validation() {
        // Valid cases
        let valid_agent_ids = vec![
            "agent123",
            "my_agent",
            "test-agent",
            "Agent_Test-123",
            "a1b2c3",
            "ABC_123",
        ];
        
        for agent_id in valid_agent_ids {
            assert!(
                MemoryValidator::validate_agent_id(agent_id).is_ok(),
                "Agent ID '{}' should be valid",
                agent_id
            );
        }
        
        // Invalid cases
        let invalid_agent_ids = vec![
            "",              // empty
            "ab",            // too short
            "agent@123",     // invalid character @
            "agent 123",     // space
            "agent.123",     // period
            "agent#123",     // hash
            "agent!123",     // exclamation
            &"a".repeat(51), // too long
        ];
        
        for agent_id in invalid_agent_ids {
            assert!(
                MemoryValidator::validate_agent_id(agent_id).is_err(),
                "Agent ID '{}' should be invalid",
                agent_id
            );
        }
    }

    #[test]
    fn test_comprehensive_content_validation() {
        // Valid content
        let valid_content = vec![
            "Hello world",
            "This is a longer piece of content with numbers 123 and symbols !@#$%^&*()",
            "Content with\nnewlines\nand\ttabs",
            "Unicode content: 你好世界 🌍",
            &"a".repeat(10000), // max length
        ];
        
        for content in valid_content {
            assert!(
                MemoryValidator::validate_content(content).is_ok(),
                "Content should be valid: {}",
                content.chars().take(50).collect::<String>()
            );
        }
        
        // Invalid content
        let invalid_content = vec![
            "",                           // empty
            "   ",                        // only whitespace
            "\t\n\r",                     // only whitespace chars
            &"a".repeat(10001),           // too long
            "<script>alert('xss')</script>", // XSS
            "javascript:alert('xss')",    // JavaScript protocol
            "Content with onload=malicious", // Event handler
        ];
        
        for content in invalid_content {
            assert!(
                MemoryValidator::validate_content(content).is_err(),
                "Content should be invalid: {}",
                content.chars().take(50).collect::<String>()
            );
        }
    }

    #[test]
    fn test_comprehensive_tags_validation() {
        // Valid tag sets
        let valid_tag_sets = vec![
            vec!["tag1".to_string()],
            vec!["important".to_string(), "work".to_string()],
            vec!["tag-with-hyphens".to_string(), "tag_with_underscores".to_string()],
            vec!["Tag With Spaces".to_string()],
            (0..20).map(|i| format!("tag{}", i)).collect(), // max count
        ];
        
        for tags in valid_tag_sets {
            assert!(
                MemoryValidator::validate_tags(&tags).is_ok(),
                "Tags should be valid: {:?}",
                tags
            );
        }
        
        // Invalid tag sets
        let invalid_tag_sets = vec![
            vec!["".to_string()],                              // empty tag
            vec!["tag1".to_string(), "tag1".to_string()],      // duplicate
            vec!["Tag1".to_string(), "tag1".to_string()],      // case-insensitive duplicate
            vec!["tag@invalid".to_string()],                   // invalid character
            vec!["tag#invalid".to_string()],                   // invalid character
            (0..21).map(|i| format!("tag{}", i)).collect(),    // too many
            vec!["a".repeat(51)],                              // tag too long
        ];
        
        for tags in invalid_tag_sets {
            assert!(
                MemoryValidator::validate_tags(&tags).is_err(),
                "Tags should be invalid: {:?}",
                tags
            );
        }
    }

    #[test]
    fn test_comprehensive_metadata_validation() {
        // Valid metadata
        let mut valid_metadata1 = HashMap::new();
        valid_metadata1.insert("key1".to_string(), "value1".to_string());
        valid_metadata1.insert("key_2".to_string(), "value with spaces and symbols !@#".to_string());
        valid_metadata1.insert("key-3".to_string(), "".to_string()); // empty value is OK
        
        assert!(MemoryValidator::validate_metadata(&valid_metadata1).is_ok());
        
        // Valid metadata at limits
        let mut max_metadata = HashMap::new();
        for i in 0..50 {
            max_metadata.insert(format!("key{}", i), format!("value{}", i));
        }
        assert!(MemoryValidator::validate_metadata(&max_metadata).is_ok());
        
        // Invalid metadata cases
        let mut invalid_empty_key = HashMap::new();
        invalid_empty_key.insert("".to_string(), "value".to_string());
        assert!(MemoryValidator::validate_metadata(&invalid_empty_key).is_err());
        
        let mut invalid_key_chars = HashMap::new();
        invalid_key_chars.insert("key@invalid".to_string(), "value".to_string());
        assert!(MemoryValidator::validate_metadata(&invalid_key_chars).is_err());
        
        let mut invalid_long_key = HashMap::new();
        invalid_long_key.insert("a".repeat(101), "value".to_string());
        assert!(MemoryValidator::validate_metadata(&invalid_long_key).is_err());
        
        let mut invalid_long_value = HashMap::new();
        invalid_long_value.insert("key".to_string(), "a".repeat(1001));
        assert!(MemoryValidator::validate_metadata(&invalid_long_value).is_err());
        
        let mut invalid_xss_value = HashMap::new();
        invalid_xss_value.insert("key".to_string(), "<script>alert('xss')</script>".to_string());
        assert!(MemoryValidator::validate_metadata(&invalid_xss_value).is_err());
        
        // Too many metadata entries
        let mut too_many_metadata = HashMap::new();
        for i in 0..51 {
            too_many_metadata.insert(format!("key{}", i), format!("value{}", i));
        }
        assert!(MemoryValidator::validate_metadata(&too_many_metadata).is_err());
    }

    #[test]
    fn test_uuid_validation_comprehensive() {
        // Valid UUIDs
        let valid_uuids = vec![
            "550e8400-e29b-41d4-a716-446655440000",
            "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
            "00000000-0000-0000-0000-000000000000",
            "ffffffff-ffff-ffff-ffff-ffffffffffff",
        ];
        
        for uuid in valid_uuids {
            assert!(
                MemoryValidator::validate_memory_id(uuid).is_ok(),
                "UUID '{}' should be valid",
                uuid
            );
            assert!(
                MemoryValidator::validate_node_id(uuid).is_ok(),
                "Node UUID '{}' should be valid",
                uuid
            );
        }
        
        // Invalid UUIDs
        let invalid_uuids = vec![
            "",
            "not-a-uuid",
            "550e8400-e29b-41d4-a716", // too short
            "550e8400-e29b-41d4-a716-446655440000-extra", // too long
            "550e8400-e29b-41d4-a716-44665544000g", // invalid character
            "550e8400_e29b_41d4_a716_446655440000", // wrong separators
        ];
        
        for uuid in invalid_uuids {
            assert!(
                MemoryValidator::validate_memory_id(uuid).is_err(),
                "UUID '{}' should be invalid",
                uuid
            );
            assert!(
                MemoryValidator::validate_node_id(uuid).is_err(),
                "Node UUID '{}' should be invalid",
                uuid
            );
        }
    }

    #[test]
    fn test_numeric_validation_comprehensive() {
        // Weight validation
        let valid_weights = vec![0.0, 0.5, 1.0, 5.0, 10.0];
        for weight in valid_weights {
            assert!(
                MemoryValidator::validate_weight(weight).is_ok(),
                "Weight {} should be valid",
                weight
            );
        }
        
        let invalid_weights = vec![-0.1, -1.0, 10.1, 100.0, f32::NAN, f32::INFINITY, f32::NEG_INFINITY];
        for weight in invalid_weights {
            assert!(
                MemoryValidator::validate_weight(weight).is_err(),
                "Weight {} should be invalid",
                weight
            );
        }
        
        // Limit validation
        let valid_limits = vec![1, 10, 100, 1000];
        for limit in valid_limits {
            assert!(
                MemoryValidator::validate_limit(limit).is_ok(),
                "Limit {} should be valid",
                limit
            );
        }
        
        let invalid_limits = vec![0, 1001, 10000];
        for limit in invalid_limits {
            assert!(
                MemoryValidator::validate_limit(limit).is_err(),
                "Limit {} should be invalid",
                limit
            );
        }
        
        // Offset validation
        let valid_offsets = vec![0, 100, 1000, 100000];
        for offset in valid_offsets {
            assert!(
                MemoryValidator::validate_offset(offset).is_ok(),
                "Offset {} should be valid",
                offset
            );
        }
        
        let invalid_offsets = vec![100001, 1000000];
        for offset in invalid_offsets {
            assert!(
                MemoryValidator::validate_offset(offset).is_err(),
                "Offset {} should be invalid",
                offset
            );
        }
        
        // Similarity threshold validation
        let valid_thresholds = vec![0.0, 0.1, 0.5, 0.9, 1.0];
        for threshold in valid_thresholds {
            assert!(
                MemoryValidator::validate_similarity_threshold(threshold).is_ok(),
                "Threshold {} should be valid",
                threshold
            );
        }
        
        let invalid_thresholds = vec![-0.1, 1.1, 2.0, f32::NAN, f32::INFINITY];
        for threshold in invalid_thresholds {
            assert!(
                MemoryValidator::validate_similarity_threshold(threshold).is_err(),
                "Threshold {} should be invalid",
                threshold
            );
        }
    }

    #[test]
    fn test_title_and_node_name_validation() {
        // Valid titles/names
        let valid_names = vec![
            "T",                        // minimum length
            "Test Title",
            "A Very Long Title That Contains Multiple Words",
            "Title with numbers 123",
            "Title-with-hyphens_and_underscores",
            &"A".repeat(200),          // maximum length
        ];
        
        for name in valid_names {
            assert!(
                MemoryValidator::validate_title(name).is_ok(),
                "Title '{}' should be valid",
                name
            );
            if name.len() <= 100 {
                assert!(
                    MemoryValidator::validate_node_name(name).is_ok(),
                    "Node name '{}' should be valid",
                    name
                );
            }
        }
        
        // Invalid titles/names
        let invalid_names = vec![
            "",                         // empty
            "   ",                      // only whitespace
            &"A".repeat(201),          // too long for title
            &"A".repeat(101),          // too long for node name (but valid for title)
        ];
        
        for name in invalid_names {
            assert!(
                MemoryValidator::validate_title(name).is_err(),
                "Title '{}' should be invalid",
                name.chars().take(50).collect::<String>()
            );
            if !name.trim().is_empty() {
                assert!(
                    MemoryValidator::validate_node_name(name).is_err(),
                    "Node name '{}' should be invalid",
                    name.chars().take(50).collect::<String>()
                );
            }
        }
    }

    #[test]
    fn test_sanitization_functions() {
        use crate::validation::{sanitize_string, sanitize_html_content};
        
        // Test string sanitization
        let input = "Hello <script>alert('test')</script> World";
        let sanitized = sanitize_string(input);
        assert!(!sanitized.contains('<'));
        assert!(!sanitized.contains('>'));
        
        // Test HTML content sanitization
        let html_input = "<div>Hello & \"World\"</div>";
        let sanitized_html = sanitize_html_content(html_input);
        assert!(sanitized_html.contains("&lt;div&gt;"));
        assert!(sanitized_html.contains("&amp;"));
        assert!(sanitized_html.contains("&quot;"));
        
        // Test null byte removal
        let null_input = "Test\0null\0bytes";
        let sanitized_null = sanitize_string(null_input);
        assert!(!sanitized_null.contains('\0'));
    }
}