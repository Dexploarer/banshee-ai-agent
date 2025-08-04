use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use anyhow::Result;

// Agent memory system modules
pub mod memory;
pub mod schema;
pub mod simple_memory;
pub mod embeddings;
pub mod neural_network;
pub mod neural_embeddings;
pub mod memory_sequence_models;
pub mod neural_knowledge_graph;
pub mod simple_commands;
pub mod graph_commands;

// #[cfg(test)]
// mod tests;

// #[cfg(test)]
// mod integration_tests;

#[cfg(test)]
mod neural_tests;

// #[cfg(test)]
// mod memory_flow_tests;

// Re-export key types for easier usage
pub use memory::*;
pub use simple_memory::SimpleMemoryManager;
pub use embeddings::{EmbeddingService, TransformerEmbeddingService};
pub use neural_network::{NeuralNetwork, NetworkBuilder, ActivationFunction, TrainingData};
pub use neural_embeddings::{NeuralEmbeddingService, EmbeddingConfig, EmbeddingStats};
pub use memory_sequence_models::{MemorySequenceModel, MemorySequenceAnalyzer, SequenceModelType, MemoryPatternAnalysis, LSTMCell, GRUCell};
pub use neural_knowledge_graph::{NeuralKnowledgeGraph, NeuralGraphConfig, NeuralGraphStatistics, NeuralRelationshipType};

#[derive(Debug, Serialize, Deserialize)]
pub struct DbConversation {
    pub id: String,
    pub agent_id: String,
    pub title: String,
    pub summary: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub token_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DbMessage {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub tool_calls: Option<String>, // JSON string
    pub timestamp: DateTime<Utc>,
    pub tokens: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DbAgentSettings {
    pub id: String,
    pub agent_id: String,
    pub configuration: String, // JSON string
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DbMcpSession {
    pub id: String,
    pub server_id: String,
    pub status: String,
    pub connected_at: DateTime<Utc>,
    pub disconnected_at: Option<DateTime<Utc>>,
}

// SQL schema creation
pub const INIT_SQL: &str = r#"
-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    token_count INTEGER DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    tool_calls TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    tokens INTEGER,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Agent settings table
CREATE TABLE IF NOT EXISTS agent_settings (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,
    configuration TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- MCP sessions table
CREATE TABLE IF NOT EXISTS mcp_sessions (
    id TEXT PRIMARY KEY,
    server_id TEXT NOT NULL,
    status TEXT NOT NULL,
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    disconnected_at DATETIME
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_server_id ON mcp_sessions(server_id);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_conversations_timestamp 
AFTER UPDATE ON conversations
BEGIN
    UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_agent_settings_timestamp 
AFTER UPDATE ON agent_settings
BEGIN
    UPDATE agent_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
"#;

// Database commands
#[tauri::command]
pub async fn init_database() -> Result<(), String> {
    // This will be called from the frontend to ensure database is initialized
    Ok(())
}

#[tauri::command]
pub async fn save_conversation(conversation: DbConversation) -> Result<DbConversation, String> {
    // Implementation will use tauri-plugin-sql from frontend
    Ok(conversation)
}

#[tauri::command]
pub async fn save_message(message: DbMessage) -> Result<DbMessage, String> {
    // Implementation will use tauri-plugin-sql from frontend
    Ok(message)
}

#[tauri::command]
pub async fn get_conversations(agent_id: Option<String>, limit: Option<i32>) -> Result<Vec<DbConversation>, String> {
    // Implementation will use tauri-plugin-sql from frontend
    Ok(vec![])
}

#[tauri::command]
pub async fn get_messages(conversation_id: String, limit: Option<i32>) -> Result<Vec<DbMessage>, String> {
    // Implementation will use tauri-plugin-sql from frontend
    Ok(vec![])
}

#[tauri::command]
pub async fn search_conversations(query: String) -> Result<Vec<DbConversation>, String> {
    // Implementation will use tauri-plugin-sql from frontend
    Ok(vec![])
}

#[tauri::command]
pub async fn delete_conversation(conversation_id: String) -> Result<(), String> {
    // Implementation will use tauri-plugin-sql from frontend
    Ok(())
}