use anyhow::{Result, Context};
use std::collections::HashSet;
use tracing::{warn, debug};
use regex::Regex;

/// Error sanitization utilities to prevent information disclosure
pub struct ErrorSanitizer {
    sensitive_patterns: Vec<Regex>,
    safe_error_messages: std::collections::HashMap<String, String>,
}

impl ErrorSanitizer {
    pub fn new() -> Self {
        let mut sanitizer = Self {
            sensitive_patterns: Vec::new(),
            safe_error_messages: std::collections::HashMap::new(),
        };
        
        sanitizer.init_patterns();
        sanitizer.init_safe_messages();
        sanitizer
    }

    /// Initialize patterns that identify sensitive information
    fn init_patterns(&mut self) {
        // File paths (especially system paths)
        self.sensitive_patterns.push(
            Regex::new(r"/(?:etc|usr|bin|sbin|root|home)/[^\s]*").unwrap()
        );
        self.sensitive_patterns.push(
            Regex::new(r"C:\\(?:Windows|Program Files|Users)\\[^\s]*").unwrap()
        );
        
        // API keys and tokens
        self.sensitive_patterns.push(
            Regex::new(r"(?i)(api[_-]?key|token|secret|password)[=:\s]+[a-zA-Z0-9+/=]{10,}").unwrap()
        );
        
        // Connection strings and URLs with credentials
        self.sensitive_patterns.push(
            Regex::new(r"(?i)(?:https?|ftp|database)://[^@]+:[^@]+@[^\s]+").unwrap()
        );
        
        // Database connection details
        self.sensitive_patterns.push(
            Regex::new(r"(?i)(host|server|database)[=:\s]+[^\s;]+").unwrap()
        );
        
        // Email addresses
        self.sensitive_patterns.push(
            Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap()
        );
        
        // IP addresses (private ranges can be sensitive)
        self.sensitive_patterns.push(
            Regex::new(r"\b(?:10\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)\d{1,3}\.\d{1,3}\b").unwrap()
        );
        
        // Stack traces with file paths
        self.sensitive_patterns.push(
            Regex::new(r"at [a-zA-Z0-9._]+\([^)]*:[0-9]+:[0-9]+\)").unwrap()
        );
        
        // Environment variables
        self.sensitive_patterns.push(
            Regex::new(r"(?i)(env|environment)[=:\s]+[a-zA-Z_][a-zA-Z0-9_]*").unwrap()
        );
        
        // User-specific paths
        self.sensitive_patterns.push(
            Regex::new(r"/(?:home|Users)/[^/\s]+").unwrap()
        );
    }

    /// Initialize safe error messages for common error types
    fn init_safe_messages(&mut self) {
        self.safe_error_messages.insert(
            "file_not_found".to_string(),
            "The requested file could not be found".to_string()
        );
        self.safe_error_messages.insert(
            "permission_denied".to_string(),
            "Access denied - insufficient permissions".to_string()
        );
        self.safe_error_messages.insert(
            "connection_failed".to_string(),
            "Connection failed - unable to reach destination".to_string()
        );
        self.safe_error_messages.insert(
            "authentication_failed".to_string(),
            "Authentication failed - invalid credentials".to_string()
        );
        self.safe_error_messages.insert(
            "invalid_input".to_string(),
            "Invalid input provided".to_string()
        );
        self.safe_error_messages.insert(
            "internal_error".to_string(),
            "An internal error occurred".to_string()
        );
        self.safe_error_messages.insert(
            "timeout".to_string(),
            "Operation timed out".to_string()
        );
        self.safe_error_messages.insert(
            "rate_limited".to_string(),
            "Request rate limit exceeded".to_string()
        );
        self.safe_error_messages.insert(
            "invalid_configuration".to_string(),
            "Invalid configuration detected".to_string()
        );
        self.safe_error_messages.insert(
            "resource_unavailable".to_string(),
            "Requested resource is currently unavailable".to_string()
        );
    }

    /// Sanitize an error message by removing sensitive information
    pub fn sanitize_error(&self, error_message: &str) -> String {
        let mut sanitized = error_message.to_string();
        
        // Replace sensitive patterns with redacted versions
        for pattern in &self.sensitive_patterns {
            sanitized = pattern.replace_all(&sanitized, "[REDACTED]").to_string();
        }
        
        // If the sanitized message is too different or empty, use a generic message
        if sanitized.len() < error_message.len() / 2 || sanitized.trim().is_empty() {
            return "An error occurred during processing".to_string();
        }
        
        sanitized
    }

    /// Get a safe error message for a specific error type
    pub fn get_safe_message(&self, error_type: &str) -> String {
        self.safe_error_messages
            .get(error_type)
            .cloned()
            .unwrap_or_else(|| "An error occurred".to_string())
    }

