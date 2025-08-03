use anyhow::{Result, Context};
use tauri::{command, AppHandle, State};
use tracing::{info, warn, error};
use std::sync::Mutex;

use crate::ai::{
    csrf::{validate_request_security, SESSION_MANAGER, CSRF_MANAGER},
    command_whitelist::validate_command_execution,
    error_sanitization::{sanitize_user_error, sanitize_log_error},
    storage::StorageManager,
};

/// Secure session state
pub struct SecureSession {
    pub storage_manager: Mutex<StorageManager>,
}

/// Create a new secure session
#[command]
pub async fn create_session() -> Result<String, String> {
    match SESSION_MANAGER.create_session() {
        Ok(session_id) => {
            info!("New session created: {}", &session_id[..8]);
            Ok(session_id)
        }
        Err(e) => {
            error!("Failed to create session: {}", sanitize_log_error(&e));
            Err("Failed to create session".to_string())
        }
    }
}

/// Generate CSRF token for session
#[command]
pub async fn generate_csrf_token(session_id: String) -> Result<String, String> {
    // Validate session first
    match SESSION_MANAGER.validate_session(&session_id) {
        Ok(true) => {
            match CSRF_MANAGER.generate_token(&session_id) {
                Ok(token) => {
                    info!("CSRF token generated for session: {}", &session_id[..8]);
                    Ok(token)
                }
                Err(e) => {
                    error!("Failed to generate CSRF token: {}", sanitize_log_error(&e));
                    Err("Failed to generate CSRF token".to_string())
                }
            }
        }
        Ok(false) => {
            warn!("Invalid session for CSRF token generation: {}", &session_id[..8]);
            Err("Invalid session".to_string())
        }
        Err(e) => {
            error!("Session validation error: {}", sanitize_log_error(&e));
            Err("Session validation failed".to_string())
        }
    }
}

/// Secure command execution with whitelist validation
#[command]
pub async fn execute_command_secure(
    session_id: String,
    csrf_token: String,
    command: String,
    args: Vec<String>,
) -> Result<serde_json::Value, String> {
    // Validate security
    match validate_request_security(&session_id, &csrf_token) {
        Ok(true) => {}
        Ok(false) => {
            warn!("Security validation failed for command: {}", command);
            return Err("Security validation failed".to_string());
        }
        Err(e) => {
            error!("Security validation error: {}", sanitize_log_error(&e));
            return Err("Security validation failed".to_string());
        }
    }

    // Validate command against whitelist
    match validate_command_execution(&command, &args) {
        Ok(true) => {
            info!("Executing whitelisted command: {} with {} args", command, args.len());
        }
        Ok(false) => {
            warn!("Command not in whitelist: {} {:?}", command, args);
            return Err("Command not permitted".to_string());
        }
        Err(e) => {
            error!("Command validation error: {}", sanitize_log_error(&e));
            return Err("Command validation failed".to_string());
        }
    }

    // Execute the command safely
    match tokio::process::Command::new(&command)
        .args(&args)
        .output()
        .await
    {
        Ok(output) => {
            let result = serde_json::json!({
                "success": output.status.success(),
                "stdout": String::from_utf8_lossy(&output.stdout),
                "stderr": String::from_utf8_lossy(&output.stderr),
                "status": output.status.code().unwrap_or(-1)
            });
            Ok(result)
        }
        Err(e) => {
            error!("Command execution error: {}", sanitize_log_error(&anyhow::Error::from(e)));
            Err("Command execution failed".to_string())
        }
    }
}

