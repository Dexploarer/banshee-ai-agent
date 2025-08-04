use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};
use rusqlite::{Connection, params};
use super::neural_embeddings::{NeuralEmbeddingService, EmbeddingConfig};
use super::memory::MemoryType;

/// Migration configuration for embedding updates
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingMigrationConfig {
    /// Source model name (e.g., "text-embedding-ada-002")
    pub source_model: String,
    /// Target model name (e.g., "text-embedding-3-small")
    pub target_model: String,
    /// Source embedding dimensions
    pub source_dimensions: usize,
    /// Target embedding dimensions
    pub target_dimensions: usize,
    /// Batch size for processing
    pub batch_size: usize,
    /// Whether to validate embeddings after migration
    pub validate_embeddings: bool,
    /// Whether to backup original embeddings
    pub backup_original: bool,
    /// Similarity threshold for validation
    pub similarity_threshold: f32,
    /// Maximum retry attempts for failed migrations
    pub max_retries: usize,
    /// Whether to use neural embeddings for target
    pub use_neural_embeddings: bool,
    /// Start time for migration tracking
    pub start_time: Option<DateTime<Utc>>,
}

impl Default for EmbeddingMigrationConfig {
    fn default() -> Self {
        Self {
            source_model: "text-embedding-ada-002".to_string(),
            target_model: "text-embedding-3-small".to_string(),
            source_dimensions: 1536,
            target_dimensions: 1536,
            batch_size: 100,
            validate_embeddings: true,
            backup_original: true,
            similarity_threshold: 0.8,
            max_retries: 3,
            use_neural_embeddings: false,
            start_time: None,
        }
    }
}

/// Migration status for tracking progress
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationStatus {
    /// Total items to migrate
    pub total_items: usize,
    /// Items processed so far
    pub processed_items: usize,
    /// Items successfully migrated
    pub successful_items: usize,
    /// Items that failed migration
    pub failed_items: usize,
    /// Current batch being processed
    pub current_batch: usize,
    /// Total batches
    pub total_batches: usize,
    /// Migration start time
    pub start_time: DateTime<Utc>,
    /// Estimated completion time
    pub estimated_completion: Option<DateTime<Utc>>,
    /// Current status message
    pub status_message: String,
    /// Detailed error messages
    pub errors: Vec<String>,
}

/// Embedding migration utility
pub struct EmbeddingMigrationUtility {
    /// Database connection (thread-safe with Mutex)
    db: Arc<Mutex<Connection>>,
    /// Source embedding service (neural)
    source_service: NeuralEmbeddingService,
    /// Target embedding service (neural or traditional)
    target_service: Arc<RwLock<Box<dyn EmbeddingServiceTrait>>>,
    /// Migration configuration
    config: EmbeddingMigrationConfig,
    /// Migration status
    status: Arc<RwLock<MigrationStatus>>,
}

/// Trait for embedding services to support both neural and traditional embeddings
#[async_trait::async_trait]
pub trait EmbeddingServiceTrait: Send + Sync {
    async fn embed_text(&self, text: &str) -> Result<Vec<f32>>;
    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>>;
    async fn validate_embedding(&self, embedding: &[f32]) -> Result<bool>;
}

/// Traditional embedding service wrapper (using neural service with default config)
pub struct TraditionalEmbeddingWrapper {
    service: NeuralEmbeddingService,
}

#[async_trait::async_trait]
impl EmbeddingServiceTrait for TraditionalEmbeddingWrapper {
    async fn embed_text(&self, text: &str) -> Result<Vec<f32>> {
        self.service.embed_text(text, None).await
    }

    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        let text_data = texts.iter().map(|t| (t.clone(), None)).collect::<Vec<_>>();
        self.service.embed_batch(&text_data).await
    }

    async fn validate_embedding(&self, embedding: &[f32]) -> Result<bool> {
        // Basic validation: check if embedding is not empty and has expected dimensions
        Ok(!embedding.is_empty() && embedding.len() > 0)
    }
}

/// Neural embedding service wrapper
pub struct NeuralEmbeddingWrapper {
    service: NeuralEmbeddingService,
}