    /// Categorize an error and return appropriate safe message
    pub fn categorize_and_sanitize(&self, error: &anyhow::Error) -> (String, String) {
        let error_string = error.to_string().to_lowercase();
        
        let category = if error_string.contains("not found") || error_string.contains("no such file") {
            "file_not_found"
        } else if error_string.contains("permission") || error_string.contains("access denied") {
            "permission_denied"
        } else if error_string.contains("connection") || error_string.contains("network") {
            "connection_failed"
        } else if error_string.contains("authentication") || error_string.contains("unauthorized") {
            "authentication_failed"
        } else if error_string.contains("timeout") {
            "timeout"
        } else if error_string.contains("rate limit") {
            "rate_limited"
        } else if error_string.contains("invalid") || error_string.contains("malformed") {
            "invalid_input"
        } else {
            "internal_error"
        };
        
        let safe_message = self.get_safe_message(category);
        let sanitized_details = self.sanitize_error(&error.to_string());
        
        (category.to_string(), safe_message)
    }

    /// Check if an error message contains sensitive information
    pub fn contains_sensitive_info(&self, message: &str) -> bool {
        for pattern in &self.sensitive_patterns {
            if pattern.is_match(message) {
                return true;
            }
        }
        false
    }

    /// Create a sanitized error for logging (more details for internal use)
    pub fn create_log_safe_error(&self, error: &anyhow::Error) -> String {
        let error_msg = error.to_string();
        
        // For logs, we can keep more information but still sanitize sensitive data
        let mut sanitized = error_msg.clone();
        
        // Only redact the most sensitive patterns for logs
        let critical_patterns = [
            r"(?i)(api[_-]?key|token|secret|password)[=:\s]+[a-zA-Z0-9+/=]{10,}",
            r"(?i)(?:https?|ftp|database)://[^@]+:[^@]+@[^\s]+",
        ];
        
        for pattern_str in &critical_patterns {
            if let Ok(pattern) = Regex::new(pattern_str) {
                sanitized = pattern.replace_all(&sanitized, "[REDACTED]").to_string();
            }
        }
        
        sanitized
    }
}

/// Global error sanitizer instance
lazy_static::lazy_static! {
    pub static ref ERROR_SANITIZER: ErrorSanitizer = ErrorSanitizer::new();
}

/// Sanitize error for user-facing display
pub fn sanitize_user_error(error: &anyhow::Error) -> String {
    let (_, safe_message) = ERROR_SANITIZER.categorize_and_sanitize(error);
    safe_message
}

/// Sanitize error for internal logging
pub fn sanitize_log_error(error: &anyhow::Error) -> String {
    ERROR_SANITIZER.create_log_safe_error(error)
}

/// Check if error contains sensitive information
pub fn has_sensitive_info(message: &str) -> bool {
    ERROR_SANITIZER.contains_sensitive_info(message)
}

/// Macro for safe error logging
#[macro_export]
macro_rules! log_safe_error {
    ($level:ident, $error:expr, $context:expr) => {
        tracing::$level!(
            error = %crate::ai::error_sanitization::sanitize_log_error($error),
            context = $context,
            "Sanitized error occurred"
        );
    };
}

/// Macro for safe error responses
#[macro_export]
macro_rules! safe_error_response {
    ($error:expr) => {
        crate::ai::error_sanitization::sanitize_user_error($error)
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::anyhow;

    #[test]
    fn test_sanitize_file_paths() {
        let sanitizer = ErrorSanitizer::new();
        
        let error_msg = "File not found: /etc/passwd";
        let sanitized = sanitizer.sanitize_error(error_msg);
        assert!(sanitized.contains("[REDACTED]"));
        assert!(!sanitized.contains("/etc/passwd"));
    }

    #[test]
    fn test_sanitize_api_keys() {
        let sanitizer = ErrorSanitizer::new();
        
        let error_msg = "Authentication failed: api_key=sk_1234567890abcdef";
        let sanitized = sanitizer.sanitize_error(error_msg);
        assert!(sanitized.contains("[REDACTED]"));
        assert!(!sanitized.contains("sk_1234567890abcdef"));
    }

    #[test]
    fn test_categorize_errors() {
        let sanitizer = ErrorSanitizer::new();
        
        let error = anyhow!("File not found: test.txt");
        let (category, safe_msg) = sanitizer.categorize_and_sanitize(&error);
        assert_eq!(category, "file_not_found");
        assert_eq!(safe_msg, "The requested file could not be found");
    }

    #[test]
    fn test_sensitive_detection() {
        let sanitizer = ErrorSanitizer::new();
        
        assert!(sanitizer.contains_sensitive_info("Error in /home/user/.ssh/key"));
        assert!(sanitizer.contains_sensitive_info("API key: abc123def456"));
        assert!(!sanitizer.contains_sensitive_info("Simple error message"));
    }

    #[test]
    fn test_log_safe_error() {
        let sanitizer = ErrorSanitizer::new();
        
        let error = anyhow!("Database connection failed: postgres://user:pass@localhost/db");
        let log_safe = sanitizer.create_log_safe_error(&error);
        assert!(log_safe.contains("[REDACTED]"));
        assert!(!log_safe.contains("user:pass"));
    }
}