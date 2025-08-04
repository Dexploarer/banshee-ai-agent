#[cfg(test)]
mod integration_tests {
    use crate::validation::MemoryValidator;
    use std::collections::HashMap;

    /// Test comprehensive validation integration scenarios
    #[test]
    fn test_create_memory_request_validation() {
        // Valid create memory request data
        let agent_id = "test_agent_123";
        let content = "This is a valid memory content for testing.";
        let tags = vec!["important".to_string(), "test".to_string()];
        let mut metadata = HashMap::new();
        metadata.insert("source".to_string(), "test_suite".to_string());
        metadata.insert("priority".to_string(), "high".to_string());

        // Test all validation passes
        assert!(MemoryValidator::validate_agent_id(agent_id).is_ok());
        assert!(MemoryValidator::validate_content(content).is_ok());
        assert!(MemoryValidator::validate_tags(&tags).is_ok());
        assert!(MemoryValidator::validate_metadata(&metadata).is_ok());
    }

    #[test]
    fn test_search_request_validation() {
        // Valid search request data
        let agent_id = "search_agent_456";
        let content_search = "find important memories";
        let tags = vec!["work".to_string(), "urgent".to_string()];
        let limit = 50;
        let offset = 0;
        let similarity_threshold = 0.8;

        // Test all validation passes
        assert!(MemoryValidator::validate_agent_id(agent_id).is_ok());
        assert!(MemoryValidator::validate_content(content_search).is_ok());
        assert!(MemoryValidator::validate_tags(&tags).is_ok());
        assert!(MemoryValidator::validate_limit(limit).is_ok());
        assert!(MemoryValidator::validate_offset(offset).is_ok());
        assert!(MemoryValidator::validate_similarity_threshold(similarity_threshold).is_ok());
    }

    #[test]
    fn test_knowledge_creation_validation() {
        // Valid knowledge creation data
        let agent_id = "knowledge_agent_789";
        let title = "Important Knowledge Entry";
        let content = "This knowledge entry contains valuable information about the system.";
        let tags = vec!["knowledge".to_string(), "system".to_string()];

        // Test all validation passes
        assert!(MemoryValidator::validate_agent_id(agent_id).is_ok());
        assert!(MemoryValidator::validate_title(title).is_ok());
        assert!(MemoryValidator::validate_content(content).is_ok());
        assert!(MemoryValidator::validate_tags(&tags).is_ok());
    }

    #[test]
    fn test_graph_node_validation() {
        // Valid graph node data
        let agent_id = "graph_agent_101";
        let node_name = "Test Node";
        let mut properties = HashMap::new();
        properties.insert("type".to_string(), "concept".to_string());
        properties.insert("importance".to_string(), "high".to_string());

        // Test all validation passes
        assert!(MemoryValidator::validate_agent_id(agent_id).is_ok());
        assert!(MemoryValidator::validate_node_name(node_name).is_ok());
        assert!(MemoryValidator::validate_metadata(&properties).is_ok());
    }

    #[test]
    fn test_graph_edge_validation() {
        // Valid graph edge data
        let agent_id = "edge_agent_202";
        let from_node = "550e8400-e29b-41d4-a716-446655440000";
        let to_node = "660f8400-e29b-41d4-a716-446655440001";
        let weight = 0.75;
        let mut properties = HashMap::new();
        properties.insert("relationship".to_string(), "connects_to".to_string());

        // Test all validation passes
        assert!(MemoryValidator::validate_agent_id(agent_id).is_ok());
        assert!(MemoryValidator::validate_node_id(from_node).is_ok());
        assert!(MemoryValidator::validate_node_id(to_node).is_ok());
        assert!(MemoryValidator::validate_weight(weight).is_ok());
        assert!(MemoryValidator::validate_metadata(&properties).is_ok());
    }

    #[test]
    fn test_security_attack_prevention() {
        // Test XSS prevention
        let malicious_content = "<script>alert('xss')</script>This is malicious content";
        assert!(MemoryValidator::validate_content(malicious_content).is_err());

        // Test SQL injection-like patterns (should be safe due to string validation)
        let malicious_agent_id = "'; DROP TABLE memories; --";
        assert!(MemoryValidator::validate_agent_id(malicious_agent_id).is_err());

        // Test path traversal prevention in metadata keys
        let malicious_metadata = {
            let mut map = HashMap::new();
            map.insert("../../../etc/passwd".to_string(), "malicious".to_string());
            map
        };
        // This should fail validation because metadata keys cannot contain path separators
        assert!(MemoryValidator::validate_metadata(&malicious_metadata).is_err());

        // Test oversized inputs
        let huge_content = "a".repeat(10001);
        assert!(MemoryValidator::validate_content(&huge_content).is_err());

        let huge_agent_id = "a".repeat(51);
        assert!(MemoryValidator::validate_agent_id(&huge_agent_id).is_err());
    }

