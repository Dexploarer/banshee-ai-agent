use tauri::{command, AppHandle, Manager, Emitter};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPServer {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub version: String,
    pub features: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPProcessInfo {
    pub pid: u32,
    pub command: String,
    pub args: Vec<String>,
}

type ProcessMap = Arc<Mutex<HashMap<u32, MCPProcessInfo>>>;

#[command]
pub async fn start_mcp_process(
    app: AppHandle,
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
) -> Result<serde_json::Value, String> {
    let mut cmd = Command::new(&command);
    cmd.args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    for (key, value) in env {
        cmd.env(key, value);
    }

    let mut child = cmd.spawn().map_err(|e| format!("Failed to start process: {}", e))?;
    
    let pid = child.id();
    
    // Store process info
    let processes = app.state::<ProcessMap>();
    {
        let mut procs = processes.lock().unwrap();
        procs.insert(pid, MCPProcessInfo {
            pid,
            command: command.clone(),
            args: args.clone(),
        });
    }

    // Spawn task to handle process I/O - simplified for now
    let app_handle = app.clone();
    tokio::spawn(async move {
        // Wait for process to exit
        let _ = child.wait();
        let _ = app_handle.emit(&format!("mcp_close_{}", pid), ());
        
        // Clean up process info
        let processes = app_handle.state::<ProcessMap>();
        let mut procs = processes.lock().unwrap();
        procs.remove(&pid);
    });

    Ok(serde_json::json!({ "pid": pid }))
}

#[command]
pub async fn stop_mcp_process(
    app: AppHandle,
    pid: u32,
) -> Result<(), String> {
    let processes = app.state::<ProcessMap>();
    
    // Remove from our tracking
    {
        let mut procs = processes.lock().unwrap();
        procs.remove(&pid);
    }

    // Try to terminate the process gracefully
    #[cfg(unix)]
    {
        use nix::sys::signal::{self, Signal};
        use nix::unistd::Pid;
        
        let process_pid = Pid::from_raw(pid as i32);
        let _ = signal::kill(process_pid, Signal::SIGTERM);
        
        // Give it a moment to exit gracefully
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        
        // Force kill if still running
        let _ = signal::kill(process_pid, Signal::SIGKILL);
    }

    #[cfg(windows)]
    {
        let _ = Command::new("taskkill")
            .args(&["/PID", &pid.to_string(), "/F"])
            .output();
    }

    Ok(())
}

#[command]
pub async fn send_mcp_message(
    app: AppHandle,
    pid: u32,
    message: String,
) -> Result<(), String> {
    // In a real implementation, we would send this to the process stdin
    // For now, just emit it as an event for demonstration
    app.emit(&format!("mcp_send_{}", pid), &message)
        .map_err(|e| format!("Failed to send message: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn connect_local_mcp(
    app: AppHandle,
    socket_path: String,
) -> Result<(), String> {
    // In a real implementation, this would connect to a Unix domain socket
    // For now, simulate the connection
    tracing::info!("Connecting to local MCP at: {}", socket_path);
    
    // Simulate connection success
    app.emit(&format!("local_mcp_connected_{}", socket_path), ())
        .map_err(|e| format!("Failed to emit connection event: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn disconnect_local_mcp(
    app: AppHandle,
    socket_path: String,
) -> Result<(), String> {
    tracing::info!("Disconnecting from local MCP: {}", socket_path);
    
    app.emit(&format!("local_mcp_close_{}", socket_path), ())
        .map_err(|e| format!("Failed to emit disconnect event: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn send_local_mcp_message(
    app: AppHandle,
    socket_path: String,
    message: String,
) -> Result<(), String> {
    // In a real implementation, send to Unix socket
    tracing::debug!("Sending message to {}: {}", socket_path, message);
    
    // Simulate response
    app.emit(&format!("local_mcp_message_{}", socket_path), &message)
        .map_err(|e| format!("Failed to send local message: {}", e))?;
    
    Ok(())
}

// MCP Server resource and tool commands
#[command]
pub async fn get_agent_configs() -> Result<String, String> {
    let configs = serde_json::json!({
        "agents": [
            {
                "id": "assistant",
                "name": "AI Assistant",
                "description": "General purpose conversational agent",
                "capabilities": ["chat", "analysis", "writing"],
                "model": "gpt-4o"
            },
            {
                "id": "fileManager",
                "name": "File Manager",
                "description": "Manages files and directories",
                "capabilities": ["file_read", "file_write", "directory_list"],
                "model": "gpt-4o-mini"
            },
            {
                "id": "webAgent",
                "name": "Web Agent",
                "description": "Fetches and processes web content",
                "capabilities": ["web_fetch", "html_parse", "content_extract"],
                "model": "gpt-4o"
            },
            {
                "id": "developer",
                "name": "Developer Agent",
                "description": "Code analysis and development tasks",
                "capabilities": ["code_review", "test_generation", "refactoring"],
                "model": "gpt-4o"
            }
        ]
    });
    
    Ok(configs.to_string())
}

#[command]
pub async fn get_conversation_history() -> Result<String, String> {
    let history = serde_json::json!({
        "conversations": [
            {
                "id": "conv_1",
                "agent": "assistant",
                "created_at": "2024-01-15T10:30:00Z",
                "message_count": 5,
                "summary": "File analysis discussion"
            },
            {
                "id": "conv_2", 
                "agent": "developer",
                "created_at": "2024-01-15T11:15:00Z",
                "message_count": 12,
                "summary": "Code review session"
            }
        ]
    });
    
    Ok(history.to_string())
}

#[command]
pub async fn get_system_status() -> Result<String, String> {
    let status = serde_json::json!({
        "system": {
            "uptime": "2h 15m",
            "cpu_usage": 23.5,
            "memory_usage": 45.2,
            "disk_usage": 67.8,
            "active_agents": 3,
            "mcp_connections": 2,
            "health": "healthy"
        },
        "services": {
            "ai_runtime": "running",
            "mcp_server": "running",
            "file_monitor": "running",
            "security_manager": "running"
        }
    });
    
    Ok(status.to_string())
}

#[command]
pub async fn list_workspace_files() -> Result<String, String> {
    let files = serde_json::json!({
        "workspace": "/Users/example/projects/banshee",
        "files": [
            {
                "path": "src/main.rs",
                "type": "file",
                "size": 1024,
                "modified": "2024-01-15T12:00:00Z"
            },
            {
                "path": "Cargo.toml",
                "type": "file", 
                "size": 512,
                "modified": "2024-01-15T11:30:00Z"
            },
            {
                "path": "src/",
                "type": "directory",
                "children": 8,
                "modified": "2024-01-15T12:00:00Z"
            }
        ]
    });
    
    Ok(files.to_string())
}

// Tool execution commands
#[command]
pub async fn execute_agent_tool(
    agent_type: String,
    prompt: String,
    context: serde_json::Value,
) -> Result<String, String> {
    // In a real implementation, this would execute the specified agent
    let result = serde_json::json!({
        "agent": agent_type,
        "status": "completed",
        "response": format!("Agent response to: {}", prompt),
        "context": context,
        "execution_time": "1.23s"
    });
    
    Ok(result.to_string())
}

#[command]
pub async fn read_file_tool(path: String) -> Result<String, String> {
    use std::fs;
    
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file {}: {}", path, e))
}

#[command]
pub async fn write_file_tool(path: String, contents: String) -> Result<(), String> {
    use std::fs;
    
    fs::write(&path, contents)
        .map_err(|e| format!("Failed to write file {}: {}", path, e))
}

#[command]
pub async fn list_files_tool(path: String, recursive: bool) -> Result<Vec<String>, String> {
    fn list_files_sync(path: &str, recursive: bool) -> Result<Vec<String>, String> {
        use std::fs;
        
        let entries = fs::read_dir(path)
            .map_err(|e| format!("Failed to read directory {}: {}", path, e))?;
        
        let mut files = Vec::new();
        
        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let entry_path = entry.path();
            
            if entry_path.is_file() {
                files.push(entry_path.to_string_lossy().to_string());
            } else if recursive && entry_path.is_dir() {
                let sub_files = list_files_sync(&entry_path.to_string_lossy(), true)?;
                files.extend(sub_files);
            }
        }
        
        Ok(files)
    }
    
    list_files_sync(&path, recursive)
}

#[command]
pub async fn execute_command_tool(command: String, args: Vec<String>) -> Result<String, String> {
    // Whitelist of safe commands
    let allowed_commands = [
        "ls", "pwd", "whoami", "date", "uname",
        "git", "npm", "cargo", "python", "node"
    ];
    
    if !allowed_commands.contains(&command.as_str()) {
        return Err(format!("Command not allowed: {}", command));
    }
    
    let output = Command::new(&command)
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;
    
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}