#[cfg(test)]
mod security_tests {
    use super::security::SecurityManager;
    use super::error_sanitization::{sanitize_error_message, ErrorSanitizer};
    use super::encryption::{EncryptionService, AESEncryptionService};
    use super::types::SecurityConfig;
    use std::collections::HashMap;

    #[test]
    fn test_security_manager_initialization() {
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024 * 1024, // 1MB
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let security_manager = SecurityManager::new(config.clone());
        
        assert_eq!(security_manager.config.rate_limit_requests, 100);
        assert_eq!(security_manager.config.rate_limit_window_seconds, 60);
        assert_eq!(security_manager.config.max_request_size_bytes, 1024 * 1024);
        assert!(security_manager.config.enable_csrf_protection);
    }

    #[test]
    fn test_rate_limiting() {
        let config = SecurityConfig {
            rate_limit_requests: 5,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024,
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let mut security_manager = SecurityManager::new(config);
        let client_id = "test_client_123";
        
        // First 5 requests should pass
        for _ in 0..5 {
            assert!(security_manager.check_rate_limit(client_id));
        }
        
        // 6th request should fail
        assert!(!security_manager.check_rate_limit(client_id));
        
        // Different client should still work
        assert!(security_manager.check_rate_limit("different_client"));
    }

    #[test]
    fn test_input_validation() {
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1000,
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let mut security_manager = SecurityManager::new(config);
        
        // Valid input
        let valid_input = "This is a normal input string with no dangerous content";
        assert!(security_manager.validate_input(valid_input).is_ok());
        
        // XSS attempt
        let xss_input = "<script>alert('xss')</script>";
        assert!(security_manager.validate_input(xss_input).is_err());
        
        // SQL injection attempt
        let sql_injection = "'; DROP TABLE users; --";
        assert!(security_manager.validate_input(sql_injection).is_err());
        
        // Path traversal attempt
        let path_traversal = "../../../etc/passwd";
        assert!(security_manager.validate_input(path_traversal).is_err());
        
        // Command injection attempt
        let command_injection = "test; rm -rf /";
        assert!(security_manager.validate_input(command_injection).is_err());
        
        // Oversized input
        let large_input = "x".repeat(1001);
        assert!(security_manager.validate_input(&large_input).is_err());
    }

    #[test]
    fn test_url_validation() {
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024,
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let security_manager = SecurityManager::new(config);
        
        // Valid URLs
        let valid_urls = vec![
            "https://example.com",
            "https://api.example.com/v1/data",
            "https://localhost:3000/api",
            "https://subdomain.example.com/path?query=value",
        ];
        
        for url in valid_urls {
            assert!(security_manager.validate_url(url).is_ok(), "URL should be valid: {}", url);
        }
        
        // Invalid URLs
        let invalid_urls = vec![
            "http://example.com",        // HTTP not HTTPS
            "javascript:alert('xss')",   // JavaScript protocol
            "file:///etc/passwd",        // File protocol
            "ftp://example.com",         // FTP protocol
            "data:text/html,<script>",   // Data protocol
            "",                          // Empty URL
            "not-a-url",                 // Invalid format
            "https://",                  // Incomplete URL
        ];
        
        for url in invalid_urls {
            assert!(security_manager.validate_url(url).is_err(), "URL should be invalid: {}", url);
        }
    }

    #[test]
    fn test_origin_validation() {
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024,
            allowed_origins: vec![
                "https://localhost:3000".to_string(),
                "https://app.example.com".to_string(),
            ],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let security_manager = SecurityManager::new(config);
        
        // Valid origins
        assert!(security_manager.validate_origin("https://localhost:3000"));
        assert!(security_manager.validate_origin("https://app.example.com"));
        
        // Invalid origins
        assert!(!security_manager.validate_origin("https://evil.com"));
        assert!(!security_manager.validate_origin("http://localhost:3000")); // HTTP instead of HTTPS
        assert!(!security_manager.validate_origin("https://localhost:3001")); // Wrong port
        assert!(!security_manager.validate_origin(""));
    }

    #[test]
    fn test_csrf_token_generation_and_validation() {
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024,
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let mut security_manager = SecurityManager::new(config);
        let session_id = "test_session_456";
        
        // Generate CSRF token
        let token = security_manager.generate_csrf_token(session_id);
        assert!(!token.is_empty());
        assert!(token.len() >= 32); // Should be reasonably long
        
        // Valid token should validate
        assert!(security_manager.validate_csrf_token(session_id, &token));
        
        // Invalid token should fail
        assert!(!security_manager.validate_csrf_token(session_id, "invalid_token"));
        
        // Token for different session should fail
        assert!(!security_manager.validate_csrf_token("different_session", &token));
        
        // Empty token should fail
        assert!(!security_manager.validate_csrf_token(session_id, ""));
    }

    #[test]
    fn test_session_management() {
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024,
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 1, // 1 minute for testing
        };
        
        let mut security_manager = SecurityManager::new(config);
        let session_id = "test_session_789";
        
        // Create new session
        security_manager.create_session(session_id, "test_user");
        
        // Session should be valid initially
        assert!(security_manager.validate_session(session_id));
        
        // Session should contain correct user
        assert_eq!(security_manager.get_session_user(session_id), Some("test_user".to_string()));
        
        // Extend session
        security_manager.extend_session(session_id);
        assert!(security_manager.validate_session(session_id));
        
        // Invalidate session
        security_manager.invalidate_session(session_id);
        assert!(!security_manager.validate_session(session_id));
    }