    #[test]
    fn test_edge_cases() {
        // Test empty and whitespace inputs
        assert!(MemoryValidator::validate_agent_id("").is_err());
        assert!(MemoryValidator::validate_agent_id("   ").is_err());  // Only whitespace
        assert!(MemoryValidator::validate_content("").is_err());
        assert!(MemoryValidator::validate_content("   ").is_err());  // Only whitespace

        // Test boundary values
        assert!(MemoryValidator::validate_limit(1).is_ok());  // Minimum
        assert!(MemoryValidator::validate_limit(1000).is_ok());  // Maximum
        assert!(MemoryValidator::validate_limit(0).is_err());  // Below minimum
        assert!(MemoryValidator::validate_limit(1001).is_err());  // Above maximum

        assert!(MemoryValidator::validate_offset(0).is_ok());  // Minimum
        assert!(MemoryValidator::validate_offset(100000).is_ok());  // Maximum
        assert!(MemoryValidator::validate_offset(100001).is_err());  // Above maximum

        // Test weight boundaries
        assert!(MemoryValidator::validate_weight(0.0).is_ok());
        assert!(MemoryValidator::validate_weight(10.0).is_ok());
        assert!(MemoryValidator::validate_weight(-0.1).is_err());
        assert!(MemoryValidator::validate_weight(10.1).is_err());
        assert!(MemoryValidator::validate_weight(f32::NAN).is_err());
        assert!(MemoryValidator::validate_weight(f32::INFINITY).is_err());

        // Test similarity threshold boundaries
        assert!(MemoryValidator::validate_similarity_threshold(0.0).is_ok());
        assert!(MemoryValidator::validate_similarity_threshold(1.0).is_ok());
        assert!(MemoryValidator::validate_similarity_threshold(-0.1).is_err());
        assert!(MemoryValidator::validate_similarity_threshold(1.1).is_err());
    }

    #[test]
    fn test_uuid_validation() {
        // Valid UUIDs
        assert!(MemoryValidator::validate_memory_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
        assert!(MemoryValidator::validate_node_id("6ba7b810-9dad-11d1-80b4-00c04fd430c8").is_ok());

        // Invalid UUIDs
        assert!(MemoryValidator::validate_memory_id("not-a-uuid").is_err());
        assert!(MemoryValidator::validate_memory_id("550e8400-e29b-41d4-a716").is_err()); // Too short
        assert!(MemoryValidator::validate_memory_id("550e8400-e29b-41d4-a716-446655440000-extra").is_err()); // Too long
        assert!(MemoryValidator::validate_node_id("").is_err());
    }

    #[test]
    fn test_metadata_limits() {
        // Test maximum metadata entries
        let mut large_metadata = HashMap::new();
        for i in 0..50 {
            large_metadata.insert(format!("key_{}", i), format!("value_{}", i));
        }
        assert!(MemoryValidator::validate_metadata(&large_metadata).is_ok());

        // Add one more to exceed limit
        large_metadata.insert("key_50".to_string(), "value_50".to_string());
        assert!(MemoryValidator::validate_metadata(&large_metadata).is_err());

        // Test key length limits
        let mut invalid_key_metadata = HashMap::new();
        let long_key = "a".repeat(101);
        invalid_key_metadata.insert(long_key, "value".to_string());
        assert!(MemoryValidator::validate_metadata(&invalid_key_metadata).is_err());

        // Test value length limits
        let mut invalid_value_metadata = HashMap::new();
        let long_value = "a".repeat(1001);
        invalid_value_metadata.insert("key".to_string(), long_value);
        assert!(MemoryValidator::validate_metadata(&invalid_value_metadata).is_err());
    }

    #[test]
    fn test_tags_validation_comprehensive() {
        // Valid tags
        let valid_tags = vec![
            "work".to_string(),
            "important".to_string(),
            "project-alpha".to_string(),
            "team_beta".to_string(),
        ];
        assert!(MemoryValidator::validate_tags(&valid_tags).is_ok());

        // Too many tags
        let many_tags: Vec<String> = (0..21).map(|i| format!("tag_{}", i)).collect();
        assert!(MemoryValidator::validate_tags(&many_tags).is_err());

        // Duplicate tags (case insensitive)
        let duplicate_tags = vec!["Work".to_string(), "work".to_string()];
        assert!(MemoryValidator::validate_tags(&duplicate_tags).is_err());

        // Empty tag
        let empty_tag = vec!["".to_string()];
        assert!(MemoryValidator::validate_tags(&empty_tag).is_err());

        // Tag too long
        let long_tag = vec!["a".repeat(51)];
        assert!(MemoryValidator::validate_tags(&long_tag).is_err());

        // Invalid characters in tag
        let invalid_tag = vec!["tag@invalid".to_string()];
        assert!(MemoryValidator::validate_tags(&invalid_tag).is_err());
    }
}