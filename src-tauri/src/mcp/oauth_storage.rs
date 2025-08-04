use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use tokio::fs;
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng, generic_array::GenericArray},
    Aes256Gcm, Nonce
};

type Key = GenericArray<u8, aes_gcm::aes::cipher::consts::U32>;
use aes_gcm::aead::rand_core::RngCore;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

#[derive(Debug, Serialize, Deserialize)]
struct TokenStorage {
    tokens: HashMap<String, String>, // serverId -> encrypted token data
    version: u32,
}

impl Default for TokenStorage {
    fn default() -> Self {
        Self {
            tokens: HashMap::new(),
            version: 1,
        }
    }
}

pub struct OAuthTokenStorage {
    storage_path: PathBuf,
    cipher: Aes256Gcm,
}

impl OAuthTokenStorage {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        // Create storage directory if it doesn't exist
        let storage_dir = app_data_dir.join("oauth");
        std::fs::create_dir_all(&storage_dir)?;
        
        let storage_path = storage_dir.join("tokens.enc");
        
        // Load or generate encryption key
        let key = Self::load_or_generate_key(&storage_dir)?;
        let cipher = Aes256Gcm::new(&key);
        
        Ok(Self {
            storage_path,
            cipher,
        })
    }
    
    fn load_or_generate_key(storage_dir: &PathBuf) -> Result<Key> {
        let key_path = storage_dir.join("key.enc");
        
        if key_path.exists() {
            // Load existing key
            let key_data = std::fs::read(&key_path)?;
            let key = *GenericArray::from_slice(&key_data);
            Ok(key)
        } else {
            // Generate new key
            let mut key_bytes = [0u8; 32];
            OsRng.fill_bytes(&mut key_bytes);
            let key = *GenericArray::from_slice(&key_bytes);
            
            // Save key (in production, use OS keychain)
            std::fs::write(&key_path, &key_bytes)?;
            
            Ok(key)
        }
    }
    
    async fn load_storage(&self) -> Result<TokenStorage> {
        if self.storage_path.exists() {
            let data = fs::read(&self.storage_path).await?;
            let storage: TokenStorage = serde_json::from_slice(&data)?;
            Ok(storage)
        } else {
            Ok(TokenStorage::default())
        }
    }
    
    async fn save_storage(&self, storage: &TokenStorage) -> Result<()> {
        let data = serde_json::to_vec_pretty(storage)?;
        fs::write(&self.storage_path, data).await?;
        Ok(())
    }
    
    pub async fn store_token(&self, server_id: String, token_data: String) -> Result<()> {
        // Encrypt token data
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = self.cipher
            .encrypt(nonce, token_data.as_bytes())
            .map_err(|e| anyhow::anyhow!("Encryption failed: {:?}", e))?;
        
        // Combine nonce and ciphertext
        let mut encrypted = nonce_bytes.to_vec();
        encrypted.extend_from_slice(&ciphertext);
        
        // Base64 encode
        let encoded = BASE64.encode(&encrypted);
        
        // Update storage
        let mut storage = self.load_storage().await?;
        storage.tokens.insert(server_id, encoded);
        self.save_storage(&storage).await?;
        
        Ok(())
    }
    
    pub async fn get_token(&self, server_id: &str) -> Result<Option<String>> {
        let storage = self.load_storage().await?;
        
        if let Some(encoded) = storage.tokens.get(server_id) {
            // Base64 decode
            let encrypted = BASE64.decode(encoded)?;
            
            if encrypted.len() < 12 {
                return Err(anyhow::anyhow!("Invalid encrypted data"));
            }
            
            // Extract nonce and ciphertext
            let (nonce_bytes, ciphertext) = encrypted.split_at(12);
            let nonce = Nonce::from_slice(nonce_bytes);
            
            // Decrypt
            let plaintext = self.cipher
                .decrypt(nonce, ciphertext)
                .map_err(|e| anyhow::anyhow!("Decryption failed: {:?}", e))?;
            
            let token_data = String::from_utf8(plaintext)?;
            Ok(Some(token_data))
        } else {
            Ok(None)
        }
    }
    
    pub async fn delete_token(&self, server_id: &str) -> Result<()> {
        let mut storage = self.load_storage().await?;
        storage.tokens.remove(server_id);
        self.save_storage(&storage).await?;
        Ok(())
    }
    
    pub async fn get_all_tokens(&self) -> Result<HashMap<String, String>> {
        let storage = self.load_storage().await?;
        Ok(storage.tokens)
    }
    
    pub async fn clear_all_tokens(&self) -> Result<()> {
        let storage = TokenStorage::default();
        self.save_storage(&storage).await?;
        Ok(())
    }
}

// Tauri commands
#[tauri::command]
pub async fn store_mcp_oauth_token(
    server_id: String,
    encrypted_data: String,
    state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
    state.oauth_storage
        .store_token(server_id, encrypted_data)
        .await
        .map_err(|e| format!("Failed to store token: {}", e))
}

#[tauri::command]
pub async fn get_mcp_oauth_tokens(
    state: tauri::State<'_, crate::AppState>,
) -> Result<HashMap<String, String>, String> {
    state.oauth_storage
        .get_all_tokens()
        .await
        .map_err(|e| format!("Failed to get tokens: {}", e))
}

#[tauri::command]
pub async fn delete_mcp_oauth_token(
    server_id: String,
    state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
    state.oauth_storage
        .delete_token(&server_id)
        .await
        .map_err(|e| format!("Failed to delete token: {}", e))
}

#[tauri::command]
pub async fn clear_all_mcp_oauth_tokens(
    state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
    state.oauth_storage
        .clear_all_tokens()
        .await
        .map_err(|e| format!("Failed to clear tokens: {}", e))
}

#[tauri::command]
pub async fn encrypt_data(data: String) -> Result<String, String> {
    // For client-side encryption before storage
    // Using a simple approach here, in production use proper key derivation
    let mut key_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut key_bytes);
    let key = GenericArray::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher
        .encrypt(nonce, data.as_bytes())
        .map_err(|e| format!("Encryption failed: {:?}", e))?;
    
    // Combine key, nonce, and ciphertext
    let mut result = key_bytes.to_vec();
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    
    Ok(BASE64.encode(&result))
}

#[tauri::command]
pub async fn decrypt_data(data: String) -> Result<String, String> {
    let encrypted = BASE64.decode(&data)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;
    
    if encrypted.len() < 44 { // 32 (key) + 12 (nonce) + min ciphertext
        return Err("Invalid encrypted data".to_string());
    }
    
    // Extract key, nonce, and ciphertext
    let (key_bytes, rest) = encrypted.split_at(32);
    let (nonce_bytes, ciphertext) = rest.split_at(12);
    
    let key = GenericArray::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);
    
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {:?}", e))?;
    
    String::from_utf8(plaintext)
        .map_err(|e| format!("UTF-8 decode failed: {}", e))
}

#[tauri::command]
pub async fn open_oauth_browser(url: String) -> Result<(), String> {
    webbrowser::open(&url)
        .map_err(|e| format!("Failed to open browser: {}", e))
}