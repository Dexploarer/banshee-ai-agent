use anyhow::{Result, Context};
use ring::rand::{SecureRandom, SystemRandom};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH, Duration};
use tracing::{info, warn, debug};

const TOKEN_LENGTH: usize = 32;
const TOKEN_EXPIRY_SECONDS: u64 = 3600; // 1 hour

#[derive(Debug, Clone)]
pub struct CSRFToken {
    pub token: String,
    pub expires_at: u64,
    pub session_id: String,
}

pub struct CSRFManager {
    tokens: Arc<Mutex<HashMap<String, CSRFToken>>>,
    rng: SystemRandom,
}

impl CSRFManager {
    pub fn new() -> Self {
        Self {
            tokens: Arc::new(Mutex::new(HashMap::new())),
            rng: SystemRandom::new(),
        }
    }

    /// Generate a new CSRF token for a session
    pub fn generate_token(&self, session_id: &str) -> Result<String> {
        let mut token_bytes = [0u8; TOKEN_LENGTH];
        self.rng.fill(&mut token_bytes)
            .map_err(|_| anyhow::anyhow!("Failed to generate random token"))?;
        
        let token = BASE64.encode(&token_bytes);
        let expires_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() + TOKEN_EXPIRY_SECONDS;

        let csrf_token = CSRFToken {
            token: token.clone(),
            expires_at,
            session_id: session_id.to_string(),
        };

        {
            let mut tokens = self.tokens.lock().unwrap();
            tokens.insert(token.clone(), csrf_token);
        }

        debug!("Generated CSRF token for session: {}", session_id);
        Ok(token)
    }

    /// Validate a CSRF token
    pub fn validate_token(&self, token: &str, session_id: &str) -> Result<bool> {
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let mut tokens = self.tokens.lock().unwrap();
        
        if let Some(csrf_token) = tokens.get(token) {
            // Check if token has expired
            if current_time > csrf_token.expires_at {
                warn!("CSRF token expired for session: {}", session_id);
                tokens.remove(token);
                return Ok(false);
            }

            // Check if token belongs to the correct session
            if csrf_token.session_id != session_id {
                warn!("CSRF token session mismatch: expected {}, got {}", 
                     csrf_token.session_id, session_id);
                return Ok(false);
            }

            debug!("CSRF token validated successfully for session: {}", session_id);
            Ok(true)
        } else {
            warn!("Invalid CSRF token for session: {}", session_id);
            Ok(false)
        }
    }

    /// Remove a token (after use)
    pub fn consume_token(&self, token: &str) -> Result<()> {
        let mut tokens = self.tokens.lock().unwrap();
        if tokens.remove(token).is_some() {
            debug!("CSRF token consumed: {}", &token[..8]);
        }
        Ok(())
    }

    /// Clean up expired tokens
    pub fn cleanup_expired_tokens(&self) -> Result<()> {
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let mut tokens = self.tokens.lock().unwrap();
        let initial_count = tokens.len();
        
        tokens.retain(|_, csrf_token| {
            csrf_token.expires_at > current_time
        });

        let removed_count = initial_count - tokens.len();
        if removed_count > 0 {
            info!("Cleaned up {} expired CSRF tokens", removed_count);
        }

        Ok(())
    }

    /// Get token count for monitoring
    pub fn token_count(&self) -> usize {
        self.tokens.lock().unwrap().len()
    }
}

/// Session manager for tracking active sessions
pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<String, SessionInfo>>>,
    rng: SystemRandom,
}