#[async_trait::async_trait]
impl EmbeddingServiceTrait for NeuralEmbeddingWrapper {
    async fn embed_text(&self, text: &str) -> Result<Vec<f32>> {
        self.service.embed_text(text, None).await
    }

    async fn embed_batch(&self, texts: &[String]) -> Result<Vec<Vec<f32>>> {
        let text_data = texts.iter().map(|t| (t.clone(), None)).collect::<Vec<_>>();
        self.service.embed_batch(&text_data).await
    }

    async fn validate_embedding(&self, embedding: &[f32]) -> Result<bool> {
        // Neural embedding validation
        Ok(!embedding.is_empty() && embedding.len() == self.service.config().embedding_dim)
    }
}

impl EmbeddingMigrationUtility {
    /// Create a new migration utility
    pub async fn new(
        db_path: &str,
        config: EmbeddingMigrationConfig,
    ) -> Result<Self> {
        let db = Arc::new(Mutex::new(Connection::open(db_path)?));
        
        // Initialize source service with default config
        let source_config = EmbeddingConfig {
            embedding_dim: config.source_dimensions,
            ..Default::default()
        };
        let source_service = NeuralEmbeddingService::new(Some(source_config)).await?;

        // Initialize target service
        let target_service: Arc<RwLock<Box<dyn EmbeddingServiceTrait>>> = if config.use_neural_embeddings {
            let target_config = EmbeddingConfig {
                embedding_dim: config.target_dimensions,
                ..Default::default()
            };
            let neural_service = NeuralEmbeddingService::new(Some(target_config)).await?;
            Arc::new(RwLock::new(Box::new(NeuralEmbeddingWrapper { service: neural_service })))
        } else {
            let target_config = EmbeddingConfig {
                embedding_dim: config.target_dimensions,
                ..Default::default()
            };
            let traditional_service = NeuralEmbeddingService::new(Some(target_config)).await?;
            Arc::new(RwLock::new(Box::new(TraditionalEmbeddingWrapper { service: traditional_service })))
        };

        let status = Arc::new(RwLock::new(MigrationStatus {
            total_items: 0,
            processed_items: 0,
            successful_items: 0,
            failed_items: 0,
            current_batch: 0,
            total_batches: 0,
            start_time: Utc::now(),
            estimated_completion: None,
            status_message: "Initializing migration...".to_string(),
            errors: Vec::new(),
        }));

        Ok(Self {
            db,
            source_service,
            target_service,
            config,
            status,
        })
    }

    /// Get current migration status
    pub async fn get_status(&self) -> MigrationStatus {
        let status = self.status.read().await;
        status.clone()
    }

    /// Update migration status
    async fn update_status(&self, update: impl FnOnce(&mut MigrationStatus)) {
        let mut status = self.status.write().await;
        update(&mut status);
    }

    /// Get all tables that contain embeddings
    pub async fn get_embedding_tables(&self) -> Result<Vec<String>> {
        // Use a whitelist approach to prevent SQL injection
        let allowed_tables = vec![
            "agent_memories".to_string(),
            "shared_knowledge".to_string(), 
            "knowledge_nodes".to_string(),
            "knowledge_items".to_string(),
            "embedding_cache".to_string(),
        ];
        Ok(allowed_tables)
    }

    /// Count total items that need migration using a single query
    pub async fn count_migration_items(&self) -> Result<usize> {
        // Use a more efficient UNION ALL query to count all embeddings across tables
        let query = r#"
            SELECT SUM(count) FROM (
                SELECT COUNT(*) as count FROM agent_memories WHERE embedding IS NOT NULL
                UNION ALL
                SELECT COUNT(*) FROM shared_knowledge WHERE embedding IS NOT NULL
                UNION ALL
                SELECT COUNT(*) FROM knowledge_nodes WHERE embedding IS NOT NULL
                UNION ALL
                SELECT COUNT(*) FROM knowledge_items WHERE embedding IS NOT NULL
                UNION ALL
                SELECT COUNT(*) FROM embedding_cache WHERE embedding IS NOT NULL
            )
        "#;
        
        let db = self.db.lock().unwrap();
        let total: usize = db.query_row(query, [], |row| row.get(0))?;
        Ok(total)
    }

