use super::memory::*;
use super::schema::{AGENT_MEMORY_SCHEMA, AGENT_MEMORY_VIEWS};
use anyhow::{Result, anyhow};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use dirs;
use serde_json;

// Simplified memory manager that doesn't store connections
#[derive(Clone)]
pub struct SimpleMemoryManager {
    pub agent_id: String,
    agent_db_path: PathBuf,
    shared_db_path: PathBuf,
}

impl SimpleMemoryManager {
    pub fn new(agent_id: String) -> Result<Self> {
        let memory_dir = Self::get_memory_directory()?;
        
        let agent_db_path = memory_dir.join("agents").join(format!("{}.db", agent_id));
        let shared_db_path = memory_dir.join("shared").join("knowledge.db");

        // Ensure directories exist
        if let Some(parent) = agent_db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        if let Some(parent) = shared_db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        Ok(Self {
            agent_id,
            agent_db_path,
            shared_db_path,
        })
    }

    fn get_memory_directory() -> Result<PathBuf> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| anyhow!("Could not find home directory"))?;
        Ok(home_dir.join(".agent-memory"))
    }

    pub fn initialize(&self) -> Result<()> {
        self.initialize_agent_db()?;
        self.initialize_shared_db()?;
        Ok(())
    }

    fn initialize_agent_db(&self) -> Result<()> {
        use rusqlite::Connection;
        
        let conn = Connection::open(&self.agent_db_path)?;
        conn.execute_batch(AGENT_MEMORY_SCHEMA)?;
        conn.execute_batch(AGENT_MEMORY_VIEWS)?;
        
        // Enable foreign keys and optimizations
        conn.execute("PRAGMA foreign_keys = ON;", [])?;
        conn.execute("PRAGMA journal_mode = WAL;", [])?;
        conn.execute("PRAGMA synchronous = NORMAL;", [])?;
        conn.execute("PRAGMA cache_size = -64000;", [])?;

        Ok(())
    }

    fn initialize_shared_db(&self) -> Result<()> {
        use rusqlite::Connection;
        
        let conn = Connection::open(&self.shared_db_path)?;
        conn.execute_batch(AGENT_MEMORY_SCHEMA)?;
        conn.execute_batch(AGENT_MEMORY_VIEWS)?;
        
        // Enable foreign keys and optimizations
        conn.execute("PRAGMA foreign_keys = ON;", [])?;
        conn.execute("PRAGMA journal_mode = WAL;", [])?;
        conn.execute("PRAGMA synchronous = NORMAL;", [])?;
        conn.execute("PRAGMA cache_size = -64000;", [])?;

        Ok(())
    }

    pub fn save_memory(&self, memory: &AgentMemory) -> Result<()> {
        use rusqlite::{Connection, params};
        
        let conn = Connection::open(&self.agent_db_path)?;
        
        let metadata_json = serde_json::to_string(&memory.metadata)?;
        let tags_json = serde_json::to_string(&memory.tags)?;
        let embedding_blob = memory.embedding.as_ref().map(|e| bincode::serialize(e)).transpose()?;

        conn.execute(
            r#"
            INSERT OR REPLACE INTO agent_memories 
            (id, agent_id, memory_type, content, metadata, embedding, relevance_score, 
             created_at, updated_at, access_count, tags)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                memory.id,
                memory.agent_id,
                format!("{:?}", memory.memory_type),
                memory.content,
                metadata_json,
                embedding_blob,
                memory.relevance_score,
                memory.created_at.to_rfc3339(),
                memory.updated_at.to_rfc3339(),
                memory.access_count,
                tags_json
            ],
        )?;

        self.log_memory_access(&memory.id, "Write", Some("Memory saved"))?;
        Ok(())
    }

    pub fn get_memory(&self, memory_id: &str) -> Result<Option<AgentMemory>> {
        use rusqlite::{Connection, params};
        
        let conn = Connection::open(&self.agent_db_path)?;

        let mut stmt = conn.prepare(
            r#"
            SELECT id, agent_id, memory_type, content, metadata, embedding, 
                   relevance_score, created_at, updated_at, access_count, tags
            FROM agent_memories WHERE id = ?1
            "#,
        )?;

        let memory_row = stmt.query_row(params![memory_id], |row| {
            self.row_to_memory(row)
        });

        match memory_row {
            Ok(memory) => {
                self.log_memory_access(memory_id, "Read", Some("Memory retrieved"))?;
                Ok(Some(memory))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    pub fn search_memories(&self, query: &MemoryQuery) -> Result<Vec<MemorySearchResult>> {
        use rusqlite::{Connection, params};
        
        let conn = Connection::open(&self.agent_db_path)?;

        let mut sql = String::from(
            r#"
            SELECT am.id, am.agent_id, am.memory_type, am.content, am.metadata, 
                   am.embedding, am.relevance_score, am.created_at, am.updated_at, 
                   am.access_count, am.tags
            FROM agent_memories am
            WHERE 1=1
            "#,
        );

        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Build dynamic query based on search criteria
        if let Some(agent_id) = &query.agent_id {
            sql.push_str(" AND am.agent_id = ?");
            params_vec.push(Box::new(agent_id.clone()));
        }

        if let Some(types) = &query.memory_types {
            let type_placeholders = types.iter()
                .map(|_| "?")
                .collect::<Vec<_>>()
                .join(",");
            sql.push_str(&format!(" AND am.memory_type IN ({})", type_placeholders));
            
            for memory_type in types {
                params_vec.push(Box::new(format!("{:?}", memory_type)));
            }
        }

        if let Some(content_search) = &query.content_search {
            sql.push_str(" AND am.content LIKE ?");
            params_vec.push(Box::new(format!("%{}%", content_search)));
        }

        if let Some((start_time, end_time)) = &query.time_range {
            sql.push_str(" AND am.created_at BETWEEN ? AND ?");
            params_vec.push(Box::new(start_time.to_rfc3339()));
            params_vec.push(Box::new(end_time.to_rfc3339()));
        }

        sql.push_str(" ORDER BY am.relevance_score DESC, am.created_at DESC");

        if let Some(limit) = query.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        let mut stmt = conn.prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter()
            .map(|p| p.as_ref())
            .collect();

        let memory_rows = stmt.query_map(&params_refs[..], |row| {
            self.row_to_memory(row)
        })?;

        let mut results = Vec::new();
        for (index, memory_result) in memory_rows.enumerate() {
            let memory = memory_result?;
            
            // Calculate similarity if embedding provided
            let similarity_score = if let (Some(query_embedding), Some(memory_embedding)) = 
                (&query.embedding, &memory.embedding) {
                Some(cosine_similarity(query_embedding, memory_embedding))
            } else {
                None
            };

            results.push(MemorySearchResult {
                memory,
                similarity_score,
                relevance_rank: index,
            });
        }

        // Filter by similarity threshold if provided
        if let Some(threshold) = query.similarity_threshold {
            results.retain(|result| {
                result.similarity_score.map_or(false, |score| score >= threshold)
            });
        }

        // Sort by similarity if embeddings were used
        if query.embedding.is_some() {
            results.sort_by(|a, b| {
                b.similarity_score.partial_cmp(&a.similarity_score).unwrap_or(std::cmp::Ordering::Equal)
            });
        }

        Ok(results)
    }

    pub fn save_shared_knowledge(&self, knowledge: &SharedKnowledge) -> Result<()> {
        use rusqlite::{Connection, params};
        
        let conn = Connection::open(&self.shared_db_path)?;

        let source_agents_json = serde_json::to_string(&knowledge.source_agents)?;
        let tags_json = serde_json::to_string(&knowledge.tags)?;
        let embedding_blob = knowledge.embedding.as_ref().map(|e| bincode::serialize(e)).transpose()?;

        conn.execute(
            r#"
            INSERT OR REPLACE INTO shared_knowledge 
            (id, knowledge_type, title, content, source_agents, embedding, 
             confidence_score, created_at, updated_at, version, tags)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            "#,
            params![
                knowledge.id,
                format!("{:?}", knowledge.knowledge_type),
                knowledge.title,
                knowledge.content,
                source_agents_json,
                embedding_blob,
                knowledge.confidence_score,
                knowledge.created_at.to_rfc3339(),
                knowledge.updated_at.to_rfc3339(),
                knowledge.version,
                tags_json
            ],
        )?;

        Ok(())
    }

    pub fn add_knowledge_node(&self, node: &KnowledgeNode) -> Result<()> {
        use rusqlite::{Connection, params};
        
        let conn = Connection::open(&self.shared_db_path)?;

        let properties_json = serde_json::to_string(&node.properties)?;
        let embedding_blob = node.embedding.as_ref().map(|e| bincode::serialize(e)).transpose()?;

        conn.execute(
            r#"
            INSERT OR REPLACE INTO knowledge_nodes 
            (id, node_type, name, properties, embedding, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                node.id,
                format!("{:?}", node.node_type),
                node.name,
                properties_json,
                embedding_blob,
                node.created_at.to_rfc3339(),
                node.updated_at.to_rfc3339()
            ],
        )?;

        Ok(())
    }

    pub fn add_knowledge_edge(&self, edge: &KnowledgeEdge) -> Result<()> {
        use rusqlite::{Connection, params};
        
        let conn = Connection::open(&self.shared_db_path)?;

        let properties_json = serde_json::to_string(&edge.properties)?;

        conn.execute(
            r#"
            INSERT OR REPLACE INTO knowledge_edges 
            (id, from_node, to_node, relationship_type, weight, properties, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            "#,
            params![
                edge.id,
                edge.from_node,
                edge.to_node,
                format!("{:?}", edge.relationship_type),
                edge.weight,
                properties_json,
                edge.created_at.to_rfc3339(),
                edge.updated_at.to_rfc3339()
            ],
        )?;

        Ok(())
    }

    fn log_memory_access(&self, memory_id: &str, access_type: &str, context: Option<&str>) -> Result<()> {
        use rusqlite::{Connection, params};
        
        let conn = Connection::open(&self.agent_db_path)?;

        conn.execute(
            r#"
            INSERT INTO memory_access_log (id, memory_id, agent_id, access_type, context, timestamp)
            VALUES (?1, ?2, ?3, ?4, ?5, CURRENT_TIMESTAMP)
            "#,
            params![
                uuid::Uuid::new_v4().to_string(),
                memory_id,
                &self.agent_id,
                access_type,
                context.unwrap_or("")
            ],
        )?;

        Ok(())
    }

    fn row_to_memory(&self, row: &rusqlite::Row) -> rusqlite::Result<AgentMemory> {
        let metadata_json: String = row.get("metadata")?;
        let tags_json: String = row.get("tags")?;
        let embedding_blob: Option<Vec<u8>> = row.get("embedding")?;

        let metadata: HashMap<String, String> = serde_json::from_str(&metadata_json)
            .unwrap_or_default();
        let tags: Vec<String> = serde_json::from_str(&tags_json)
            .unwrap_or_default();
        let embedding: Option<Vec<f32>> = embedding_blob
            .and_then(|blob| bincode::deserialize(&blob).ok());

        let memory_type_str: String = row.get("memory_type")?;
        let memory_type = match memory_type_str.as_str() {
            "Conversation" => MemoryType::Conversation,
            "Task" => MemoryType::Task,
            "Learning" => MemoryType::Learning,
            "Context" => MemoryType::Context,
            "Tool" => MemoryType::Tool,
            "Error" => MemoryType::Error,
            "Success" => MemoryType::Success,
            "Pattern" => MemoryType::Pattern,
            _ => MemoryType::Context, // Default fallback
        };

        Ok(AgentMemory {
            id: row.get("id")?,
            agent_id: row.get("agent_id")?,
            memory_type,
            content: row.get("content")?,
            metadata,
            embedding,
            relevance_score: row.get("relevance_score")?,
            created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
                .map_err(|_| rusqlite::Error::InvalidColumnType(0, "created_at".to_string(), rusqlite::types::Type::Text))?
                .with_timezone(&chrono::Utc),
            updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>("updated_at")?)
                .map_err(|_| rusqlite::Error::InvalidColumnType(0, "updated_at".to_string(), rusqlite::types::Type::Text))?
                .with_timezone(&chrono::Utc),
            access_count: row.get("access_count")?,
            tags,
        })
    }

    pub fn backup_agent_memory(&self, backup_path: &Path) -> Result<()> {
        // Simple file copy backup (in production, use SQLite backup API)
        std::fs::copy(&self.agent_db_path, backup_path)?;
        Ok(())
    }

    pub fn get_agent_db_path(&self) -> &PathBuf {
        &self.agent_db_path
    }

    pub fn get_shared_db_path(&self) -> &PathBuf {
        &self.shared_db_path
    }
}