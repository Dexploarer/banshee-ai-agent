use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GraphValidationError {
    #[error("Invalid agent ID: {0}")]
    InvalidAgentId(String),
    
    #[error("Invalid node ID: {0}")]
    InvalidNodeId(String),
    
    #[error("Invalid edge ID: {0}")]
    InvalidEdgeId(String),
    
    #[error("Invalid node name: {0}")]
    InvalidNodeName(String),
    
    #[error("Invalid node type: {0}")]
    InvalidNodeType(String),
    
    #[error("Invalid relationship type: {0}")]
    InvalidRelationshipType(String),
    
    #[error("Invalid weight: {0}")]
    InvalidWeight(String),
    
    #[error("Invalid properties: {0}")]
    InvalidProperties(String),
    
    #[error("Invalid depth: {0}")]
    InvalidDepth(String),
    
    #[error("Invalid limit: {0}")]
    InvalidLimit(String),
}

pub struct GraphValidator;

impl GraphValidator {
    /// Validate agent ID format
    pub fn validate_agent_id(agent_id: &str) -> Result<(), GraphValidationError> {
        if agent_id.trim().is_empty() {
            return Err(GraphValidationError::InvalidAgentId(
                "Agent ID cannot be empty".to_string()
            ));
        }
        
        if agent_id.len() > 256 {
            return Err(GraphValidationError::InvalidAgentId(
                "Agent ID exceeds maximum length of 256 characters".to_string()
            ));
        }
        
        // Check for invalid characters
        if !agent_id.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '_' || c == '.') {
            return Err(GraphValidationError::InvalidAgentId(
                "Agent ID contains invalid characters".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate node ID format (UUID)
    pub fn validate_node_id(node_id: &str) -> Result<(), GraphValidationError> {
        if node_id.trim().is_empty() {
            return Err(GraphValidationError::InvalidNodeId(
                "Node ID cannot be empty".to_string()
            ));
        }
        
        // Basic UUID format check (8-4-4-4-12)
        let parts: Vec<&str> = node_id.split('-').collect();
        if parts.len() != 5 {
            return Err(GraphValidationError::InvalidNodeId(
                "Node ID must be a valid UUID".to_string()
            ));
        }
        
        let expected_lengths = [8, 4, 4, 4, 12];
        for (i, part) in parts.iter().enumerate() {
            if part.len() != expected_lengths[i] {
                return Err(GraphValidationError::InvalidNodeId(
                    "Node ID must be a valid UUID".to_string()
                ));
            }
            
            if !part.chars().all(|c| c.is_ascii_hexdigit()) {
                return Err(GraphValidationError::InvalidNodeId(
                    "Node ID must contain only hexadecimal characters".to_string()
                ));
            }
        }
        
        Ok(())
    }
    
    /// Validate edge ID format (UUID)
    pub fn validate_edge_id(edge_id: &str) -> Result<(), GraphValidationError> {
        // Edge IDs follow the same format as node IDs
        Self::validate_node_id(edge_id).map_err(|_| {
            GraphValidationError::InvalidEdgeId("Edge ID must be a valid UUID".to_string())
        })
    }
    
    /// Validate node name
    pub fn validate_node_name(name: &str) -> Result<(), GraphValidationError> {
        if name.trim().is_empty() {
            return Err(GraphValidationError::InvalidNodeName(
                "Node name cannot be empty".to_string()
            ));
        }
        
        if name.len() > 256 {
            return Err(GraphValidationError::InvalidNodeName(
                "Node name exceeds maximum length of 256 characters".to_string()
            ));
        }
        
        // Check for control characters
        if name.chars().any(|c| c.is_control()) {
            return Err(GraphValidationError::InvalidNodeName(
                "Node name contains control characters".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate node type
    pub fn validate_node_type(node_type: &str) -> Result<(), GraphValidationError> {
        const VALID_NODE_TYPES: &[&str] = &[
            "Agent", "Memory", "Concept", "Task", "Tool", "Context", "Pattern"
        ];
        
        if !VALID_NODE_TYPES.contains(&node_type) {
            return Err(GraphValidationError::InvalidNodeType(
                format!("Invalid node type: {}. Must be one of: {:?}", node_type, VALID_NODE_TYPES)
            ));
        }
        
        Ok(())
    }
    
    /// Validate relationship type
    pub fn validate_relationship_type(rel_type: &str) -> Result<(), GraphValidationError> {
        const VALID_RELATIONSHIP_TYPES: &[&str] = &[
            "Knows", "Uses", "LearnedFrom", "CollaboratesWith", 
            "DependsOn", "Similar", "Opposite", "CausedBy", "LeadsTo"
        ];
        
        if !VALID_RELATIONSHIP_TYPES.contains(&rel_type) {
            return Err(GraphValidationError::InvalidRelationshipType(
                format!("Invalid relationship type: {}. Must be one of: {:?}", 
                    rel_type, VALID_RELATIONSHIP_TYPES)
            ));
        }
        
        Ok(())
    }
    
    /// Validate weight value
    pub fn validate_weight(weight: f32) -> Result<(), GraphValidationError> {
        if weight < 0.0 || weight > 1.0 {
            return Err(GraphValidationError::InvalidWeight(
                "Weight must be between 0.0 and 1.0".to_string()
            ));
        }
        
        if weight.is_nan() || weight.is_infinite() {
            return Err(GraphValidationError::InvalidWeight(
                "Weight must be a valid number".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate properties map
    pub fn validate_properties(properties: &HashMap<String, String>) -> Result<(), GraphValidationError> {
        if properties.len() > 100 {
            return Err(GraphValidationError::InvalidProperties(
                "Properties map exceeds maximum of 100 entries".to_string()
            ));
        }
        
        for (key, value) in properties {
            // Validate key
            if key.trim().is_empty() {
                return Err(GraphValidationError::InvalidProperties(
                    "Property key cannot be empty".to_string()
                ));
            }
            
            if key.len() > 128 {
                return Err(GraphValidationError::InvalidProperties(
                    "Property key exceeds maximum length of 128 characters".to_string()
                ));
            }
            
            if !key.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-' || c == '.') {
                return Err(GraphValidationError::InvalidProperties(
                    format!("Property key '{}' contains invalid characters", key)
                ));
            }
            
            // Validate value
            if value.len() > 1024 {
                return Err(GraphValidationError::InvalidProperties(
                    format!("Property value for key '{}' exceeds maximum length of 1024 characters", key)
                ));
            }
            
            if value.chars().any(|c| c.is_control() && c != '\n' && c != '\t') {
                return Err(GraphValidationError::InvalidProperties(
                    format!("Property value for key '{}' contains control characters", key)
                ));
            }
        }
        
        Ok(())
    }
    
    /// Validate search depth
    pub fn validate_depth(depth: usize) -> Result<(), GraphValidationError> {
        if depth == 0 {
            return Err(GraphValidationError::InvalidDepth(
                "Depth must be at least 1".to_string()
            ));
        }
        
        if depth > 10 {
            return Err(GraphValidationError::InvalidDepth(
                "Depth cannot exceed 10".to_string()
            ));
        }
        
        Ok(())
    }
    
    /// Validate query limit
    pub fn validate_limit(limit: usize) -> Result<(), GraphValidationError> {
        if limit == 0 {
            return Err(GraphValidationError::InvalidLimit(
                "Limit must be at least 1".to_string()
            ));
        }
        
        if limit > 1000 {
            return Err(GraphValidationError::InvalidLimit(
                "Limit cannot exceed 1000".to_string()
            ));
        }
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_agent_id() {
        // Valid cases
        assert!(GraphValidator::validate_agent_id("agent-123").is_ok());
        assert!(GraphValidator::validate_agent_id("test_agent.001").is_ok());
        
        // Invalid cases
        assert!(GraphValidator::validate_agent_id("").is_err());
        assert!(GraphValidator::validate_agent_id("agent@123").is_err());
        assert!(GraphValidator::validate_agent_id(&"a".repeat(257)).is_err());
    }
    
    #[test]
    fn test_validate_node_id() {
        // Valid UUID
        assert!(GraphValidator::validate_node_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
        
        // Invalid cases
        assert!(GraphValidator::validate_node_id("").is_err());
        assert!(GraphValidator::validate_node_id("not-a-uuid").is_err());
        assert!(GraphValidator::validate_node_id("550e8400-e29b-41d4-a716").is_err());
    }
    
    #[test]
    fn test_validate_weight() {
        // Valid cases
        assert!(GraphValidator::validate_weight(0.0).is_ok());
        assert!(GraphValidator::validate_weight(0.5).is_ok());
        assert!(GraphValidator::validate_weight(1.0).is_ok());
        
        // Invalid cases
        assert!(GraphValidator::validate_weight(-0.1).is_err());
        assert!(GraphValidator::validate_weight(1.1).is_err());
        assert!(GraphValidator::validate_weight(f32::NAN).is_err());
        assert!(GraphValidator::validate_weight(f32::INFINITY).is_err());
    }
}