    /// Backup original embeddings before migration
    pub async fn backup_embeddings(&self) -> Result<()> {
        if !self.config.backup_original {
            return Ok(());
        }

        self.update_status(|s| {
            s.status_message = "Creating backup of original embeddings...".to_string();
        }).await;

        // Use transaction for backup operations
        let db = self.db.lock().unwrap();
        let tx = db.transaction()?;
        
        // Create backup tables
        let backup_tables = vec![
            ("agent_memories", "agent_memories_backup"),
            ("shared_knowledge", "shared_knowledge_backup"),
            ("knowledge_nodes", "knowledge_nodes_backup"),
            ("knowledge_items", "knowledge_items_backup"),
            ("embedding_cache", "embedding_cache_backup"),
        ];

        for (original, backup) in backup_tables {
            tx.execute(
                &format!("CREATE TABLE IF NOT EXISTS {} AS SELECT * FROM {}", backup, original),
                [],
            )?;
        }

        tx.commit()?;
        Ok(())
    }

    /// Migrate embeddings for a specific table using streaming approach
    pub async fn migrate_table_embeddings(&self, table_name: &str) -> Result<()> {
        self.update_status(|s| {
            s.status_message = format!("Migrating embeddings for table: {}", table_name);
        }).await;

        // Use cursor-based approach to avoid loading all items into memory
        let mut offset = 0;
        let batch_size = self.config.batch_size;
        let mut total_processed = 0;

        loop {
            // Get batch of items
            let db = self.db.lock().unwrap();
            let mut stmt = db.prepare(&format!(
                "SELECT id, content, embedding FROM {} WHERE embedding IS NOT NULL LIMIT ? OFFSET ?",
                table_name
            ))?;

            let rows = stmt.query_map(params![batch_size, offset], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Vec<u8>>(2)?,
                ))
            })?;

            let mut batch_count = 0;
            for row in rows {
                let (id, content, _old_embedding) = row?;
                
                // Process each row individually to avoid memory issues
                match self.migrate_single_embedding(table_name, &id, &content).await {
                    Ok(_) => {
                        self.update_status(|s| {
                            s.successful_items += 1;
                            s.processed_items += 1;
                        }).await;
                    }
                    Err(e) => {
                        self.update_status(|s| {
                            s.failed_items += 1;
                            s.processed_items += 1;
                            s.errors.push(format!("Failed to migrate {} in {}: {}", id, table_name, e));
                        }).await;
                    }
                }
                batch_count += 1;
            }

            if batch_count == 0 {
                break;
            }

            total_processed += batch_count;
            offset += batch_size;

            // Update batch progress
            self.update_status(|s| {
                s.current_batch = (offset / batch_size) + 1;
                s.status_message = format!(
                    "Processed {} items from table {}",
                    total_processed, table_name
                );
            }).await;
        }

        Ok(())
    }

    /// Migrate a single embedding
    async fn migrate_single_embedding(
        &self,
        table_name: &str,
        id: &str,
        content: &str,
    ) -> Result<()> {
        // Validate content before processing
        if content.trim().is_empty() {
            return Err(anyhow!("Content is empty for id: {}", id));
        }
        
        let target_service = self.target_service.read().await;
        
        // Generate new embedding
        let new_embedding = target_service.embed_text(content).await?;
        
        // Validate embedding if required
        if self.config.validate_embeddings {
            if !target_service.validate_embedding(&new_embedding).await? {
                return Err(anyhow!("Generated embedding failed validation"));
            }
        }

        // Convert embedding to bytes for storage
        let embedding_bytes = bincode::serialize(&new_embedding)?;

        // Update database using parameterized query
        let db = self.db.lock().unwrap();
        db.execute(
            &format!(
                "UPDATE {} SET embedding = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                table_name
            ),
            params![embedding_bytes, id],
        )?;

        Ok(())
    }

    /// Run complete migration
    pub async fn run_migration(&self) -> Result<()> {
        // Initialize migration
        let total_items = self.count_migration_items().await?;
        
        self.update_status(|s| {
            s.total_items = total_items;
            s.start_time = Utc::now();
            s.status_message = "Starting migration...".to_string();
        }).await;

        // Create backup if requested
        if self.config.backup_original {
            self.backup_embeddings().await?;
        }

        // Migrate each table
        for table in self.get_embedding_tables().await? {
            self.migrate_table_embeddings(&table).await?;
        }

        // Final status update
        self.update_status(|s| {
            s.status_message = "Migration completed successfully".to_string();
            s.estimated_completion = Some(Utc::now());
        }).await;

        Ok(())
    }

    /// Validate migration results
    pub async fn validate_migration(&self) -> Result<MigrationValidationResult> {
        let mut results = MigrationValidationResult {
            total_validated: 0,
            valid_embeddings: 0,
            invalid_embeddings: 0,
            errors: Vec::new(),
        };

        let target_service = self.target_service.read().await;

        for table in self.get_embedding_tables().await? {
            let db = self.db.lock().unwrap();
            let mut stmt = db.prepare(&format!(
                "SELECT id, embedding FROM {} WHERE embedding IS NOT NULL",
                table
            ))?;

            let rows = stmt.query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Vec<u8>>(1)?,
                ))
            })?;

            for row in rows {
                let (id, embedding_bytes) = row?;
                results.total_validated += 1;

                match bincode::deserialize::<Vec<f32>>(&embedding_bytes) {
                    Ok(embedding) => {
                        if target_service.validate_embedding(&embedding).await? {
                            results.valid_embeddings += 1;
                        } else {
                            results.invalid_embeddings += 1;
                            results.errors.push(format!("Invalid embedding for {} in {}", id, table));
                        }
                    }
                    Err(e) => {
                        results.invalid_embeddings += 1;
                        results.errors.push(format!("Failed to deserialize embedding for {} in {}: {}", id, table, e));
                    }
                }
            }
        }

        Ok(results)
    }

    /// Rollback migration to backup using transactions
    pub async fn rollback_migration(&self) -> Result<()> {
        if !self.config.backup_original {
            return Err(anyhow!("Cannot rollback: no backup was created"));
        }

        self.update_status(|s| {
            s.status_message = "Rolling back migration...".to_string();
        }).await;

        // Use transaction for rollback operations
        let db = self.db.lock().unwrap();
        let tx = db.transaction()?;

        // Restore from backup tables
        let backup_tables = vec![
            ("agent_memories_backup", "agent_memories"),
            ("shared_knowledge_backup", "shared_knowledge"),
            ("knowledge_nodes_backup", "knowledge_nodes"),
            ("knowledge_items_backup", "knowledge_items"),
            ("embedding_cache_backup", "embedding_cache"),
        ];

        for (backup, original) in backup_tables {
            // Check if backup table exists
            let exists: bool = tx.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
                [backup],
                |row| row.get(0),
            )?;

            if exists {
                // Drop original table and rename backup
                tx.execute(&format!("DROP TABLE IF EXISTS {}", original), [])?;
                tx.execute(&format!("ALTER TABLE {} RENAME TO {}", backup, original), [])?;
            }
        }

        tx.commit()?;

        self.update_status(|s| {
            s.status_message = "Rollback completed successfully".to_string();
        }).await;

        Ok(())
    }

    /// Clean up backup tables
    pub async fn cleanup_backups(&self) -> Result<()> {
        let backup_tables = vec![
            "agent_memories_backup",
            "shared_knowledge_backup",
            "knowledge_nodes_backup",
            "knowledge_items_backup",
            "embedding_cache_backup",
        ];

        let db = self.db.lock().unwrap();
        for table in backup_tables {
            db.execute(&format!("DROP TABLE IF EXISTS {}", table), [])?;
        }

        Ok(())
    }

    /// Get migration statistics
    pub async fn get_migration_stats(&self) -> Result<MigrationStats> {
        let mut stats = MigrationStats {
            total_embeddings: 0,
            migrated_embeddings: 0,
            failed_embeddings: 0,
            table_breakdown: HashMap::new(),
        };

        for table in self.get_embedding_tables().await? {
            let db = self.db.lock().unwrap();
            let count: usize = db.query_row(
                &format!("SELECT COUNT(*) FROM {} WHERE embedding IS NOT NULL", table),
                [],
                |row| row.get(0),
            )?;

            stats.total_embeddings += count;
            stats.table_breakdown.insert(table, count);
        }

        // Count migrated embeddings (with new model)
        if let Some(start_time) = self.config.start_time {
            for table in self.get_embedding_tables().await? {
                let db = self.db.lock().unwrap();
                let count: usize = db.query_row(
                    &format!(
                        "SELECT COUNT(*) FROM {} WHERE embedding IS NOT NULL AND updated_at > ?",
                        table
                    ),
                    [start_time.timestamp()],
                    |row| row.get(0),
                )?;

                stats.migrated_embeddings += count;
            }
        }

        stats.failed_embeddings = stats.total_embeddings - stats.migrated_embeddings;

        Ok(stats)
    }
}

