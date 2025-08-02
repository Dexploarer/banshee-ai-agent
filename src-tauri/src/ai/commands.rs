use super::{SecurityManager, StorageManager, HttpClientManager, HttpRequest};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex;
use tracing::{info, warn, error};
use anyhow::Result;

// Shared state for our AI system
pub struct AIState {
    pub security: Mutex<SecurityManager>,
    pub storage: StorageManager,
    pub http_client: HttpClientManager,
}

impl AIState {
    pub fn new() -> Result<Self> {
        Ok(Self {
            security: Mutex::new(SecurityManager::new()),
            storage: StorageManager::new()?,
            http_client: HttpClientManager::new()?,
        })
    }
}

#[derive(Serialize, Deserialize)]
pub struct CommandResult {
    pub stdout: String,
    pub stderr: String,
    pub status: i32,
}

#[derive(Serialize, Deserialize)]
pub struct NotificationRequest {
    pub title: String,
    pub message: String,
    pub r#type: String,
}

// API Key Management Commands
#[tauri::command]
pub async fn store_api_key_command(
    provider: String,
    key: String,
    state: State<'_, AIState>,
) -> Result<(), String> {
    info!("Storing API key for provider: {}", provider);
    
    state.storage
        .store_api_key(&provider, &key)
        .map_err(|e| {
            error!("Failed to store API key: {}", e);
            format!("Failed to store API key: {}", e)
        })
}

#[tauri::command]
pub async fn get_api_key_command(
    provider: String,
    state: State<'_, AIState>,
) -> Result<Option<String>, String> {
    info!("Retrieving API key for provider: {}", provider);
    
    state.storage
        .get_api_key(&provider)
        .map_err(|e| {
            error!("Failed to get API key: {}", e);
            format!("Failed to get API key: {}", e)
        })
}

#[tauri::command]
pub async fn remove_api_key_command(
    provider: String,
    state: State<'_, AIState>,
) -> Result<bool, String> {
    info!("Removing API key for provider: {}", provider);
    
    state.storage
        .remove_api_key(&provider)
        .map_err(|e| {
            error!("Failed to remove API key: {}", e);
            format!("Failed to remove API key: {}", e)
        })
}

#[tauri::command]
pub async fn list_providers_command(
    state: State<'_, AIState>,
) -> Result<Vec<String>, String> {
    info!("Listing available providers");
    
    state.storage
        .list_providers()
        .map_err(|e| {
            error!("Failed to list providers: {}", e);
            format!("Failed to list providers: {}", e)
        })
}

// File System Commands
#[tauri::command]
pub async fn read_file_command(
    path: String,
    state: State<'_, AIState>,
) -> Result<String, String> {
    info!("Reading file: {}", path);
    
    // Security validation
    let security = state.security.lock().await;
    if !security.validate_file_path(&path) {
        return Err("Access to this file path is not allowed".to_string());
    }
    drop(security);

    fs::read_to_string(&path)
        .map_err(|e| {
            error!("Failed to read file {}: {}", path, e);
            format!("Failed to read file: {}", e)
        })
}

#[tauri::command]
pub async fn write_file_command(
    path: String,
    content: String,
    state: State<'_, AIState>,
) -> Result<(), String> {
    info!("Writing file: {}", path);
    
    // Security validation
    let security = state.security.lock().await;
    if !security.validate_file_path(&path) {
        return Err("Access to this file path is not allowed".to_string());
    }
    let sanitized_content = security.sanitize_input(&content);
    drop(security);

    // Create parent directories if they don't exist
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    fs::write(&path, sanitized_content)
        .map_err(|e| {
            error!("Failed to write file {}: {}", path, e);
            format!("Failed to write file: {}", e)
        })
}

