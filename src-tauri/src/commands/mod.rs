use serde::Serialize;
use tauri::State;
use crate::ai::AIState;
use crate::mcp::MCPServer;

#[derive(Debug, Serialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub disk_usage: f32,
    pub active_agents: u32,
    pub active_mcp_connections: u32,
    pub total_messages: u64,
    pub uptime: u64,
}

#[derive(Debug, Serialize)]
pub struct ApiKey {
    pub provider: String,
    pub api_key: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_used: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Serialize)]
pub struct AgentSessionData {
    pub agent_id: String,
    pub agent: crate::ai::Agent,
    pub conversation_id: Option<String>,
    pub conversation: Option<crate::ai::Conversation>,
}

#[tauri::command]
pub async fn get_system_stats_command() -> Result<SystemStats, String> {
    // Mock implementation for now
    Ok(SystemStats {
        cpu_usage: 23.5,
        memory_usage: 45.2,
        disk_usage: 67.8,
        active_agents: 2,
        active_mcp_connections: 3,
        total_messages: 127,
        uptime: 3600,
    })
}

#[tauri::command]
pub async fn get_api_keys_command(
    state: State<'_, AIState>
) -> Result<Vec<ApiKey>, String> {
    // Get API keys from the state
    let providers = vec!["openai", "anthropic", "google"];
    let mut keys = Vec::new();
    
    for provider in providers {
        if let Ok(Some(_)) = state.storage.get_api_key(provider) {
            keys.push(ApiKey {
                provider: provider.to_string(),
                api_key: "sk-...".to_string(), // Masked for security
                created_at: chrono::Utc::now(),
                last_used: None,
            });
        }
    }
    
    Ok(keys)
}

#[tauri::command]
pub async fn delete_api_key_command(
    provider: String,
    state: State<'_, AIState>
) -> Result<(), String> {
    state.storage.remove_api_key(&provider)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_mcp_servers_command() -> Result<Vec<MCPServer>, String> {
    // Mock implementation
    Ok(vec![
        MCPServer {
            id: "server1".to_string(),
            name: "File System Server".to_string(),
            description: Some("Access to local file system".to_string()),
            status: "connected".to_string(),
            version: "1.0.0".to_string(),
            features: vec!["tools".to_string(), "resources".to_string()],
        },
        MCPServer {
            id: "server2".to_string(),
            name: "Web Browser Server".to_string(),
            description: Some("Web browsing capabilities".to_string()),
            status: "disconnected".to_string(),
            version: "1.0.0".to_string(),
            features: vec!["tools".to_string()],
        },
    ])
}

#[tauri::command]
pub async fn connect_mcp_server_command(server_id: String) -> Result<(), String> {
    // Mock implementation
    println!("Connecting to MCP server: {}", server_id);
    Ok(())
}

#[tauri::command]
pub async fn disconnect_mcp_server_command(server_id: String) -> Result<(), String> {
    // Mock implementation
    println!("Disconnecting from MCP server: {}", server_id);
    Ok(())
}

#[tauri::command]
pub async fn test_mcp_connection_command(server_id: String) -> Result<bool, String> {
    // Mock implementation
    println!("Testing connection to MCP server: {}", server_id);
    Ok(true)
}

#[tauri::command]
pub async fn get_active_sessions_command() -> Result<Vec<AgentSessionData>, String> {
    // Mock implementation
    Ok(vec![])
}

#[tauri::command]
pub async fn create_agent_session_command(agent_id: String) -> Result<AgentSessionData, String> {
    // Mock implementation
    Ok(AgentSessionData {
        agent_id: agent_id.clone(),
        agent: crate::ai::Agent {
            id: agent_id,
            name: "Assistant".to_string(),
            description: "General purpose AI assistant".to_string(),
            model: "gpt-4".to_string(),
            tools: vec![],
            system_prompt: None,
            temperature: None,
            max_tokens: None,
        },
        conversation_id: Some("conv-123".to_string()),
        conversation: None,
    })
}

#[tauri::command]
pub async fn close_agent_session_command(agent_id: String) -> Result<(), String> {
    // Mock implementation
    println!("Closing agent session: {}", agent_id);
    Ok(())
}

#[tauri::command]
pub async fn get_conversation_history_command(
    _conversation_id: String
) -> Result<Vec<crate::ai::Message>, String> {
    // Mock implementation
    Ok(vec![])
}