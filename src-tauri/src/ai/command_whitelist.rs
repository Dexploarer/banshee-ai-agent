use anyhow::{Result, Context};
use std::collections::HashSet;
use tracing::{warn, debug};
use regex::Regex;

/// Command whitelist manager for securing command execution
pub struct CommandWhitelist {
    allowed_commands: HashSet<String>,
    allowed_patterns: Vec<Regex>,
    blocked_patterns: Vec<Regex>,
}

impl CommandWhitelist {
    pub fn new() -> Self {
        let mut whitelist = Self {
            allowed_commands: HashSet::new(),
            allowed_patterns: Vec::new(),
            blocked_patterns: Vec::new(),
        };
        
        whitelist.init_default_whitelist();
        whitelist
    }

    /// Initialize with safe default commands
    fn init_default_whitelist(&mut self) {
        // File system operations (read-only and safe write operations)
        self.allowed_commands.extend([
            "ls".to_string(),
            "dir".to_string(), // Windows
            "cat".to_string(),
            "type".to_string(), // Windows
            "head".to_string(),
            "tail".to_string(),
            "find".to_string(),
            "where".to_string(), // Windows
            "grep".to_string(),
            "findstr".to_string(), // Windows
            "wc".to_string(),
            "sort".to_string(),
            "uniq".to_string(),
            "cut".to_string(),
            "awk".to_string(),
            "sed".to_string(),
            "pwd".to_string(),
            "cd".to_string(), // Limited - see patterns
        ]);

        // Development tools
        self.allowed_commands.extend([
            "node".to_string(),
            "npm".to_string(),
            "yarn".to_string(),
            "pnpm".to_string(),
            "bun".to_string(),
            "git".to_string(),
            "cargo".to_string(),
            "rustc".to_string(),
            "python".to_string(),
            "python3".to_string(),
            "pip".to_string(),
            "pip3".to_string(),
            "tsc".to_string(),
            "eslint".to_string(),
            "prettier".to_string(),
        ]);

        // System information (read-only)
        self.allowed_commands.extend([
            "ps".to_string(),
            "tasklist".to_string(), // Windows
            "top".to_string(),
            "htop".to_string(),
            "free".to_string(),
            "df".to_string(),
            "du".to_string(),
            "uname".to_string(),
            "systeminfo".to_string(), // Windows
            "whoami".to_string(),
            "id".to_string(),
            "env".to_string(),
            "set".to_string(), // Windows
            "echo".to_string(),
        ]);

        // Build and test tools
        self.allowed_commands.extend([
            "make".to_string(),
            "cmake".to_string(),
            "mvn".to_string(),
            "gradle".to_string(),
            "ant".to_string(),
            "jest".to_string(),
            "mocha".to_string(),
            "pytest".to_string(),
            "cargo-test".to_string(),
        ]);

        // Safe patterns (using regex for more complex validation)
        self.allowed_patterns = vec![
            // Git operations (safe read operations)
            Regex::new(r"^git\s+(status|log|diff|show|branch|tag|remote|config\s+--get)").unwrap(),
            // Node/npm safe operations
            Regex::new(r"^(npm|yarn|pnpm|bun)\s+(list|ls|info|view|outdated|audit|doctor)").unwrap(),
            // Cargo safe operations
            Regex::new(r"^cargo\s+(check|build|test|doc|tree|search|metadata)").unwrap(),
            // Python safe operations
            Regex::new(r#"^python3?\s+-c\s+['"][^;|&<>]*['"]$"#).unwrap(),
            // File operations with safe paths only
            Regex::new(r"^(cat|head|tail|ls|find)\s+[a-zA-Z0-9._/\-\s]+$").unwrap(),
        ];

        // Dangerous patterns to always block
        self.blocked_patterns = vec![
            // Shell injection attempts
            Regex::new(r"[;|&<>]").unwrap(),
            // Network operations
            Regex::new(r"(curl|wget|nc|netcat|telnet|ssh|scp|rsync)").unwrap(),
            // System modification
            Regex::new(r"(rm|del|sudo|su|chmod|chown|kill|killall|pkill)").unwrap(),
            // Package installation/modification
            Regex::new(r"(npm\s+install|pip\s+install|apt|yum|brew\s+install)").unwrap(),
            // Process control
            Regex::new(r"(nohup|screen|tmux|systemctl|service)").unwrap(),
            // Archive operations that could be dangerous
            Regex::new(r"(tar|zip|unzip|7z).*(-x|-c|--extract|--create)").unwrap(),
        ];
    }

    /// Validate if a command is allowed
    pub fn is_command_allowed(&self, command: &str, args: &[String]) -> Result<bool> {
        let full_command = if args.is_empty() {
            command.to_string()
        } else {
            format!("{} {}", command, args.join(" "))
        };

        debug!("Validating command: {}", full_command);

        // First check blocked patterns
        for pattern in &self.blocked_patterns {
            if pattern.is_match(&full_command) {
                warn!("Command blocked by security pattern: {}", full_command);
                return Ok(false);
            }
        }

        // Check if base command is in whitelist
        if self.allowed_commands.contains(command) {
            debug!("Command allowed by whitelist: {}", command);
            return Ok(true);
        }

        // Check allowed patterns
        for pattern in &self.allowed_patterns {
            if pattern.is_match(&full_command) {
                debug!("Command allowed by pattern: {}", full_command);
                return Ok(true);
            }
        }

        warn!("Command not in whitelist: {}", full_command);
        Ok(false)
    }

    /// Add a command to the whitelist
    pub fn add_command(&mut self, command: String) {
        self.allowed_commands.insert(command);
    }

    /// Add a pattern to the allowed patterns
    pub fn add_pattern(&mut self, pattern: &str) -> Result<()> {
        let regex = Regex::new(pattern)
            .context("Invalid regex pattern")?;
        self.allowed_patterns.push(regex);
        Ok(())
    }

    /// Remove a command from the whitelist
    pub fn remove_command(&mut self, command: &str) {
        self.allowed_commands.remove(command);
    }

    /// Get list of allowed commands
    pub fn get_allowed_commands(&self) -> Vec<String> {
        self.allowed_commands.iter().cloned().collect()
    }

    /// Validate file path for safety
    pub fn is_safe_file_path(&self, path: &str) -> bool {
        // Block dangerous paths
        let dangerous_paths = [
            "/etc/", "/usr/bin/", "/bin/", "/sbin/", "/root/", "/home/*/.",
            "C:\\Windows\\", "C:\\Program Files\\", "C:\\Users\\All Users\\",
            "../", "./.", "~/"
        ];

        for dangerous in &dangerous_paths {
            if path.contains(dangerous) {
                return false;
            }
        }

        // Only allow relative paths and specific safe directories
        !path.starts_with('/') && !path.contains("..") && !path.starts_with("~")
    }

    /// Sanitize command arguments
    pub fn sanitize_args(&self, args: &[String]) -> Vec<String> {
        args.iter()
            .map(|arg| {
                // Remove shell metacharacters
                arg.chars()
                    .filter(|c| !['|', '&', ';', '<', '>', '`', '$', '(', ')', '{', '}'].contains(c))
                    .collect()
            })
            .filter(|arg: &String| !arg.is_empty())
            .collect()
    }
}

/// Global command whitelist instance
lazy_static::lazy_static! {
    pub static ref COMMAND_WHITELIST: std::sync::Mutex<CommandWhitelist> = 
        std::sync::Mutex::new(CommandWhitelist::new());
}

/// Validate command execution with whitelist
pub fn validate_command_execution(command: &str, args: &[String]) -> Result<bool> {
    let whitelist = COMMAND_WHITELIST.lock()
        .map_err(|_| anyhow::anyhow!("Failed to acquire whitelist lock"))?;
    
    whitelist.is_command_allowed(command, args)
}

/// Sanitize command arguments using whitelist
pub fn sanitize_command_args(args: &[String]) -> Vec<String> {
    let whitelist = COMMAND_WHITELIST.lock().unwrap();
    whitelist.sanitize_args(args)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allowed_commands() {
        let whitelist = CommandWhitelist::new();
        
        assert!(whitelist.is_command_allowed("ls", &[]).unwrap());
        assert!(whitelist.is_command_allowed("git", &["status".to_string()]).unwrap());
        assert!(whitelist.is_command_allowed("npm", &["list".to_string()]).unwrap());
    }

    #[test]
    fn test_blocked_commands() {
        let whitelist = CommandWhitelist::new();
        
        assert!(!whitelist.is_command_allowed("rm", &["-rf".to_string(), "/".to_string()]).unwrap());
        assert!(!whitelist.is_command_allowed("curl", &["http://evil.com".to_string()]).unwrap());
        assert!(!whitelist.is_command_allowed("sudo", &["rm".to_string()]).unwrap());
    }

    #[test]
    fn test_shell_injection_blocked() {
        let whitelist = CommandWhitelist::new();
        
        assert!(!whitelist.is_command_allowed("ls", &[";".to_string(), "rm".to_string()]).unwrap());
        assert!(!whitelist.is_command_allowed("echo", &["test".to_string(), "|".to_string()]).unwrap());
    }

    #[test]
    fn test_safe_file_paths() {
        let whitelist = CommandWhitelist::new();
        
        assert!(whitelist.is_safe_file_path("src/main.rs"));
        assert!(whitelist.is_safe_file_path("docs/readme.md"));
        assert!(!whitelist.is_safe_file_path("/etc/passwd"));
        assert!(!whitelist.is_safe_file_path("../../../etc/passwd"));
        assert!(!whitelist.is_safe_file_path("~/../../root/.ssh/"));
    }

    #[test]
    fn test_argument_sanitization() {
        let whitelist = CommandWhitelist::new();
        
        let args = vec![
            "normal_arg".to_string(),
            "arg;with|bad&chars".to_string(),
            "good_arg_123".to_string(),
        ];
        
        let sanitized = whitelist.sanitize_args(&args);
        assert_eq!(sanitized, vec!["normal_arg", "argwithbadchars", "good_arg_123"]);
    }
}