/// Secure file reading with path validation
#[command]
pub async fn read_file_tool_secure(
    session_id: String,
    csrf_token: String,
    path: String,
) -> Result<String, String> {
    // Validate security
    match validate_request_security(&session_id, &csrf_token) {
        Ok(true) => {}
        Ok(false) => return Err("Security validation failed".to_string()),
        Err(_) => return Err("Security validation failed".to_string()),
    }

    // Validate file path
    if path.contains("..") || path.starts_with("/") || path.contains('\x00') {
        warn!("Invalid file path attempted: {}", path);
        return Err("Invalid file path".to_string());
    }

    // Additional path safety checks
    let dangerous_patterns = [".ssh/", ".env", "password", "secret", "key", "token"];
    for pattern in &dangerous_patterns {
        if path.to_lowercase().contains(pattern) {
            warn!("Potentially dangerous file access attempted: {}", path);
            return Err("File access denied".to_string());
        }
    }

    match tokio::fs::read_to_string(&path).await {
        Ok(content) => {
            info!("File read successfully: {}", path);
            Ok(content)
        }
        Err(e) => {
            error!("File read error for {}: {}", path, sanitize_log_error(&anyhow::Error::from(e)));
            Err("File read failed".to_string())
        }
    }
}

/// Secure file writing with path validation
#[command]
pub async fn write_file_tool_secure(
    session_id: String,
    csrf_token: String,
    path: String,
    contents: String,
) -> Result<String, String> {
    // Validate security
    match validate_request_security(&session_id, &csrf_token) {
        Ok(true) => {}
        Ok(false) => return Err("Security validation failed".to_string()),
        Err(_) => return Err("Security validation failed".to_string()),
    }

    // Validate file path
    if path.contains("..") || path.starts_with("/") || path.contains('\x00') {
        warn!("Invalid file path attempted: {}", path);
        return Err("Invalid file path".to_string());
    }

    // Check if path is in safe write directories
    let safe_prefixes = ["src/", "docs/", "temp/", "output/"];
    if !safe_prefixes.iter().any(|prefix| path.starts_with(prefix)) {
        warn!("File write outside safe directories: {}", path);
        return Err("File write location not permitted".to_string());
    }

    // Content validation
    if contents.len() > 10_000_000 { // 10MB limit
        return Err("File content too large".to_string());
    }

    match tokio::fs::write(&path, &contents).await {
        Ok(_) => {
            info!("File written successfully: {}", path);
            Ok("File written successfully".to_string())
        }
        Err(e) => {
            error!("File write error for {}: {}", path, sanitize_log_error(&anyhow::Error::from(e)));
            Err("File write failed".to_string())
        }
    }
}

/// Secure file listing with path validation
#[command]
pub async fn list_files_tool_secure(
    session_id: String,
    csrf_token: String,
    path: String,
    recursive: bool,
) -> Result<Vec<String>, String> {
    // Validate security
    match validate_request_security(&session_id, &csrf_token) {
        Ok(true) => {}
        Ok(false) => return Err("Security validation failed".to_string()),
        Err(_) => return Err("Security validation failed".to_string()),
    }

    // Validate directory path
    if path.contains("..") || path.starts_with("/") || path.contains('\x00') {
        warn!("Invalid directory path attempted: {}", path);
        return Err("Invalid directory path".to_string());
    }

    match if recursive {
        list_files_recursive(&path).await
    } else {
        list_files_single(&path).await
    } {
        Ok(files) => {
            info!("Directory listed successfully: {} ({} files)", path, files.len());
            Ok(files)
        }
        Err(e) => {
            error!("Directory listing error for {}: {}", path, sanitize_log_error(&e));
            Err("Directory listing failed".to_string())
        }
    }
}

/// Helper function for single directory listing
async fn list_files_single(path: &str) -> Result<Vec<String>> {
    let mut files = Vec::new();
    let mut dir = tokio::fs::read_dir(path).await
        .context("Failed to read directory")?;

    while let Some(entry) = dir.next_entry().await.context("Failed to read directory entry")? {
        if let Some(name) = entry.file_name().to_str() {
            files.push(name.to_string());
        }
    }

    Ok(files)
}

/// Helper function for recursive directory listing
async fn list_files_recursive(path: &str) -> Result<Vec<String>> {
    let mut files = Vec::new();
    collect_files_recursive(path, &mut files, 0)?;
    Ok(files)
}

