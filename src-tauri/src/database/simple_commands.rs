use super::memory::*;
use super::simple_memory::SimpleMemoryManager;
use super::embeddings::EmbeddingService;
use anyhow::Result;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::State;

// Global state for memory managers and embedding service
pub struct MemoryState {
    managers: Arc<Mutex<HashMap<String, SimpleMemoryManager>>>,
    embedding_service: Arc<Mutex<Option<EmbeddingService>>>,
}

impl MemoryState {
    pub fn new() -> Self {
        Self {
            managers: Arc::new(Mutex::new(HashMap::new())),
            embedding_service: Arc::new(Mutex::new(None)),
        }
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

    pub fn initialize_embedding_service(&self) -> Result<(), String> {
        let mut service_lock = self.embedding_service.lock().unwrap();
        if service_lock.is_none() {
            let service = EmbeddingService::new()
                .map_err(|e| format!("Failed to create embedding service: {}", e))?;
            
            // Initialize service synchronously for simplicity
            *service_lock = Some(service);
        }
        Ok(())
    }

    pub fn get_embedding_service(&self) -> Result<Arc<Mutex<Option<EmbeddingService>>>, String> {
        self.initialize_embedding_service()?;
        Ok(self.embedding_service.clone())
    }
}

// Tauri Commands

#[tauri::command]
pub fn init_agent_memory(
    agent_id: String,
    state: State<'_, MemoryState>,
) -> Result<(), String> {
    let _manager = state.get_or_create_manager(agent_id)?;
    state.initialize_embedding_service()?;
    Ok(())
}

#[tauri::command]
pub fn save_agent_memory(
    agent_id: String,
    memory_type: String,
    content: String,
    tags: Option<Vec<String>>,
    metadata: Option<HashMap<String, String>>,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    let manager = state.get_or_create_manager(agent_id.clone())?;
    
    // Parse memory type
    let memory_type_enum = match memory_type.as_str() {
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

    // Create memory
    let mut memory = AgentMemory::new(agent_id, memory_type_enum, content.clone());
    
    if let Some(tags) = tags {
        memory = memory.with_tags(tags);
    }
    
    if let Some(metadata) = metadata {
        memory = memory.with_metadata(metadata);
    }

    // Generate embedding if service is available
    let embedding_service_lock = state.get_embedding_service()?;
    let embedding_service = embedding_service_lock.lock().unwrap();
    if let Some(ref service) = *embedding_service {
        // For now, we'll skip embeddings to avoid async issues
        // In a real implementation, you'd want to handle this properly
    }

    let memory_id = memory.id.clone();
    manager.save_memory(&memory)
        .map_err(|e| format!("Failed to save memory: {}", e))?;

    Ok(memory_id)
}

#[tauri::command]
pub fn get_agent_memory(
    agent_id: String,
    memory_id: String,
    state: State<'_, MemoryState>,
) -> Result<Option<AgentMemory>, String> {
    let manager = state.get_or_create_manager(agent_id)?;
    
    manager.get_memory(&memory_id)
        .map_err(|e| format!("Failed to get memory: {}", e))
}

#[tauri::command]
pub fn search_agent_memories(
    agent_id: String,
    content_search: Option<String>,
    memory_types: Option<Vec<String>>,
    tags: Option<Vec<String>>,
    limit: Option<usize>,
    similarity_threshold: Option<f32>,
    state: State<'_, MemoryState>,
) -> Result<Vec<MemorySearchResult>, String> {
    let manager = state.get_or_create_manager(agent_id.clone())?;
    
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
        agent_id: Some(agent_id),
        memory_types: memory_type_enums,
        content_search,
        tags,
        embedding: None, // Skip embeddings for now
        similarity_threshold,
        limit,
        time_range: None,
    };

    manager.search_memories(&query)
        .map_err(|e| format!("Failed to search memories: {}", e))
}

#[tauri::command]
pub fn save_shared_knowledge(
    knowledge_type: String,
    title: String,
    content: String,
    source_agent: String,
    tags: Option<Vec<String>>,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    let manager = state.get_or_create_manager(source_agent.clone())?;
    
    // Parse knowledge type
    let knowledge_type_enum = match knowledge_type.as_str() {
        "Fact" => KnowledgeType::Fact,
        "Procedure" => KnowledgeType::Procedure,
        "Pattern" => KnowledgeType::Pattern,
        "Rule" => KnowledgeType::Rule,
        "Concept" => KnowledgeType::Concept,
        "Relationship" => KnowledgeType::Relationship,
        _ => return Err("Invalid knowledge type".to_string()),
    };

    let mut knowledge = SharedKnowledge::new(knowledge_type_enum, title, content.clone(), source_agent);
    
    if let Some(tags) = tags {
        knowledge.tags = tags;
    }

    let knowledge_id = knowledge.id.clone();
    manager.save_shared_knowledge(&knowledge)
        .map_err(|e| format!("Failed to save shared knowledge: {}", e))?;

    Ok(knowledge_id)
}

#[tauri::command]
pub fn add_knowledge_graph_node(
    node_type: String,
    name: String,
    properties: Option<HashMap<String, String>>,
    agent_id: String,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    let manager = state.get_or_create_manager(agent_id)?;
    
    // Parse node type
    let node_type_enum = match node_type.as_str() {
        "Agent" => NodeType::Agent,
        "Memory" => NodeType::Memory,
        "Concept" => NodeType::Concept,
        "Task" => NodeType::Task,
        "Tool" => NodeType::Tool,
        "Context" => NodeType::Context,
        "Pattern" => NodeType::Pattern,
        _ => return Err("Invalid node type".to_string()),
    };

    let mut node = KnowledgeNode::new(node_type_enum, name.clone());
    
    if let Some(props) = properties {
        node.properties = props;
    }

    let node_id = node.id.clone();
    manager.add_knowledge_node(&node)
        .map_err(|e| format!("Failed to add knowledge node: {}", e))?;

    Ok(node_id)
}

#[tauri::command]
pub fn add_knowledge_graph_edge(
    from_node: String,
    to_node: String,
    relationship_type: String,
    weight: Option<f32>,
    properties: Option<HashMap<String, String>>,
    agent_id: String,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    let manager = state.get_or_create_manager(agent_id)?;
    
    // Parse relationship type
    let relationship_type_enum = match relationship_type.as_str() {
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

    let mut edge = KnowledgeEdge::new(from_node, to_node, relationship_type_enum);
    
    if let Some(w) = weight {
        edge = edge.with_weight(w);
    }
    
    if let Some(props) = properties {
        edge.properties = props;
    }

    let edge_id = edge.id.clone();
    manager.add_knowledge_edge(&edge)
        .map_err(|e| format!("Failed to add knowledge edge: {}", e))?;

    Ok(edge_id)
}

#[tauri::command]
pub fn backup_agent_memories(
    agent_id: String,
    backup_name: Option<String>,
    state: State<'_, MemoryState>,
) -> Result<String, String> {
    let manager = state.get_or_create_manager(agent_id.clone())?;
    
    let backup_filename = backup_name.unwrap_or_else(|| {
        format!("agent_{}_backup_{}.db", agent_id, chrono::Utc::now().format("%Y%m%d_%H%M%S"))
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