    #[test]
    fn test_encryption_service() {
        let mut encryption_service = AESEncryptionService::new();
        let plaintext = "This is sensitive data that needs to be encrypted";
        
        // Test encryption
        let encrypted_result = encryption_service.encrypt(plaintext.as_bytes());
        assert!(encrypted_result.is_ok());
        
        let encrypted_data = encrypted_result.unwrap();
        assert!(!encrypted_data.is_empty());
        assert_ne!(encrypted_data, plaintext.as_bytes());
        
        // Test decryption
        let decrypted_result = encryption_service.decrypt(&encrypted_data);
        assert!(decrypted_result.is_ok());
        
        let decrypted_data = decrypted_result.unwrap();
        let decrypted_string = String::from_utf8(decrypted_data).unwrap();
        assert_eq!(decrypted_string, plaintext);
        
        // Test encryption with different keys produces different results
        let mut encryption_service2 = AESEncryptionService::new();
        let encrypted_data2 = encryption_service2.encrypt(plaintext.as_bytes()).unwrap();
        
        // Different keys should produce different encrypted data
        assert_ne!(encrypted_data, encrypted_data2);
        
        // But decryption should fail with wrong service
        let wrong_decrypt_result = encryption_service2.decrypt(&encrypted_data);
        assert!(wrong_decrypt_result.is_err());
    }