/// Recursive file collection with depth limit
fn collect_files_recursive(path: &str, files: &mut Vec<String>, depth: usize) -> Result<()> {
    // Prevent infinite recursion
    if depth > 10 {
        return Ok(());
    }

    let entries = std::fs::read_dir(path)
        .context("Failed to read directory")?;

    for entry in entries {
        let entry = entry.context("Failed to read directory entry")?;
        let entry_path = entry.path();
        
        if let Some(name) = entry_path.to_str() {
            if entry_path.is_dir() {
                collect_files_recursive(name, files, depth + 1)?;
            } else if let Some(file_name) = entry.file_name().to_str() {
                files.push(format!("{}/{}", path, file_name));
            }
        }
    }

    Ok(())
}

/// Secure agent execution
#[command]
pub async fn execute_agent_tool_secure(
    session_id: String,
    csrf_token: String,
    agent_type: String,
    prompt: String,
    context: serde_json::Value,
) -> Result<serde_json::Value, String> {
    // Validate security
    match validate_request_security(&session_id, &csrf_token) {
        Ok(true) => {}
        Ok(false) => return Err("Security validation failed".to_string()),
        Err(_) => return Err("Security validation failed".to_string()),
    }

    // Validate agent type
    let allowed_agents = ["assistant", "fileManager", "webAgent", "developer", "systemAdmin"];
    if !allowed_agents.contains(&agent_type.as_str()) {
        warn!("Invalid agent type requested: {}", agent_type);
        return Err("Invalid agent type".to_string());
    }

    // Validate prompt length
    if prompt.len() > 50000 {
        return Err("Prompt too long".to_string());
    }

    // For now, return a placeholder response
    // In a real implementation, this would execute the actual agent
    let result = serde_json::json!({
        "agent_type": agent_type,
        "response": "Agent execution completed",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "session_id": &session_id[..8]
    });

    info!("Agent executed: {} for session: {}", agent_type, &session_id[..8]);
    Ok(result)
}

/// Secure API key storage
#[command]
pub async fn store_api_key_secure(
    session_id: String,
    csrf_token: String,
    provider: String,
    key: String,
    app_handle: AppHandle,
    secure_session: State<'_, SecureSession>,
) -> Result<String, String> {
    // Validate security
    match validate_request_security(&session_id, &csrf_token) {
        Ok(true) => {}
        Ok(false) => return Err("Security validation failed".to_string()),
        Err(_) => return Err("Security validation failed".to_string()),
    }

    // Validate inputs
    if provider.is_empty() || key.is_empty() {
        return Err("Provider and key are required".to_string());
    }

    if key.len() < 10 || key.len() > 1000 {
        return Err("Invalid key length".to_string());
    }

    let storage_manager = secure_session.storage_manager.lock()
        .map_err(|_| "Failed to acquire storage lock".to_string())?;

    match storage_manager.store_api_key(&provider, &key) {
        Ok(_) => {
            info!("API key stored securely for provider: {}", provider);
            Ok("API key stored securely".to_string())
        }
        Err(e) => {
            error!("Failed to store API key: {}", sanitize_log_error(&e));
            Err("Failed to store API key".to_string())
        }
    }
}

/// Secure API key retrieval
#[command]
pub async fn get_api_key_secure(
    session_id: String,
    csrf_token: String,
    provider: String,
    app_handle: AppHandle,
    secure_session: State<'_, SecureSession>,
) -> Result<Option<String>, String> {
    // Validate security
    match validate_request_security(&session_id, &csrf_token) {
        Ok(true) => {}
        Ok(false) => return Err("Security validation failed".to_string()),
        Err(_) => return Err("Security validation failed".to_string()),
    }

    if provider.is_empty() {
        return Err("Provider is required".to_string());
    }

    let storage_manager = secure_session.storage_manager.lock()
        .map_err(|_| "Failed to acquire storage lock".to_string())?;

    match storage_manager.get_api_key(&provider) {
        Ok(key) => {
            if key.is_some() {
                info!("API key retrieved for provider: {}", provider);
            }
            Ok(key)
        }
        Err(e) => {
            error!("Failed to retrieve API key: {}", sanitize_log_error(&e));
            Err("Failed to retrieve API key".to_string())
        }
    }
}

/// Initialize secure session state
pub fn init_secure_session() -> SecureSession {
    let storage_manager = StorageManager::new().expect("Failed to initialize storage manager");
    SecureSession {
        storage_manager: Mutex::new(storage_manager),
    }
}