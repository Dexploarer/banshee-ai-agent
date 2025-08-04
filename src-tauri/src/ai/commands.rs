use super::{SecurityManager, SecurityMiddleware, StorageManager, HttpClientManager, HttpRequest};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::sync::Mutex as AsyncMutex;
use tracing::{info, warn, error};
use anyhow::Result;

// Shared state for our AI system
pub struct AIState {
    pub security_middleware: Arc<SecurityMiddleware>,
    pub storage: StorageManager,
    pub http_client: HttpClientManager,
}

impl AIState {
    pub fn new() -> Result<Self> {
        let security_manager = Arc::new(AsyncMutex::new(SecurityManager::new()));
        let security_middleware = Arc::new(SecurityMiddleware::new(security_manager));
        
        Ok(Self {
            security_middleware,
            storage: StorageManager::new()?,
            http_client: HttpClientManager::new()?,
        })
    }
    
    pub fn get_security_middleware(&self) -> Arc<SecurityMiddleware> {
        self.security_middleware.clone()
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
    
    // Security validation
    let security_middleware = state.get_security_middleware();
    let validation_result = match security_middleware.validate_request(
        "api_key_operations",
        &[provider.clone(), key.clone()],
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_provider = &validation_result.sanitized_inputs[0];
    let sanitized_key = &validation_result.sanitized_inputs[1];
    
    state.storage
        .store_api_key(sanitized_provider, sanitized_key)
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
    
    // Security validation
    let security_middleware = state.get_security_middleware();
    let validation_result = match security_middleware.validate_request(
        "api_key_operations",
        &[provider.clone()],
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_provider = &validation_result.sanitized_inputs[0];
    
    state.storage
        .get_api_key(sanitized_provider)
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
    
    // Security validation
    let security_middleware = state.get_security_middleware();
    let validation_result = match security_middleware.validate_request(
        "api_key_operations",
        &[provider.clone()],
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_provider = &validation_result.sanitized_inputs[0];
    
    state.storage
        .remove_api_key(sanitized_provider)
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
    
    // Security validation
    let security_middleware = state.get_security_middleware();
    match security_middleware.validate_request(
        "provider_operations",
        &[],
        &[]
    ).await {
        Ok(_) => {},
        Err(e) => return Err(e),
    };
    
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
    let security_middleware = state.get_security_middleware();
    let validation_result = match security_middleware.validate_request(
        "file_operations",
        &[path.clone()],
        &[path.clone()]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_path = &validation_result.sanitized_inputs[0];

    fs::read_to_string(sanitized_path)
        .map_err(|e| {
            error!("Failed to read file {}: {}", sanitized_path, e);
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
    let security_middleware = state.get_security_middleware();
    let validation_result = match security_middleware.validate_request(
        "file_operations",
        &[path.clone(), content.clone()],
        &[path.clone()]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_path = &validation_result.sanitized_inputs[0];
    let sanitized_content = &validation_result.sanitized_inputs[1];

    // Create parent directories if they don't exist
    if let Some(parent) = Path::new(sanitized_path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    fs::write(sanitized_path, sanitized_content)
        .map_err(|e| {
            error!("Failed to write file {}: {}", sanitized_path, e);
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
    let security_middleware = state.get_security_middleware();
    let validation_result = match security_middleware.validate_request(
        "file_operations",
        &[path.clone()],
        &[path.clone()]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_path = &validation_result.sanitized_inputs[0];

    let entries = fs::read_dir(sanitized_path)
        .map_err(|e| {
            error!("Failed to read directory {}: {}", sanitized_path, e);
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
    let security_middleware = state.get_security_middleware();
    let mut all_inputs = vec![command.clone()];
    all_inputs.extend(args.clone());
    
    let validation_result = match security_middleware.validate_request(
        "system_operations",
        &all_inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_command = &validation_result.sanitized_inputs[0];
    let sanitized_args: Vec<String> = validation_result.sanitized_inputs[1..].to_vec();

    // Basic command whitelist for security
    let allowed_commands = [
        "ls", "dir", "echo", "cat", "grep", "find", "wc", "sort", "head", "tail",
        "git", "npm", "yarn", "pnpm", "bun", "cargo", "rustc", "node", "python3",
    ];

    if !allowed_commands.contains(&sanitized_command.as_str()) {
        return Err(format!("Command '{}' is not allowed", sanitized_command));
    }

    let output = Command::new(sanitized_command)
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
    let security_middleware = state.get_security_middleware();
    let mut all_inputs = vec![url.clone(), method.clone()];
    if let Some(ref body) = body {
        all_inputs.push(body.clone());
    }
    
    let validation_result = match security_middleware.validate_request(
        "http_requests",
        &all_inputs,
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_url = &validation_result.sanitized_inputs[0];
    let sanitized_method = &validation_result.sanitized_inputs[1];
    let sanitized_body = if body.is_some() && validation_result.sanitized_inputs.len() > 2 {
        Some(validation_result.sanitized_inputs[2].clone())
    } else {
        body
    };

    let request = HttpRequest {
        url: sanitized_url.clone(),
        method: sanitized_method.clone(),
        headers,
        body: sanitized_body,
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
    state: State<'_, AIState>,
) -> Result<(), String> {
    info!("Showing notification: {} - {}", title, message);
    
    // Security validation
    let security_middleware = state.get_security_middleware();
    let validation_result = match security_middleware.validate_request(
        "notification_operations",
        &[title.clone(), message.clone(), r#type.clone()],
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_title = &validation_result.sanitized_inputs[0];
    let sanitized_message = &validation_result.sanitized_inputs[1];
    let sanitized_type = &validation_result.sanitized_inputs[2];
    
    // In a real implementation, you would use the system notification API
    // For now, we'll just log it
    match sanitized_type.as_str() {
        "error" => error!("NOTIFICATION [{}]: {}", sanitized_title, sanitized_message),
        "warning" => warn!("NOTIFICATION [{}]: {}", sanitized_title, sanitized_message),
        _ => info!("NOTIFICATION [{}]: {}", sanitized_title, sanitized_message),
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
    
    // Security validation
    let security_middleware = state.get_security_middleware();
    let value_str = value.to_string();
    let validation_result = match security_middleware.validate_request(
        "settings_operations",
        &[key.clone(), value_str],
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_key = &validation_result.sanitized_inputs[0];
    let sanitized_value_str = &validation_result.sanitized_inputs[1];
    let sanitized_value: serde_json::Value = serde_json::from_str(sanitized_value_str)
        .unwrap_or(value); // fallback to original if parsing fails
    
    state.storage
        .set_setting(sanitized_key, sanitized_value)
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
    
    // Security validation
    let security_middleware = state.get_security_middleware();
    let validation_result = match security_middleware.validate_request(
        "settings_operations",
        &[key.clone()],
        &[]
    ).await {
        Ok(result) => result,
        Err(e) => return Err(e),
    };
    
    // Use sanitized inputs
    let sanitized_key = &validation_result.sanitized_inputs[0];
    
    state.storage
        .get_setting(sanitized_key)
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
    let security_middleware = state.get_security_middleware();
    Ok(security_middleware.get_stats(&provider).await)
}