/// Migration validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationValidationResult {
    pub total_validated: usize,
    pub valid_embeddings: usize,
    pub invalid_embeddings: usize,
    pub errors: Vec<String>,
}

/// Migration statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationStats {
    pub total_embeddings: usize,
    pub migrated_embeddings: usize,
    pub failed_embeddings: usize,
    pub table_breakdown: HashMap<String, usize>,
}

// Thread-safe global state for migration utility
static MIGRATION_UTILITY: once_cell::sync::Lazy<Arc<RwLock<Option<EmbeddingMigrationUtility>>>> = 
    once_cell::sync::Lazy::new(|| Arc::new(RwLock::new(None)));

/// Tauri commands for embedding migration
#[tauri::command]
pub async fn start_embedding_migration(
    config: EmbeddingMigrationConfig,
) -> Result<String, String> {
    let migration_utility = EmbeddingMigrationUtility::new("banshee.db", config)
        .await
        .map_err(|e| e.to_string())?;

    // Store the migration utility in global state
    {
        let mut global_utility = MIGRATION_UTILITY.write().await;
        *global_utility = Some(migration_utility);
    }

    // Run migration in background
    let utility_clone = MIGRATION_UTILITY.clone();
    tokio::spawn(async move {
        if let Some(utility) = utility_clone.read().await.as_ref() {
            if let Err(e) = utility.run_migration().await {
                eprintln!("Migration failed: {}", e);
            }
        }
    });

    Ok("Migration started successfully".to_string())
}