#[tauri::command]
pub async fn list_files_command(
    path: String,
    state: State<'_, AIState>,
) -> Result<Vec<String>, String> {
    info!("Listing files in: {}", path);
    
    // Security validation
    let security = state.security.lock().await;
    if !security.validate_file_path(&path) {
        return Err("Access to this directory path is not allowed".to_string());
    }
    drop(security);

    let entries = fs::read_dir(&path)
        .map_err(|e| {
            error!("Failed to read directory {}: {}", path, e);
            format!("Failed to read directory: {}", e)
        })?;

    let mut files = Vec::new();
    for entry in entries {
        match entry {
            Ok(entry) => {
                if let Some(name) = entry.file_name().to_str() {
                    files.push(name.to_string());
                }
            }
            Err(e) => {
                warn!("Failed to read directory entry: {}", e);
            }
        }
    }

    files.sort();
    Ok(files)
}

// System Commands
#[tauri::command]
pub async fn execute_command(
    command: String,
    args: Vec<String>,
    state: State<'_, AIState>,
) -> Result<CommandResult, String> {
    info!("Executing command: {} {:?}", command, args);
    
    // Security validation
    let security = state.security.lock().await;
    let sanitized_command = security.sanitize_input(&command);
    let sanitized_args: Vec<String> = args.iter()
        .map(|arg| security.sanitize_input(arg))
        .collect();
    drop(security);

    // Basic command whitelist for security
    let allowed_commands = [
        "ls", "dir", "echo", "cat", "grep", "find", "wc", "sort", "head", "tail",
        "git", "npm", "yarn", "pnpm", "bun", "cargo", "rustc", "node", "python3",
    ];

    if !allowed_commands.contains(&sanitized_command.as_str()) {
        return Err(format!("Command '{}' is not allowed", sanitized_command));
    }

    let output = Command::new(&sanitized_command)
        .args(&sanitized_args)
        .output()
        .map_err(|e| {
            error!("Failed to execute command: {}", e);
            format!("Failed to execute command: {}", e)
        })?;

    Ok(CommandResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        status: output.status.code().unwrap_or(-1),
    })
}

// HTTP Commands
#[tauri::command]
pub async fn http_request_command(
    url: String,
    method: String,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
    state: State<'_, AIState>,
) -> Result<super::HttpResponse, String> {
    info!("Making HTTP request: {} {}", method, url);
    
    // Security validation
    let mut security = state.security.lock().await;
    if !security.validate_url(&url) {
        return Err("URL is not allowed".to_string());
    }
    
    if !security.check_rate_limit("http_requests") {
        return Err("Rate limit exceeded for HTTP requests".to_string());
    }
    drop(security);

    let request = HttpRequest {
        url,
        method,
        headers,
        body,
    };

    state.http_client
        .make_request(request)
        .await
        .map_err(|e| {
            error!("HTTP request failed: {}", e);
            format!("HTTP request failed: {}", e)
        })
}

// UI Commands
#[tauri::command]
pub async fn show_notification_command(
    title: String,
    message: String,
    r#type: String,
) -> Result<(), String> {
    info!("Showing notification: {} - {}", title, message);
    
    // In a real implementation, you would use the system notification API
    // For now, we'll just log it
    match r#type.as_str() {
        "error" => error!("NOTIFICATION [{}]: {}", title, message),
        "warning" => warn!("NOTIFICATION [{}]: {}", title, message),
        _ => info!("NOTIFICATION [{}]: {}", title, message),
    }
    
    Ok(())
}

// Settings Commands
#[tauri::command]
pub async fn set_setting_command(
    key: String,
    value: serde_json::Value,
    state: State<'_, AIState>,
) -> Result<(), String> {
    info!("Setting configuration: {}", key);
    
    state.storage
        .set_setting(&key, value)
        .map_err(|e| {
            error!("Failed to set setting: {}", e);
            format!("Failed to set setting: {}", e)
        })
}

#[tauri::command]
pub async fn get_setting_command(
    key: String,
    state: State<'_, AIState>,
) -> Result<Option<serde_json::Value>, String> {
    info!("Getting configuration: {}", key);
    
    state.storage
        .get_setting(&key)
        .map_err(|e| {
            error!("Failed to get setting: {}", e);
            format!("Failed to get setting: {}", e)
        })
}

// Security and diagnostics
#[tauri::command]
pub async fn get_rate_limit_stats(
    provider: String,
    state: State<'_, AIState>,
) -> Result<Option<(usize, usize)>, String> {
    let security = state.security.lock().await;
    Ok(security.get_request_stats(&provider))
}