use regex::Regex;
use std::collections::HashMap;
use uuid::Uuid;
use anyhow::{Result, anyhow};
use once_cell::sync::Lazy;

// Re-export graph validator
pub mod graph_validator;
pub use graph_validator::{GraphValidator, GraphValidationError};

/// Memory validation module that mirrors frontend MemoryValidation class
/// Provides comprehensive input validation for all memory-related operations

// Validation constants
const MAX_AGENT_ID_LENGTH: usize = 50;
const MIN_AGENT_ID_LENGTH: usize = 3;
const MAX_CONTENT_LENGTH: usize = 10000;
const MIN_CONTENT_LENGTH: usize = 1;
const MAX_TAG_LENGTH: usize = 50;
const MAX_TAGS_COUNT: usize = 20;
const MAX_METADATA_KEYS: usize = 50;
const MAX_METADATA_KEY_LENGTH: usize = 100;
const MAX_METADATA_VALUE_LENGTH: usize = 1000;
const MAX_TITLE_LENGTH: usize = 200;
const MIN_TITLE_LENGTH: usize = 1;
const MAX_NODE_NAME_LENGTH: usize = 100;
const MIN_NODE_NAME_LENGTH: usize = 1;

// Regex patterns for validation
static AGENT_ID_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-zA-Z0-9_-]+$").unwrap()
});

static TAG_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-zA-Z0-9_\-\s]+$").unwrap()
});

static METADATA_KEY_REGEX: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^[a-zA-Z0-9_\-\.]+$").unwrap()
});

/// Validation error types
#[derive(Debug, Clone)]
pub enum ValidationError {
    InvalidAgentId(String),
    InvalidMemoryId(String),
    InvalidContent(String),
    InvalidTags(String),
    InvalidMetadata(String),
    InvalidTitle(String),
    InvalidNodeName(String),
    InvalidNodeId(String),
    InvalidWeight(String),
    InvalidLimit(String),
    InvalidOffset(String),
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::InvalidAgentId(msg) => write!(f, "Invalid agent ID: {}", msg),
            ValidationError::InvalidMemoryId(msg) => write!(f, "Invalid memory ID: {}", msg),
            ValidationError::InvalidContent(msg) => write!(f, "Invalid content: {}", msg),
            ValidationError::InvalidTags(msg) => write!(f, "Invalid tags: {}", msg),
            ValidationError::InvalidMetadata(msg) => write!(f, "Invalid metadata: {}", msg),
            ValidationError::InvalidTitle(msg) => write!(f, "Invalid title: {}", msg),
            ValidationError::InvalidNodeName(msg) => write!(f, "Invalid node name: {}", msg),
            ValidationError::InvalidNodeId(msg) => write!(f, "Invalid node ID: {}", msg),
            ValidationError::InvalidWeight(msg) => write!(f, "Invalid weight: {}", msg),
            ValidationError::InvalidLimit(msg) => write!(f, "Invalid limit: {}", msg),
            ValidationError::InvalidOffset(msg) => write!(f, "Invalid offset: {}", msg),
        }
    }
}

impl std::error::Error for ValidationError {}

/// Main validation struct that provides all validation methods
pub struct MemoryValidator;