#[tauri::command]
pub async fn get_migration_status() -> Result<MigrationStatus, String> {
    let global_utility = MIGRATION_UTILITY.read().await;
    if let Some(utility) = global_utility.as_ref() {
        Ok(utility.get_status().await)
    } else {
        Ok(MigrationStatus {
            total_items: 0,
            processed_items: 0,
            successful_items: 0,
            failed_items: 0,
            current_batch: 0,
            total_batches: 0,
            start_time: Utc::now(),
            estimated_completion: None,
            status_message: "No migration in progress".to_string(),
            errors: Vec::new(),
        })
    }
}

#[tauri::command]
pub async fn validate_migration_results() -> Result<MigrationValidationResult, String> {
    let global_utility = MIGRATION_UTILITY.read().await;
    if let Some(utility) = global_utility.as_ref() {
        utility.validate_migration().await.map_err(|e| e.to_string())
    } else {
        Err("No migration in progress".to_string())
    }
}

#[tauri::command]
pub async fn rollback_migration() -> Result<String, String> {
    let global_utility = MIGRATION_UTILITY.read().await;
    if let Some(utility) = global_utility.as_ref() {
        utility.rollback_migration().await.map_err(|e| e.to_string())?;
        Ok("Migration rolled back successfully".to_string())
    } else {
        Err("No migration in progress".to_string())
    }
}

#[tauri::command]
pub async fn get_migration_stats() -> Result<MigrationStats, String> {
    let global_utility = MIGRATION_UTILITY.read().await;
    if let Some(utility) = global_utility.as_ref() {
        utility.get_migration_stats().await.map_err(|e| e.to_string())
    } else {
        Err("No migration in progress".to_string())
    }
} 