    #[test]
    fn test_error_sanitization() {
        let sanitizer = ErrorSanitizer::new();
        
        // Test sanitization of sensitive information
        let sensitive_errors = vec![
            ("Database error: Connection failed for user 'admin' with password 'secret123'", 
             "Database connection error"),
            ("SQL Error: SELECT * FROM users WHERE password = 'leaked_password'", 
             "Database query error"),
            ("File not found: /home/user/.ssh/id_rsa", 
             "File access error"),
            ("Authentication failed for API key: sk-1234567890abcdef", 
             "Authentication error"),
            ("Invalid token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", 
             "Token validation error"),
        ];
        
        for (original, expected_type) in sensitive_errors {
            let sanitized = sanitizer.sanitize_error(original);
            assert!(!sanitized.contains("admin"));
            assert!(!sanitized.contains("secret123"));
            assert!(!sanitized.contains("password"));
            assert!(!sanitized.contains("leaked_password"));
            assert!(!sanitized.contains("id_rsa"));
            assert!(!sanitized.contains("sk-1234567890abcdef"));
            assert!(!sanitized.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
            
            // Should categorize error type
            assert!(sanitized.to_lowercase().contains(&expected_type.to_lowercase().split(' ').next().unwrap()));
        }
        
        // Test that normal errors are preserved
        let normal_error = "Invalid input: field cannot be empty";
        let sanitized_normal = sanitizer.sanitize_error(normal_error);
        assert_eq!(sanitized_normal, normal_error);
    }

    #[test]
    fn test_sanitize_error_message_function() {
        // Test various sensitive patterns
        let test_cases = vec![
            ("Error: user password is 'admin123'", false),
            ("Database connection failed", true),
            ("API key sk-1234567890 is invalid", false),
            ("File not found: /etc/passwd", false),
            ("Invalid request format", true),
            ("SQL injection detected: DROP TABLE users", false),
        ];
        
        for (error_msg, should_contain_original) in test_cases {
            let sanitized = sanitize_error_message(error_msg);
            
            if should_contain_original {
                assert_eq!(sanitized, error_msg, "Safe error should be unchanged");
            } else {
                assert_ne!(sanitized, error_msg, "Sensitive error should be sanitized");
                assert!(!sanitized.contains("admin123"));
                assert!(!sanitized.contains("sk-1234567890"));
                assert!(!sanitized.contains("/etc/passwd"));
                assert!(!sanitized.contains("DROP TABLE"));
            }
        }
    }

    #[test]
    fn test_security_headers_validation() {
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024,
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let security_manager = SecurityManager::new(config);
        
        // Test Content-Type validation
        let valid_content_types = vec![
            "application/json",
            "application/json; charset=utf-8",
            "text/plain",
            "multipart/form-data",
        ];
        
        for content_type in valid_content_types {
            assert!(security_manager.validate_content_type(content_type), 
                   "Content type should be valid: {}", content_type);
        }
        
        let invalid_content_types = vec![
            "text/html",                    // Could enable XSS
            "application/javascript",       // Could enable code injection
            "text/xml",                     // Could enable XXE attacks
            "",                            // Empty content type
        ];
        
        for content_type in invalid_content_types {
            assert!(!security_manager.validate_content_type(content_type), 
                   "Content type should be invalid: {}", content_type);
        }
    }

    #[test]
    fn test_input_size_limits() {
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024, // 1KB limit
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let mut security_manager = SecurityManager::new(config);
        
        // Input within limit should pass
        let small_input = "x".repeat(1023);
        assert!(security_manager.validate_input(&small_input).is_ok());
        
        // Input at limit should pass
        let limit_input = "x".repeat(1024);
        assert!(security_manager.validate_input(&limit_input).is_ok());
        
        // Input over limit should fail
        let large_input = "x".repeat(1025);
        assert!(security_manager.validate_input(&large_input).is_err());
        
        // Much larger input should definitely fail
        let huge_input = "x".repeat(10000);
        assert!(security_manager.validate_input(&huge_input).is_err());
    }

    #[test]
    fn test_concurrent_rate_limiting() {
        use std::sync::{Arc, Mutex};
        use std::thread;
        
        let config = SecurityConfig {
            rate_limit_requests: 100,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024,
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let security_manager = Arc::new(Mutex::new(SecurityManager::new(config)));
        let client_id = "concurrent_test_client";
        
        // Spawn multiple threads to test concurrent access
        let handles: Vec<_> = (0..10).map(|i| {
            let manager = security_manager.clone();
            let client_id = format!("{}_{}", client_id, i);
            
            thread::spawn(move || {
                let mut results = Vec::new();
                for _ in 0..20 {
                    let mut manager = manager.lock().unwrap();
                    results.push(manager.check_rate_limit(&client_id));
                }
                results
            })
        }).collect();
        
        // Wait for all threads to complete
        let all_results: Vec<Vec<bool>> = handles.into_iter()
            .map(|h| h.join().unwrap())
            .collect();
        
        // Each client should have been rate limited properly
        for results in all_results {
            assert_eq!(results.len(), 20);
            // Most requests should succeed since we have separate limits per client
            let success_count = results.iter().filter(|&&r| r).count();
            assert!(success_count > 0);
        }
    }

    #[test]
    fn test_security_middleware_integration() {
        // This test simulates how SecurityManager would be used in the actual command flow
        let config = SecurityConfig {
            rate_limit_requests: 10,
            rate_limit_window_seconds: 60,
            max_request_size_bytes: 1024,
            allowed_origins: vec!["https://localhost:3000".to_string()],
            enable_csrf_protection: true,
            session_timeout_minutes: 30,
        };
        
        let mut security_manager = SecurityManager::new(config);
        
        // Simulate a complete request validation flow
        let client_id = "integration_test_client";
        let session_id = "integration_test_session";
        let origin = "https://localhost:3000";
        let input_data = r#"{"action": "save_memory", "content": "Test memory content"}"#;
        
        // Step 1: Check rate limiting
        assert!(security_manager.check_rate_limit(client_id));
        
        // Step 2: Validate origin
        assert!(security_manager.validate_origin(origin));
        
        // Step 3: Validate input
        assert!(security_manager.validate_input(input_data).is_ok());
        
        // Step 4: Create session
        security_manager.create_session(session_id, "test_user");
        
        // Step 5: Generate and validate CSRF token
        let csrf_token = security_manager.generate_csrf_token(session_id);
        assert!(security_manager.validate_csrf_token(session_id, &csrf_token));
        
        // Step 6: Validate session is still active
        assert!(security_manager.validate_session(session_id));
        
        // All security checks should pass for valid request
        assert!(true); // If we get here, all validations passed
    }
}