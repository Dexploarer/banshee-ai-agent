use super::memory::*;
use super::simple_memory::SimpleMemoryManager;
use super::neural_embeddings::NeuralEmbeddingService;
use crate::ai::{SecurityManager, SecurityMiddleware};
use crate::validation::{MemoryValidator, ValidationError};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as AsyncMutex;
use tauri::State;
use tracing::{info, warn, error};

// Additional types for knowledge graph endpoints
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphNode {
    pub id: String,
    pub node_type: String,
    pub name: String,
    pub properties: Option<HashMap<String, String>>,
    pub position: Option<(f32, f32)>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GraphEdge {
    pub id: String,
    pub from_node: String,
    pub to_node: String,
    pub relationship_type: String,
    pub weight: Option<f32>,
    pub properties: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KnowledgeGraphView {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub metadata: HashMap<String, String>,
}

// Global state for memory managers, neural embedding service, and security
pub struct MemoryState {
    managers: Arc<Mutex<HashMap<String, SimpleMemoryManager>>>,
    neural_embedding_service: Arc<AsyncMutex<Option<NeuralEmbeddingService>>>,
    security_middleware: Arc<SecurityMiddleware>,
}

impl MemoryState {
    pub fn new() -> Self {
        let security_manager = Arc::new(AsyncMutex::new(SecurityManager::new()));
        let security_middleware = Arc::new(SecurityMiddleware::new(security_manager));
        
        Self {
            managers: Arc::new(Mutex::new(HashMap::new())),
            neural_embedding_service: Arc::new(AsyncMutex::new(None)),
            security_middleware,
        }
    }

    pub fn get_security_middleware(&self) -> Arc<SecurityMiddleware> {
        self.security_middleware.clone()
    }

    pub fn get_or_create_manager(&self, agent_id: String) -> Result<SimpleMemoryManager, String> {
        let mut managers = self.managers.lock().unwrap();
        
        if !managers.contains_key(&agent_id) {
            let manager = SimpleMemoryManager::new(agent_id.clone())
                .map_err(|e| format!("Failed to create memory manager: {}", e))?;
            
            manager.initialize()
                .map_err(|e| format!("Failed to initialize memory manager: {}", e))?;
            
            managers.insert(agent_id.clone(), manager);
        }

        managers.get(&agent_id)
            .ok_or_else(|| "Failed to get memory manager".to_string())
            .cloned()
    }

    pub async fn initialize_neural_embedding_service(&self) -> Result<(), String> {
        let mut service_lock = self.neural_embedding_service.lock().await;
        if service_lock.is_none() {
            let service = NeuralEmbeddingService::new(None).await
                .map_err(|e| format!("Failed to create neural embedding service: {}", e))?;
            
            *service_lock = Some(service);
        }
        Ok(())
    }

    pub async fn get_neural_embedding_service(&self) -> Result<Arc<AsyncMutex<Option<NeuralEmbeddingService>>>, String> {
        self.initialize_neural_embedding_service().await?;
        Ok(self.neural_embedding_service.clone())
    }
}

// Helper function to convert ValidationError to String
fn validation_error_to_string(err: ValidationError) -> String {
    err.to_string()
}

// Tauri Commands

#[tauri::command]
pub async fn init_agent_memory(
    agent_id: String,
    state: State<'_, MemoryState>,
) -> Result<(), String> {
    info!("Initializing agent memory for: {}", agent_id);
    
    // Phase 1: Input Validation (Highest Priority)
    MemoryValidator::validate_agent_id(&agent_id)
        .map_err(validation_error_to_string)?;
    
    // Phase 2: Security Middleware (Rate limiting, sanitization, etc.)
    let security_middleware = state.get_security_middleware();
    if let Err(e) = security_middleware.validate_request(
        "memory_operations",
        &[agent_id.clone()],
        &[]
    ).await {
        return Err(e);
    }
    
    // Phase 3: Business Logic
    let _manager = state.get_or_create_manager(agent_id)?;
    state.initialize_neural_embedding_service().await?;
    Ok(())
}

#[tauri::command]
pub async fn save_agent_memory(
    agent_id: String,
    memory_type: String,
    content: String,
    tags: Option<Vec<String>>,
    metadata: Option<HashMap<String, String>>,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    info!("Saving agent memory for: {}", agent_id);
    
    // Phase 1: Input Validation (Highest Priority)
    MemoryValidator::validate_agent_id(&agent_id)
        .map_err(validation_error_to_string)?;
    MemoryValidator::validate_content(&content)
        .map_err(validation_error_to_string)?;
    
    if let Some(ref tags_vec) = tags {
        MemoryValidator::validate_tags(tags_vec)
            .map_err(validation_error_to_string)?;
    }
    
    if let Some(ref metadata_map) = metadata {
        MemoryValidator::validate_metadata(metadata_map)
            .map_err(validation_error_to_string)?;
    }
    
    // Phase 2: Security Middleware (Rate limiting, sanitization, etc.)
    let security_middleware = state.get_security_middleware();
    let inputs = vec![agent_id.clone(), memory_type.clone(), content.clone()];
    let validation_result = match security_middleware.validate_request(
        "memory_operations",
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_agent_id = &validation_result.sanitized_inputs[0];
    let sanitized_memory_type = &validation_result.sanitized_inputs[1];
    let sanitized_content = &validation_result.sanitized_inputs[2];
    let manager = state.get_or_create_manager(sanitized_agent_id.clone())?;
    
    // Parse memory type
    let memory_type_enum = match sanitized_memory_type.as_str() {
        "Conversation" => MemoryType::Conversation,
        "Task" => MemoryType::Task,
        "Learning" => MemoryType::Learning,
        "Context" => MemoryType::Context,
        "Tool" => MemoryType::Tool,
        "Error" => MemoryType::Error,
        "Success" => MemoryType::Success,
        "Pattern" => MemoryType::Pattern,
        _ => return Err("Invalid memory type".to_string()),
    };

    // Create memory with sanitized data
    let mut memory = AgentMemory::new(sanitized_agent_id.clone(), memory_type_enum, sanitized_content.clone());
    
    // Sanitize tags if provided
    if let Some(tags) = tags {
        let sanitized_tags: Vec<String> = tags.iter()
            .map(|tag| futures::executor::block_on(security_middleware.sanitize_input(tag)))
            .collect();
        memory = memory.with_tags(sanitized_tags);
    }
    
    if let Some(metadata) = metadata {
        memory = memory.with_metadata(metadata);
    }

    // Generate neural embedding if service is available
    let neural_embedding_service_lock = state.get_neural_embedding_service().await?;
    let mut neural_embedding_service = neural_embedding_service_lock.lock().await;
    if let Some(ref mut service) = *neural_embedding_service {
        match service.embed_memory(&memory).await {
            Ok(embedding) => {
                memory = memory.with_embedding(embedding);
                info!("Generated neural embedding for memory: {}", memory.id);
            }
            Err(e) => {
                // Log error but don't fail the operation
                info!("Failed to generate embedding for memory {}: {}", memory.id, e);
            }
        }
    }

    let memory_id = memory.id.clone();
    manager.save_memory(&memory)
        .map_err(|e| format!("Failed to save memory: {}", e))?;

    Ok(memory_id)
}

#[tauri::command]
pub async fn get_agent_memory(
    agent_id: String,
    memory_id: String,
    state: State<'_, MemoryState>,
) -> Result<Option<AgentMemory>, String> {
    info!("Getting agent memory: {} for agent: {}", memory_id, agent_id);
    
    // Phase 1: Input Validation (Highest Priority)
    MemoryValidator::validate_agent_id(&agent_id)
        .map_err(validation_error_to_string)?;
    MemoryValidator::validate_memory_id(&memory_id)
        .map_err(validation_error_to_string)?;
    
    // Phase 2: Security Middleware (Rate limiting, sanitization, etc.)
    let security_middleware = state.get_security_middleware();
    let inputs = vec![agent_id.clone(), memory_id.clone()];
    let validation_result = match security_middleware.validate_request(
        "memory_operations",
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    let sanitized_agent_id = &validation_result.sanitized_inputs[0];
    let sanitized_memory_id = &validation_result.sanitized_inputs[1];
    
    let manager = state.get_or_create_manager(sanitized_agent_id.clone())?;
    
    manager.get_memory(sanitized_memory_id)
        .map_err(|e| format!("Failed to get memory: {}", e))
}

#[tauri::command]
pub async fn search_agent_memories(
    agent_id: String,
    content_search: Option<String>,
    memory_types: Option<Vec<String>>,
    tags: Option<Vec<String>>,
    limit: Option<usize>,
    offset: Option<usize>,
    similarity_threshold: Option<f32>,
    state: State<'_, MemoryState>,
) -> Result<Vec<MemorySearchResult>, String> {
    info!("Searching agent memories for: {}", agent_id);
    
    // Phase 1: Input Validation (Highest Priority)
    MemoryValidator::validate_agent_id(&agent_id)
        .map_err(validation_error_to_string)?;
    
    if let Some(ref search_content) = content_search {
        MemoryValidator::validate_content(search_content)
            .map_err(validation_error_to_string)?;
    }
    
    if let Some(ref tags_vec) = tags {
        MemoryValidator::validate_tags(tags_vec)
            .map_err(validation_error_to_string)?;
    }
    
    if let Some(limit_val) = limit {
        MemoryValidator::validate_limit(limit_val)
            .map_err(validation_error_to_string)?;
    }
    
    if let Some(offset_val) = offset {
        MemoryValidator::validate_offset(offset_val)
            .map_err(validation_error_to_string)?;
    }
    
    if let Some(threshold) = similarity_threshold {
        MemoryValidator::validate_similarity_threshold(threshold)
            .map_err(validation_error_to_string)?;
    }
    
    // Phase 2: Security Middleware (Rate limiting, sanitization, etc.)
    let security_middleware = state.get_security_middleware();
    let mut inputs = vec![agent_id.clone()];
    if let Some(ref search) = content_search {
        inputs.push(search.clone());
    }
    
    let validation_result = match security_middleware.validate_request(
        "memory_operations",
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    let sanitized_agent_id = &validation_result.sanitized_inputs[0];
    let sanitized_content_search = if content_search.is_some() && validation_result.sanitized_inputs.len() > 1 {
        Some(validation_result.sanitized_inputs[1].clone())
    } else {
        None
    };
    
    let manager = state.get_or_create_manager(sanitized_agent_id.clone())?;
    
    // Convert memory types
    let memory_type_enums = memory_types.map(|types| {
        types.into_iter().filter_map(|t| {
            match t.as_str() {
                "Conversation" => Some(MemoryType::Conversation),
                "Task" => Some(MemoryType::Task),
                "Learning" => Some(MemoryType::Learning),
                "Context" => Some(MemoryType::Context),
                "Tool" => Some(MemoryType::Tool),
                "Error" => Some(MemoryType::Error),
                "Success" => Some(MemoryType::Success),
                "Pattern" => Some(MemoryType::Pattern),
                _ => None,
            }
        }).collect()
    });

    let query = MemoryQuery {
        agent_id: Some(sanitized_agent_id.clone()),
        memory_types: memory_type_enums,
        content_search: sanitized_content_search,
        tags,
        embedding: None, // Skip embeddings for now
        similarity_threshold,
        limit,
        offset,
        time_range: None,
    };

    manager.search_memories(&query)
        .map_err(|e| format!("Failed to search memories: {}", e))
}

#[tauri::command]
pub async fn save_shared_knowledge(
    knowledge_type: String,
    title: String,
    content: String,
    source_agent: String,
    tags: Option<Vec<String>>,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    info!("Saving shared knowledge from agent: {}", source_agent);
    
    // Phase 1: Input Validation (Highest Priority)
    MemoryValidator::validate_agent_id(&source_agent)
        .map_err(validation_error_to_string)?;
    MemoryValidator::validate_title(&title)
        .map_err(validation_error_to_string)?;
    MemoryValidator::validate_content(&content)
        .map_err(validation_error_to_string)?;
    
    if let Some(ref tags_vec) = tags {
        MemoryValidator::validate_tags(tags_vec)
            .map_err(validation_error_to_string)?;
    }
    
    // Phase 2: Security Middleware (Rate limiting, sanitization, etc.)
    let security_middleware = state.get_security_middleware();
    let inputs = vec![knowledge_type.clone(), title.clone(), content.clone(), source_agent.clone()];
    let validation_result = match security_middleware.validate_request(
        "knowledge_operations",
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    let sanitized_knowledge_type = &validation_result.sanitized_inputs[0];
    let sanitized_title = &validation_result.sanitized_inputs[1];
    let sanitized_content = &validation_result.sanitized_inputs[2];
    let sanitized_source_agent = &validation_result.sanitized_inputs[3];
    
    let manager = state.get_or_create_manager(sanitized_source_agent.clone())?;
    
    // Parse knowledge type
    let knowledge_type_enum = match sanitized_knowledge_type.as_str() {
        "Fact" => KnowledgeType::Fact,
        "Procedure" => KnowledgeType::Procedure,
        "Pattern" => KnowledgeType::Pattern,
        "Rule" => KnowledgeType::Rule,
        "Concept" => KnowledgeType::Concept,
        "Relationship" => KnowledgeType::Relationship,
        _ => return Err("Invalid knowledge type".to_string()),
    };

    let mut knowledge = SharedKnowledge::new(knowledge_type_enum, sanitized_title.clone(), sanitized_content.clone(), sanitized_source_agent.clone());
    
    if let Some(tags) = tags {
        // Sanitize tags
        let sanitized_tags: Vec<String> = tags.iter()
            .map(|tag| futures::executor::block_on(security_middleware.sanitize_input(tag)))
            .collect();
        knowledge.tags = sanitized_tags;
    }

    let knowledge_id = knowledge.id.clone();
    manager.save_shared_knowledge(&knowledge)
        .map_err(|e| format!("Failed to save shared knowledge: {}", e))?;

    Ok(knowledge_id)
}

#[tauri::command]
pub async fn add_knowledge_graph_node(
    node_type: String,
    name: String,
    properties: Option<HashMap<String, String>>,
    agent_id: String,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    info!("Adding knowledge graph node for agent: {}", agent_id);
    
    // Phase 1: Input Validation (Highest Priority)
    MemoryValidator::validate_agent_id(&agent_id)
        .map_err(validation_error_to_string)?;
    MemoryValidator::validate_node_name(&name)
        .map_err(validation_error_to_string)?;
    
    if let Some(ref props) = properties {
        MemoryValidator::validate_metadata(props)
            .map_err(validation_error_to_string)?;
    }
    
    // Phase 2: Security Middleware (Rate limiting, sanitization, etc.)
    let security_middleware = state.get_security_middleware();
    let inputs = vec![node_type.clone(), name.clone(), agent_id.clone()];
    let validation_result = match security_middleware.validate_request(
        "knowledge_graph_operations",
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    let sanitized_node_type = &validation_result.sanitized_inputs[0];
    let sanitized_name = &validation_result.sanitized_inputs[1];
    let sanitized_agent_id = &validation_result.sanitized_inputs[2];
    
    let manager = state.get_or_create_manager(sanitized_agent_id.clone())?;
    
    // Parse node type
    let node_type_enum = match sanitized_node_type.as_str() {
        "Agent" => NodeType::Agent,
        "Memory" => NodeType::Memory,
        "Concept" => NodeType::Concept,
        "Task" => NodeType::Task,
        "Tool" => NodeType::Tool,
        "Context" => NodeType::Context,
        "Pattern" => NodeType::Pattern,
        _ => return Err("Invalid node type".to_string()),
    };

    let mut node = KnowledgeNode::new(node_type_enum, sanitized_name.clone());
    
    if let Some(props) = properties {
        // Sanitize property values
        let sanitized_props: HashMap<String, String> = props.into_iter()
            .map(|(k, v)| {
                let sanitized_key = futures::executor::block_on(security_middleware.sanitize_input(&k));
                let sanitized_value = futures::executor::block_on(security_middleware.sanitize_input(&v));
                (sanitized_key, sanitized_value)
            })
            .collect();
        node.properties = sanitized_props;
    }

    let node_id = node.id.clone();
    manager.add_knowledge_node(&node)
        .map_err(|e| format!("Failed to add knowledge node: {}", e))?;

    Ok(node_id)
}

#[tauri::command]
pub async fn add_knowledge_graph_edge(
    from_node: String,
    to_node: String,
    relationship_type: String,
    weight: Option<f32>,
    properties: Option<HashMap<String, String>>,
    agent_id: String,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    info!("Adding knowledge graph edge for agent: {}", agent_id);
    
    // Phase 1: Input Validation (Highest Priority)
    MemoryValidator::validate_agent_id(&agent_id)
        .map_err(validation_error_to_string)?;
    MemoryValidator::validate_node_id(&from_node)
        .map_err(validation_error_to_string)?;
    MemoryValidator::validate_node_id(&to_node)
        .map_err(validation_error_to_string)?;
    
    if let Some(weight_val) = weight {
        MemoryValidator::validate_weight(weight_val)
            .map_err(validation_error_to_string)?;
    }
    
    if let Some(ref props) = properties {
        MemoryValidator::validate_metadata(props)
            .map_err(validation_error_to_string)?;
    }
    
    // Phase 2: Security Middleware (Rate limiting, sanitization, etc.)
    let security_middleware = state.get_security_middleware();
    let inputs = vec![from_node.clone(), to_node.clone(), relationship_type.clone(), agent_id.clone()];
    let validation_result = match security_middleware.validate_request(
        "knowledge_graph_operations",
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    let sanitized_from_node = &validation_result.sanitized_inputs[0];
    let sanitized_to_node = &validation_result.sanitized_inputs[1];
    let sanitized_relationship_type = &validation_result.sanitized_inputs[2];
    let sanitized_agent_id = &validation_result.sanitized_inputs[3];
    
    let manager = state.get_or_create_manager(sanitized_agent_id.clone())?;
    
    // Parse relationship type
    let relationship_type_enum = match sanitized_relationship_type.as_str() {
        "Knows" => RelationshipType::Knows,
        "Uses" => RelationshipType::Uses,
        "LearnedFrom" => RelationshipType::LearnedFrom,
        "CollaboratesWith" => RelationshipType::CollaboratesWith,
        "DependsOn" => RelationshipType::DependsOn,
        "Similar" => RelationshipType::Similar,
        "Opposite" => RelationshipType::Opposite,
        "CausedBy" => RelationshipType::CausedBy,
        "LeadsTo" => RelationshipType::LeadsTo,
        _ => return Err("Invalid relationship type".to_string()),
    };

    let mut edge = KnowledgeEdge::new(sanitized_from_node.clone(), sanitized_to_node.clone(), relationship_type_enum);
    
    if let Some(w) = weight {
        edge = edge.with_weight(w);
    }
    
    if let Some(props) = properties {
        // Sanitize property values
        let sanitized_props: HashMap<String, String> = props.into_iter()
            .map(|(k, v)| {
                let sanitized_key = futures::executor::block_on(security_middleware.sanitize_input(&k));
                let sanitized_value = futures::executor::block_on(security_middleware.sanitize_input(&v));
                (sanitized_key, sanitized_value)
            })
            .collect();
        edge.properties = sanitized_props;
    }

    let edge_id = edge.id.clone();
    manager.add_knowledge_edge(&edge)
        .map_err(|e| format!("Failed to add knowledge edge: {}", e))?;

    Ok(edge_id)
}

#[tauri::command]
pub async fn backup_agent_memories(
    agent_id: String,
    backup_name: Option<String>,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    info!("Backing up agent memories for: {}", agent_id);
    
    // Phase 1: Input Validation (Highest Priority)
    MemoryValidator::validate_agent_id(&agent_id)
        .map_err(validation_error_to_string)?;
    
    if let Some(ref name) = backup_name {
        // Basic validation for backup names (should be safe file names)
        if name.trim().is_empty() || name.len() > 100 || name.contains('/') || name.contains('\\') {
            return Err("Invalid backup name".to_string());
        }
    }
    
    // Phase 2: Security Middleware (Rate limiting, sanitization, etc.)
    let security_middleware = state.get_security_middleware();
    let mut inputs = vec![agent_id.clone()];
    if let Some(ref name) = backup_name {
        inputs.push(name.clone());
    }
    
    let validation_result = match security_middleware.validate_request(
        "backup_operations", 
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    let sanitized_agent_id = &validation_result.sanitized_inputs[0];
    let sanitized_backup_name = if backup_name.is_some() && validation_result.sanitized_inputs.len() > 1 {
        Some(validation_result.sanitized_inputs[1].clone())
    } else {
        None
    };
    
    let manager = state.get_or_create_manager(sanitized_agent_id.clone())?;
    
    let backup_filename = sanitized_backup_name.unwrap_or_else(|| {
        format!("agent_{}_backup_{}.db", sanitized_agent_id, chrono::Utc::now().format("%Y%m%d_%H%M%S"))
    });
    
    let backup_dir = dirs::home_dir()
        .ok_or_else(|| "Could not find home directory".to_string())?
        .join(".agent-memory")
        .join("backups");
    
    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;
    
    let backup_path = backup_dir.join(&backup_filename);
    
    manager.backup_agent_memory(&backup_path)
        .map_err(|e| format!("Failed to backup memories: {}", e))?;

    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn search_shared_knowledge(
    query: String,
    knowledge_type: Option<String>,
    limit: Option<i32>,
    offset: Option<i32>,
    state: State<'_, MemoryState>,
) -> Result<Vec<SharedKnowledge>, String> {
    info!("Searching shared knowledge with query: {}", query);
    
    // Phase 1: Input Validation
    if query.trim().is_empty() {
        return Err("Query cannot be empty".to_string());
    }
    
    // Phase 2: Security Middleware
    let security_middleware = state.get_security_middleware();
    let inputs = vec![query.clone()];
    let validation_result = match security_middleware.validate_request(
        "search_shared_knowledge",
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    let sanitized_query = &validation_result.sanitized_inputs[0];
    let final_limit = limit.unwrap_or(50).min(100); // Cap at 100
    let final_offset = offset.unwrap_or(0).max(0);
    
    // For now, return empty results until we implement a shared knowledge store
    // In a full implementation, this would search across a global knowledge database
    info!("Shared knowledge search not yet implemented - returning empty results");
    Ok(vec![])
}

#[tauri::command]
pub async fn get_knowledge_graph(
    agent_id: String,
    depth: Option<usize>,
    limit: Option<i32>,
    state: State<'_, MemoryState>,
) -> Result<KnowledgeGraphView, String> {
    info!("Getting knowledge graph for agent: {}", agent_id);
    
    // Phase 1: Input Validation
    MemoryValidator::validate_agent_id(&agent_id)
        .map_err(validation_error_to_string)?;
    
    // Phase 2: Security Middleware
    let security_middleware = state.get_security_middleware();
    let inputs = vec![agent_id.clone()];
    let validation_result = match security_middleware.validate_request(
        "get_knowledge_graph",
        &inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    let sanitized_agent_id = &validation_result.sanitized_inputs[0];
    let final_depth = depth.unwrap_or(3).min(10); // Cap at 10 levels
    let final_limit = limit.unwrap_or(100).min(500); // Cap at 500 nodes
    
    let manager = state.get_or_create_manager(sanitized_agent_id.clone())?;
    
    // Get all knowledge nodes and edges for the agent
    let memories = manager.search_memories(&MemoryQuery {
        agent_id: Some(sanitized_agent_id.clone()),
        memory_types: None,
        content_search: None,
        tags: None,
        embedding: None,
        similarity_threshold: None,
        limit: Some(final_limit as usize),
        offset: Some(0),
        time_range: None,
    }).map_err(|e| format!("Failed to get memories: {}", e))?;
    
    // For now, create a basic graph view from memories
    // In a full implementation, this would query dedicated graph storage
    let mut nodes = Vec::new();
    let mut edges = Vec::new();
    
    for memory_result in memories.iter().take(final_limit as usize) {
        let memory = &memory_result.memory;
        
        // Create a node for each memory
        let node = GraphNode {
            id: memory.id.clone(),
            node_type: memory.memory_type.to_string(),
            name: memory.content.chars().take(50).collect::<String>(),
            properties: Some(memory.metadata.clone()),
            position: None, // Will be calculated by frontend
        };
        nodes.push(node);
        
        // Create edges based on tags (simple relationship inference)
        for tag in &memory.tags {
            // Find other memories with the same tag to create edges
            for other_result in memories.iter() {
                let other_memory = &other_result.memory;
                if other_memory.id != memory.id {
                    if other_memory.tags.contains(tag) && edges.len() < 200 {
                        let edge = GraphEdge {
                            id: format!("{}_{}", memory.id, other_memory.id),
                            from_node: memory.id.clone(),
                            to_node: other_memory.id.clone(),
                            relationship_type: format!("shared_tag_{}", tag),
                            weight: Some(0.5),
                            properties: Some(HashMap::from([
                                ("tag".to_string(), tag.clone()),
                                ("type".to_string(), "semantic".to_string()),
                            ])),
                        };
                        edges.push(edge);
                    }
                }
            }
        }
    }
    
    // Remove duplicate edges
    edges.sort_by(|a, b| a.id.cmp(&b.id));
    edges.dedup_by(|a, b| a.id == b.id);
    
    // Get counts before moving
    let node_count = nodes.len();
    let edge_count = edges.len();
    
    Ok(KnowledgeGraphView {
        nodes,
        edges,
        metadata: HashMap::from([
            ("agent_id".to_string(), sanitized_agent_id.clone()),
            ("node_count".to_string(), node_count.to_string()),
            ("edge_count".to_string(), edge_count.to_string()),
            ("depth".to_string(), final_depth.to_string()),
        ]),
    })
}

