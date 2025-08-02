use tracing::{info, error, Level};
use tracing_subscriber;

mod ai;
mod mcp;
mod commands;
mod database;

use ai::{
    AIState,
    store_api_key_command, get_api_key_command, remove_api_key_command, list_providers_command,
    read_file_command, write_file_command, list_files_command,
    execute_command, http_request_command, show_notification_command,
    set_setting_command, get_setting_command, get_rate_limit_stats,
};

use mcp::{
    start_mcp_process, stop_mcp_process, send_mcp_message,
    connect_local_mcp, disconnect_local_mcp, send_local_mcp_message,
    get_agent_configs, get_conversation_history, get_system_status, list_workspace_files,
    execute_agent_tool, read_file_tool, write_file_tool, list_files_tool, execute_command_tool,
    MCPProcessInfo,
};

use commands::{
    get_system_stats_command, get_api_keys_command, delete_api_key_command,
    get_mcp_servers_command, connect_mcp_server_command, disconnect_mcp_server_command,
    test_mcp_connection_command, get_active_sessions_command, create_agent_session_command,
    close_agent_session_command, get_conversation_history_command,
};

use database::{
    init_database, save_conversation, save_message, get_conversations,
    get_messages, search_conversations, delete_conversation,
};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    info!(name = %name, "Processing greet command");
    
    if name.trim().is_empty() {
        error!("Empty name provided to greet command");
        return "Hello! Please provide a valid name.".to_string();
    }
    
    let response = format!("Hello, {}! You've been greeted from Rust!", name);
    info!(response = %response, "Greet command completed successfully");
    response
}

fn setup_logging() {
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();
    
    info!("Logging system initialized");
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    setup_logging();
    info!("Starting Tauri application with AI capabilities");
    
    // Initialize AI state
    let ai_state = match AIState::new() {
        Ok(state) => state,
        Err(e) => {
            error!("Failed to initialize AI state: {}", e);
            panic!("Could not start application");
        }
    };
    
    // Initialize MCP process map
    let mcp_processes: Arc<Mutex<HashMap<u32, MCPProcessInfo>>> = Arc::new(Mutex::new(HashMap::new()));
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage(ai_state)
        .manage(mcp_processes)
        .invoke_handler(tauri::generate_handler![
            greet,
            // API Key Management
            store_api_key_command,
            get_api_key_command,
            remove_api_key_command,
            list_providers_command,
            // File System
            read_file_command,
            write_file_command,
            list_files_command,
            // System
            execute_command,
            // HTTP
            http_request_command,
            // UI
            show_notification_command,
            // Settings
            set_setting_command,
            get_setting_command,
            // Security
            get_rate_limit_stats,
            // MCP Process Management
            start_mcp_process,
            stop_mcp_process,
            send_mcp_message,
            connect_local_mcp,
            disconnect_local_mcp,
            send_local_mcp_message,
            // MCP Server Resources
            get_agent_configs,
            get_conversation_history,
            get_system_status,
            list_workspace_files,
            // MCP Tools
            execute_agent_tool,
            read_file_tool,
            write_file_tool,
            list_files_tool,
            execute_command_tool,
            // New Dashboard commands
            get_system_stats_command,
            get_api_keys_command,
            delete_api_key_command,
            get_mcp_servers_command,
            connect_mcp_server_command,
            disconnect_mcp_server_command,
            test_mcp_connection_command,
            get_active_sessions_command,
            create_agent_session_command,
            close_agent_session_command,
            get_conversation_history_command,
            // Database commands
            init_database,
            save_conversation,
            save_message,
            get_conversations,
            get_messages,
            search_conversations,
            delete_conversation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