#[derive(Debug, Clone)]
pub struct SessionInfo {
    pub session_id: String,
    pub created_at: u64,
    pub last_activity: u64,
    pub csrf_tokens: Vec<String>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            rng: SystemRandom::new(),
        }
    }

    /// Create a new session
    pub fn create_session(&self) -> Result<String> {
        let mut session_bytes = [0u8; TOKEN_LENGTH];
        self.rng.fill(&mut session_bytes)
            .map_err(|_| anyhow::anyhow!("Failed to generate session ID"))?;
        
        let session_id = BASE64.encode(&session_bytes);
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let session_info = SessionInfo {
            session_id: session_id.clone(),
            created_at: current_time,
            last_activity: current_time,
            csrf_tokens: Vec::new(),
        };

        {
            let mut sessions = self.sessions.lock().unwrap();
            sessions.insert(session_id.clone(), session_info);
        }

        info!("Created new session: {}", &session_id[..8]);
        Ok(session_id)
    }

    /// Validate session and update last activity
    pub fn validate_session(&self, session_id: &str) -> Result<bool> {
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let mut sessions = self.sessions.lock().unwrap();
        
        if let Some(session) = sessions.get_mut(session_id) {
            // Update last activity
            session.last_activity = current_time;
            debug!("Session validated: {}", &session_id[..8]);
            Ok(true)
        } else {
            warn!("Invalid session ID: {}", &session_id[..8]);
            Ok(false)
        }
    }

    /// Remove a session
    pub fn remove_session(&self, session_id: &str) -> Result<()> {
        let mut sessions = self.sessions.lock().unwrap();
        if sessions.remove(session_id).is_some() {
            info!("Session removed: {}", &session_id[..8]);
        }
        Ok(())
    }

    /// Clean up expired sessions
    pub fn cleanup_expired_sessions(&self, max_age_seconds: u64) -> Result<()> {
        let current_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let mut sessions = self.sessions.lock().unwrap();
        let initial_count = sessions.len();
        
        sessions.retain(|_, session| {
            current_time - session.last_activity < max_age_seconds
        });

        let removed_count = initial_count - sessions.len();
        if removed_count > 0 {
            info!("Cleaned up {} expired sessions", removed_count);
        }

        Ok(())
    }

    /// Get session count for monitoring
    pub fn session_count(&self) -> usize {
        self.sessions.lock().unwrap().len()
    }
}

/// Global CSRF and session managers
lazy_static::lazy_static! {
    pub static ref CSRF_MANAGER: CSRFManager = CSRFManager::new();
    pub static ref SESSION_MANAGER: SessionManager = SessionManager::new();
}

/// Helper function to validate request security
pub fn validate_request_security(session_id: &str, csrf_token: &str) -> Result<bool> {
    // Validate session
    if !SESSION_MANAGER.validate_session(session_id)? {
        warn!("Request blocked: Invalid session");
        return Ok(false);
    }

    // Validate CSRF token
    if !CSRF_MANAGER.validate_token(csrf_token, session_id)? {
        warn!("Request blocked: Invalid CSRF token");
        return Ok(false);
    }

    debug!("Request security validation passed");
    Ok(true)
}

/// Initialize security managers
pub fn init_security_managers() {
    // Note: Cleanup tasks should be started within Tauri's async context
    // The spawn is moved to the Tauri setup function
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_csrf_token_generation() {
        let manager = CSRFManager::new();
        let session_id = "test_session";
        
        let token = manager.generate_token(session_id).unwrap();
        assert!(!token.is_empty());
        assert!(manager.validate_token(&token, session_id).unwrap());
    }

    #[test]
    fn test_csrf_token_validation_fails_wrong_session() {
        let manager = CSRFManager::new();
        let session_id = "test_session";
        let wrong_session = "wrong_session";
        
        let token = manager.generate_token(session_id).unwrap();
        assert!(!manager.validate_token(&token, wrong_session).unwrap());
    }

    #[test]
    fn test_session_creation() {
        let manager = SessionManager::new();
        let session_id = manager.create_session().unwrap();
        
        assert!(!session_id.is_empty());
        assert!(manager.validate_session(&session_id).unwrap());
    }

    #[test]
    fn test_request_security_validation() {
        let session_manager = SessionManager::new();
        let csrf_manager = CSRFManager::new();
        
        let session_id = session_manager.create_session().unwrap();
        let csrf_token = csrf_manager.generate_token(&session_id).unwrap();
        
        // This would require the global managers to be the same instances
        // In practice, this test would need to be structured differently
    }
}