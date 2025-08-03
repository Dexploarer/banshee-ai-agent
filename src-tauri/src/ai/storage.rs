use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};
use anyhow::{Result, Context};
use crate::ai::encryption::{SecureStorage, get_master_password};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ApiKeyConfig {
    pub provider: String,
    pub encrypted_key: String, // Now stores encrypted key instead of plaintext
    pub created_at: String,
    pub last_used: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct SecureStorageData {
    pub api_keys: HashMap<String, ApiKeyConfig>,
    pub settings: HashMap<String, serde_json::Value>,
}

pub struct StorageManager {
    storage_path: PathBuf,
    encryption: SecureStorage,
}

impl StorageManager {
    pub fn new() -> Result<Self> {
        let app_dir = dirs::config_dir()
            .context("Failed to get config directory")?
            .join("banshee");
        
        fs::create_dir_all(&app_dir)
            .context("Failed to create app config directory")?;
        
        let storage_path = app_dir.join("secure_storage.json");
        let encryption = SecureStorage::new();
        
        info!("Storage manager initialized with path: {:?}", storage_path);
        
        Ok(Self { storage_path, encryption })
    }

    pub fn load_storage(&self) -> Result<SecureStorageData> {
        if !self.storage_path.exists() {
            info!("Storage file does not exist, creating new one");
            return Ok(SecureStorageData::default());
        }

        let content = fs::read_to_string(&self.storage_path)
            .context("Failed to read storage file")?;

        let storage: SecureStorageData = serde_json::from_str(&content)
            .context("Failed to parse storage file")?;

        info!("Loaded storage with {} API keys", storage.api_keys.len());
        Ok(storage)
    }

    pub fn save_storage(&self, storage: &SecureStorageData) -> Result<()> {
        let content = serde_json::to_string_pretty(storage)
            .context("Failed to serialize storage")?;

        fs::write(&self.storage_path, content)
            .context("Failed to write storage file")?;

        info!("Storage saved successfully");
        Ok(())
    }

    pub fn store_api_key(&self, provider: &str, key: &str) -> Result<()> {
        let mut storage = self.load_storage()?;
        
        // Get master password for encryption
        let master_password = get_master_password()
            .context("Failed to get master encryption password")?;
        
        // Encrypt the API key
        let encrypted_key = self.encryption.encrypt(key, &master_password)
            .context("Failed to encrypt API key")?;
        
        let config = ApiKeyConfig {
            provider: provider.to_string(),
            encrypted_key,
            created_at: chrono::Utc::now().to_rfc3339(),
            last_used: None,
        };

        storage.api_keys.insert(provider.to_string(), config);
        self.save_storage(&storage)?;

        info!("Encrypted API key stored for provider: {}", provider);
        Ok(())
    }

    pub fn get_api_key(&self, provider: &str) -> Result<Option<String>> {
        let mut storage = self.load_storage()?;
        
        if let Some(config) = storage.api_keys.get_mut(provider) {
            // Get master password for decryption
            let master_password = get_master_password()
                .context("Failed to get master encryption password")?;
            
            // Decrypt the API key
            let decrypted_key = self.encryption.decrypt(&config.encrypted_key, &master_password)
                .context("Failed to decrypt API key - may be corrupted or password changed")?;
            
            // Update last used timestamp
            config.last_used = Some(chrono::Utc::now().to_rfc3339());
            
            if let Err(e) = self.save_storage(&storage) {
                warn!("Failed to update last_used timestamp: {}", e);
            }
            
            info!("Retrieved and decrypted API key for provider: {}", provider);
            Ok(Some(decrypted_key))
        } else {
            warn!("No API key found for provider: {}", provider);
            Ok(None)
        }
    }

    pub fn remove_api_key(&self, provider: &str) -> Result<bool> {
        let mut storage = self.load_storage()?;
        
        let removed = storage.api_keys.remove(provider).is_some();
        if removed {
            self.save_storage(&storage)?;
            info!("API key removed for provider: {}", provider);
        } else {
            warn!("No API key found to remove for provider: {}", provider);
        }
        
        Ok(removed)
    }

    pub fn list_providers(&self) -> Result<Vec<String>> {
        let storage = self.load_storage()?;
        let providers: Vec<String> = storage.api_keys.keys().cloned().collect();
        
        info!("Listed {} providers", providers.len());
        Ok(providers)
    }

    pub fn set_setting(&self, key: &str, value: serde_json::Value) -> Result<()> {
        let mut storage = self.load_storage()?;
        storage.settings.insert(key.to_string(), value);
        self.save_storage(&storage)?;
        
        info!("Setting stored: {}", key);
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<serde_json::Value>> {
        let storage = self.load_storage()?;
        Ok(storage.settings.get(key).cloned())
    }

    pub fn clear_all_data(&self) -> Result<()> {
        if self.storage_path.exists() {
            fs::remove_file(&self.storage_path)
                .context("Failed to remove storage file")?;
            info!("All storage data cleared");
        }
        Ok(())
    }
}