impl MemoryValidator {
    /// Validate agent ID: alphanumeric with underscores/hyphens only
    pub fn validate_agent_id(agent_id: &str) -> Result<(), ValidationError> {
        if agent_id.is_empty() {
            return Err(ValidationError::InvalidAgentId("Agent ID cannot be empty".to_string()));
        }
        
        if agent_id.len() < MIN_AGENT_ID_LENGTH {
            return Err(ValidationError::InvalidAgentId(
                format!("Agent ID must be at least {} characters long", MIN_AGENT_ID_LENGTH)
            ));
        }
        
        if agent_id.len() > MAX_AGENT_ID_LENGTH {
            return Err(ValidationError::InvalidAgentId(
                format!("Agent ID cannot be longer than {} characters", MAX_AGENT_ID_LENGTH)
            ));
        }
        
        if !AGENT_ID_REGEX.is_match(agent_id) {
            return Err(ValidationError::InvalidAgentId(
                "Agent ID can only contain alphanumeric characters, underscores, and hyphens".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate memory ID: must be valid UUID format
    pub fn validate_memory_id(memory_id: &str) -> Result<(), ValidationError> {
        if memory_id.is_empty() {
            return Err(ValidationError::InvalidMemoryId("Memory ID cannot be empty".to_string()));
        }
        
        if Uuid::parse_str(memory_id).is_err() {
            return Err(ValidationError::InvalidMemoryId(
                "Memory ID must be a valid UUID format".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate content: non-empty string with length limits
    pub fn validate_content(content: &str) -> Result<(), ValidationError> {
        let trimmed = content.trim();
        
        if trimmed.is_empty() {
            return Err(ValidationError::InvalidContent("Content cannot be empty".to_string()));
        }
        
        if trimmed.len() < MIN_CONTENT_LENGTH {
            return Err(ValidationError::InvalidContent(
                format!("Content must be at least {} character long", MIN_CONTENT_LENGTH)
            ));
        }
        
        if trimmed.len() > MAX_CONTENT_LENGTH {
            return Err(ValidationError::InvalidContent(
                format!("Content cannot be longer than {} characters", MAX_CONTENT_LENGTH)
            ));
        }
        
        // Check for potentially dangerous content (basic XSS prevention)
        if trimmed.contains("<script") || trimmed.contains("javascript:") || trimmed.contains("onload=") {
            return Err(ValidationError::InvalidContent(
                "Content contains potentially unsafe elements".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate tags: array of valid strings with reasonable limits
    pub fn validate_tags(tags: &[String]) -> Result<(), ValidationError> {
        if tags.len() > MAX_TAGS_COUNT {
            return Err(ValidationError::InvalidTags(
                format!("Cannot have more than {} tags", MAX_TAGS_COUNT)
            ));
        }
        
        for tag in tags {
            let trimmed = tag.trim();
            
            if trimmed.is_empty() {
                return Err(ValidationError::InvalidTags("Tags cannot be empty".to_string()));
            }
            
            if trimmed.len() > MAX_TAG_LENGTH {
                return Err(ValidationError::InvalidTags(
                    format!("Tag '{}' is too long (max {} characters)", trimmed, MAX_TAG_LENGTH)
                ));
            }
            
            if !TAG_REGEX.is_match(trimmed) {
                return Err(ValidationError::InvalidTags(
                    format!("Tag '{}' contains invalid characters", trimmed)
                ));
            }
        }
        
        // Check for duplicate tags
        let mut unique_tags = std::collections::HashSet::new();
        for tag in tags {
            let trimmed = tag.trim().to_lowercase();
            if !unique_tags.insert(trimmed.clone()) {
                return Err(ValidationError::InvalidTags(
                    format!("Duplicate tag found: '{}'", trimmed)
                ));
            }
        }
        
        Ok(())
    }
    
    /// Validate metadata: key-value pairs with size and content restrictions
    pub fn validate_metadata(metadata: &HashMap<String, String>) -> Result<(), ValidationError> {
        if metadata.len() > MAX_METADATA_KEYS {
            return Err(ValidationError::InvalidMetadata(
                format!("Cannot have more than {} metadata entries", MAX_METADATA_KEYS)
            ));
        }
        
        for (key, value) in metadata {
            // Validate key
            let trimmed_key = key.trim();
            if trimmed_key.is_empty() {
                return Err(ValidationError::InvalidMetadata("Metadata keys cannot be empty".to_string()));
            }
            
            if trimmed_key.len() > MAX_METADATA_KEY_LENGTH {
                return Err(ValidationError::InvalidMetadata(
                    format!("Metadata key '{}' is too long (max {} characters)", trimmed_key, MAX_METADATA_KEY_LENGTH)
                ));
            }
            
            if !METADATA_KEY_REGEX.is_match(trimmed_key) {
                return Err(ValidationError::InvalidMetadata(
                    format!("Metadata key '{}' contains invalid characters", trimmed_key)
                ));
            }
            
            // Validate value
            let trimmed_value = value.trim();
            if trimmed_value.len() > MAX_METADATA_VALUE_LENGTH {
                return Err(ValidationError::InvalidMetadata(
                    format!("Metadata value for key '{}' is too long (max {} characters)", trimmed_key, MAX_METADATA_VALUE_LENGTH)
                ));
            }
            
            // Check for potentially dangerous content in values
            if trimmed_value.contains("<script") || trimmed_value.contains("javascript:") {
                return Err(ValidationError::InvalidMetadata(
                    format!("Metadata value for key '{}' contains potentially unsafe elements", trimmed_key)
                ));
            }
        }
        
        Ok(())
    }
    
    /// Validate title for knowledge entries
    pub fn validate_title(title: &str) -> Result<(), ValidationError> {
        let trimmed = title.trim();
        
        if trimmed.is_empty() {
            return Err(ValidationError::InvalidTitle("Title cannot be empty".to_string()));
        }
        
        if trimmed.len() < MIN_TITLE_LENGTH {
            return Err(ValidationError::InvalidTitle(
                format!("Title must be at least {} character long", MIN_TITLE_LENGTH)
            ));
        }
        
        if trimmed.len() > MAX_TITLE_LENGTH {
            return Err(ValidationError::InvalidTitle(
                format!("Title cannot be longer than {} characters", MAX_TITLE_LENGTH)
            ));
        }
        
        Ok(())
    }
    
    /// Validate node name for knowledge graph
    pub fn validate_node_name(name: &str) -> Result<(), ValidationError> {
        let trimmed = name.trim();
        
        if trimmed.is_empty() {
            return Err(ValidationError::InvalidNodeName("Node name cannot be empty".to_string()));
        }
        
        if trimmed.len() < MIN_NODE_NAME_LENGTH {
            return Err(ValidationError::InvalidNodeName(
                format!("Node name must be at least {} character long", MIN_NODE_NAME_LENGTH)
            ));
        }
        
        if trimmed.len() > MAX_NODE_NAME_LENGTH {
            return Err(ValidationError::InvalidNodeName(
                format!("Node name cannot be longer than {} characters", MAX_NODE_NAME_LENGTH)
            ));
        }
        
        Ok(())
    }
    
    /// Validate node ID (UUID format)
    pub fn validate_node_id(node_id: &str) -> Result<(), ValidationError> {
        if node_id.is_empty() {
            return Err(ValidationError::InvalidNodeId("Node ID cannot be empty".to_string()));
        }
        
        if Uuid::parse_str(node_id).is_err() {
            return Err(ValidationError::InvalidNodeId(
                "Node ID must be a valid UUID format".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate weight for graph edges
    pub fn validate_weight(weight: f32) -> Result<(), ValidationError> {
        if weight < 0.0 || weight > 10.0 {
            return Err(ValidationError::InvalidWeight(
                "Weight must be between 0.0 and 10.0".to_string()
            ));
        }
        
        if weight.is_nan() || weight.is_infinite() {
            return Err(ValidationError::InvalidWeight(
                "Weight must be a valid number".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate pagination limit
    pub fn validate_limit(limit: usize) -> Result<(), ValidationError> {
        if limit == 0 {
            return Err(ValidationError::InvalidLimit("Limit must be greater than 0".to_string()));
        }
        
        if limit > 1000 {
            return Err(ValidationError::InvalidLimit(
                "Limit cannot be greater than 1000".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate pagination offset
    pub fn validate_offset(offset: usize) -> Result<(), ValidationError> {
        if offset > 100000 {
            return Err(ValidationError::InvalidOffset(
                "Offset cannot be greater than 100,000".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate similarity threshold
    pub fn validate_similarity_threshold(threshold: f32) -> Result<(), ValidationError> {
        if threshold < 0.0 || threshold > 1.0 {
            return Err(ValidationError::InvalidWeight(
                "Similarity threshold must be between 0.0 and 1.0".to_string()
            ));
        }
        
        if threshold.is_nan() || threshold.is_infinite() {
            return Err(ValidationError::InvalidWeight(
                "Similarity threshold must be a valid number".to_string()
            ));
        }
        
        Ok(())
    }
}

/// Helper function to sanitize strings by removing potentially dangerous characters
pub fn sanitize_string(input: &str) -> String {
    input
        .chars()
        .filter(|c| !matches!(c, '<' | '>' | '"' | '\'' | '&' | '\0'))
        .collect::<String>()
        .trim()
        .to_string()
}

/// Helper function to sanitize HTML content
pub fn sanitize_html_content(input: &str) -> String {
    input
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
        .replace('&', "&amp;")
}

#[cfg(test)]
mod integration_tests;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_agent_id() {
        // Valid agent IDs
        assert!(MemoryValidator::validate_agent_id("agent123").is_ok());
        assert!(MemoryValidator::validate_agent_id("agent_test-123").is_ok());
        assert!(MemoryValidator::validate_agent_id("ABC_123-xyz").is_ok());
        
        // Invalid agent IDs
        assert!(MemoryValidator::validate_agent_id("").is_err());
        assert!(MemoryValidator::validate_agent_id("ab").is_err()); // too short
        assert!(MemoryValidator::validate_agent_id("agent@123").is_err()); // invalid character
        assert!(MemoryValidator::validate_agent_id("agent 123").is_err()); // space
        assert!(MemoryValidator::validate_agent_id(&"a".repeat(51)).is_err()); // too long
    }
    
    #[test]
    fn test_validate_memory_id() {
        // Valid UUID
        assert!(MemoryValidator::validate_memory_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
        
        // Invalid UUIDs
        assert!(MemoryValidator::validate_memory_id("").is_err());
        assert!(MemoryValidator::validate_memory_id("not-a-uuid").is_err());
        assert!(MemoryValidator::validate_memory_id("550e8400-e29b-41d4-a716").is_err());
    }
    
    #[test]
    fn test_validate_content() {
        // Valid content
        assert!(MemoryValidator::validate_content("Hello world").is_ok());
        assert!(MemoryValidator::validate_content("This is a longer piece of content with numbers 123 and symbols !@#").is_ok());
        
        // Invalid content
        assert!(MemoryValidator::validate_content("").is_err());
        assert!(MemoryValidator::validate_content("   ").is_err()); // only whitespace
        assert!(MemoryValidator::validate_content(&"a".repeat(10001)).is_err()); // too long
        assert!(MemoryValidator::validate_content("<script>alert('xss')</script>").is_err()); // XSS
    }
    
    #[test]
    fn test_validate_tags() {
        // Valid tags
        assert!(MemoryValidator::validate_tags(&["tag1".to_string(), "tag2".to_string()]).is_ok());
        assert!(MemoryValidator::validate_tags(&["important".to_string(), "work-related".to_string()]).is_ok());
        
        // Invalid tags
        assert!(MemoryValidator::validate_tags(&["".to_string()]).is_err()); // empty tag
        assert!(MemoryValidator::validate_tags(&["tag1".to_string(), "tag1".to_string()]).is_err()); // duplicate
        assert!(MemoryValidator::validate_tags(&vec!["tag".to_string(); 21]).is_err()); // too many
        assert!(MemoryValidator::validate_tags(&["a".repeat(51)]).is_err()); // tag too long
    }
    
    #[test]
    fn test_validate_metadata() {
        let mut metadata = HashMap::new();
        metadata.insert("key1".to_string(), "value1".to_string());
        metadata.insert("key_2".to_string(), "value with spaces".to_string());
        
        // Valid metadata
        assert!(MemoryValidator::validate_metadata(&metadata).is_ok());
        
        // Invalid metadata
        let mut invalid_metadata = HashMap::new();
        invalid_metadata.insert("".to_string(), "value".to_string()); // empty key
        assert!(MemoryValidator::validate_metadata(&invalid_metadata).is_err());
        
        let mut invalid_metadata2 = HashMap::new();
        invalid_metadata2.insert("key".to_string(), "a".repeat(1001)); // value too long
        assert!(MemoryValidator::validate_metadata(&invalid_metadata2).is_err());
    }
    
    #[test]
    fn test_validate_weights_and_limits() {
        // Valid values
        assert!(MemoryValidator::validate_weight(0.5).is_ok());
        assert!(MemoryValidator::validate_limit(10).is_ok());
        assert!(MemoryValidator::validate_offset(100).is_ok());
        
        // Invalid values
        assert!(MemoryValidator::validate_weight(-1.0).is_err());
        assert!(MemoryValidator::validate_weight(11.0).is_err());
        assert!(MemoryValidator::validate_limit(0).is_err());
        assert!(MemoryValidator::validate_limit(1001).is_err());
        assert!(MemoryValidator::validate_offset(100001).is_err());
    }
}