use super::SecurityManager;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, warn, error};

/// Security middleware for consistent security application across all commands
pub struct SecurityMiddleware {
    security_manager: Arc<Mutex<SecurityManager>>,
}

impl SecurityMiddleware {
    pub fn new(security_manager: Arc<Mutex<SecurityManager>>) -> Self {
        Self {
            security_manager,
        }
    }

    /// Comprehensive security check for all commands
    pub async fn validate_request(
        &self,
        provider: &str,
        inputs: &[String],
        file_paths: &[String],
    ) -> Result<SecurityValidationResult, String> {
        let mut security = self.security_manager.lock().await;
        
        // 1. Rate limiting check
        if !security.check_rate_limit(provider) {
            error!("Rate limit exceeded for provider: {}", provider);
            return Err("Rate limit exceeded. Please try again later.".to_string());
        }

        // 2. Input sanitization
        let sanitized_inputs: Vec<String> = inputs.iter()
            .map(|input| security.sanitize_input(input))
            .collect();

        // 3. File path validation
        for path in file_paths {
            if !security.validate_file_path(path) {
                error!("Invalid file path detected: {}", path);
                return Err("Access to this file path is not allowed".to_string());
            }
        }

        info!("Security validation passed for provider: {}", provider);
        
        Ok(SecurityValidationResult {
            sanitized_inputs,
            validated: true,
        })
    }

    /// URL validation wrapper
    pub async fn validate_url(&self, url: &str) -> Result<bool, String> {
        let security = self.security_manager.lock().await;
        Ok(security.validate_url(url))
    }

    /// Get request statistics
    pub async fn get_stats(&self, provider: &str) -> Option<(usize, usize)> {
        let security = self.security_manager.lock().await;
        security.get_request_stats(provider)
    }

    /// Sanitize a single input
    pub async fn sanitize_input(&self, input: &str) -> String {
        let security = self.security_manager.lock().await;
        security.sanitize_input(input)
    }

    /// Validate a single file path
    pub async fn validate_file_path(&self, path: &str) -> bool {
        let security = self.security_manager.lock().await;
        security.validate_file_path(path)
    }
}

/// Result of security validation
pub struct SecurityValidationResult {
    pub sanitized_inputs: Vec<String>,
    pub validated: bool,
}

/// Convenience macro for security validation in command handlers
#[macro_export]
macro_rules! security_check {
    ($middleware:expr, $provider:expr, $inputs:expr, $paths:expr) => {
        match $middleware.validate_request($provider, $inputs, $paths).await {
            Ok(result) => result,
            Err(e) => return Err(e),
        }
    };
}

/// Rate limiting specific checks for high-frequency operations
pub async fn check_rate_limit_only(
    security_manager: &Arc<Mutex<SecurityManager>>,
    provider: &str,
) -> Result<(), String> {
    let mut security = security_manager.lock().await;
    if !security.check_rate_limit(provider) {
        error!("Rate limit exceeded for provider: {}", provider);
        return Err("Rate limit exceeded. Please try again later.".to_string());
    }
    Ok(())
}

/// Input sanitization utility
pub async fn sanitize_inputs(
    security_manager: &Arc<Mutex<SecurityManager>>,
    inputs: &[String],
) -> Vec<String> {
    let security = security_manager.lock().await;
    inputs.iter()
        .map(|input| security.sanitize_input(input))
        .collect()
}

/// File path validation utility
pub async fn validate_file_paths(
    security_manager: &Arc<Mutex<SecurityManager>>,
    paths: &[String],
) -> Result<(), String> {
    let security = security_manager.lock().await;
    for path in paths {
        if !security.validate_file_path(path) {
            error!("Invalid file path detected: {}", path);
            return Err(format!("Access to file path '{}' is not allowed", path));
        }
    }
    Ok(())
}