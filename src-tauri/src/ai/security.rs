use std::collections::HashMap;
use std::time::{Duration, Instant};
use tracing::{info, warn, error};

#[derive(Debug, Clone)]
pub struct RateLimit {
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
}

#[derive(Debug)]
struct RequestTracker {
    requests: Vec<Instant>,
    last_cleanup: Instant,
}

impl RequestTracker {
    fn new() -> Self {
        Self {
            requests: Vec::new(),
            last_cleanup: Instant::now(),
        }
    }

    fn cleanup_old_requests(&mut self) {
        let now = Instant::now();
        let one_hour_ago = now - Duration::from_secs(3600);
        
        self.requests.retain(|&time| time > one_hour_ago);
        self.last_cleanup = now;
    }

    fn add_request(&mut self) {
        self.requests.push(Instant::now());
        
        // Cleanup every 100 requests to prevent memory bloat
        if self.requests.len() % 100 == 0 {
            self.cleanup_old_requests();
        }
    }

    fn check_rate_limit(&mut self, limit: &RateLimit) -> bool {
        self.cleanup_old_requests();
        
        let now = Instant::now();
        let one_minute_ago = now - Duration::from_secs(60);
        let one_hour_ago = now - Duration::from_secs(3600);
        
        let recent_requests = self.requests.iter()
            .filter(|&&time| time > one_minute_ago)
            .count() as u32;
            
        let hourly_requests = self.requests.iter()
            .filter(|&&time| time > one_hour_ago)
            .count() as u32;
        
        if recent_requests >= limit.requests_per_minute {
            warn!("Rate limit exceeded: {} requests in last minute (limit: {})", 
                  recent_requests, limit.requests_per_minute);
            return false;
        }
        
        if hourly_requests >= limit.requests_per_hour {
            warn!("Rate limit exceeded: {} requests in last hour (limit: {})", 
                  hourly_requests, limit.requests_per_hour);
            return false;
        }
        
        true
    }
}

pub struct SecurityManager {
    rate_limits: HashMap<String, RateLimit>,
    request_trackers: HashMap<String, RequestTracker>,
    blocked_domains: Vec<String>,
    allowed_domains: Option<Vec<String>>,
}

impl SecurityManager {
    pub fn new() -> Self {
        let mut rate_limits = HashMap::new();
        
        // Default rate limits for different providers
        rate_limits.insert("openai".to_string(), RateLimit {
            requests_per_minute: 60,
            requests_per_hour: 1000,
        });
        
        rate_limits.insert("anthropic".to_string(), RateLimit {
            requests_per_minute: 50,
            requests_per_hour: 800,
        });
        
        // Default rate limit for unknown providers
        rate_limits.insert("default".to_string(), RateLimit {
            requests_per_minute: 30,
            requests_per_hour: 500,
        });

        Self {
            rate_limits,
            request_trackers: HashMap::new(),
            blocked_domains: vec![
                "malicious-site.com".to_string(),
                "spam-domain.net".to_string(),
            ],
            allowed_domains: None, // None means all domains are allowed except blocked ones
        }
    }

    pub fn check_rate_limit(&mut self, provider: &str) -> bool {
        let limit = self.rate_limits.get(provider)
            .unwrap_or_else(|| self.rate_limits.get("default").unwrap())
            .clone();

        let tracker = self.request_trackers
            .entry(provider.to_string())
            .or_insert_with(RequestTracker::new);

        if tracker.check_rate_limit(&limit) {
            tracker.add_request();
            info!("Rate limit check passed for provider: {}", provider);
            true
        } else {
            error!("Rate limit exceeded for provider: {}", provider);
            false
        }
    }

    pub fn validate_url(&self, url: &str) -> bool {
        // Parse URL to extract domain
        let domain = match url::Url::parse(url) {
            Ok(parsed_url) => {
                if let Some(host) = parsed_url.host_str() {
                    host.to_string()
                } else {
                    warn!("Invalid URL - no host: {}", url);
                    return false;
                }
            }
            Err(e) => {
                warn!("Failed to parse URL {}: {}", url, e);
                return false;
            }
        };

        // Check blocked domains
        if self.blocked_domains.iter().any(|blocked| domain.contains(blocked)) {
            warn!("Blocked domain detected: {}", domain);
            return false;
        }

        // Check allowed domains if whitelist is enabled
        if let Some(ref allowed) = self.allowed_domains {
            if !allowed.iter().any(|allowed_domain| domain.contains(allowed_domain)) {
                warn!("Domain not in allowlist: {}", domain);
                return false;
            }
        }

        info!("URL validation passed: {}", url);
        true
    }

    pub fn sanitize_input(&self, input: &str) -> String {
        // Basic input sanitization
        let sanitized = input
            .replace('\0', "") // Remove null bytes
            .replace('\r', "") // Remove carriage returns
            .chars()
            .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')
            .collect::<String>();

        // Truncate if too long
        const MAX_INPUT_LENGTH: usize = 100_000;
        if sanitized.len() > MAX_INPUT_LENGTH {
            warn!("Input truncated from {} to {} characters", 
                  sanitized.len(), MAX_INPUT_LENGTH);
            sanitized[..MAX_INPUT_LENGTH].to_string()
        } else {
            sanitized
        }
    }

    pub fn validate_file_path(&self, path: &str) -> bool {
        // Prevent path traversal attacks
        if path.contains("..") || path.contains("//") {
            warn!("Potential path traversal detected: {}", path);
            return false;
        }

        // Prevent access to sensitive system files
        let sensitive_paths = [
            "/etc/passwd",
            "/etc/shadow",
            "/proc/",
            "/sys/",
            "C:\\Windows\\System32",
            "C:\\Windows\\SysWOW64",
        ];

        for sensitive in &sensitive_paths {
            if path.starts_with(sensitive) {
                warn!("Access to sensitive path blocked: {}", path);
                return false;
            }
        }

        info!("File path validation passed: {}", path);
        true
    }

    pub fn add_blocked_domain(&mut self, domain: String) {
        self.blocked_domains.push(domain);
    }

    pub fn set_allowed_domains(&mut self, domains: Vec<String>) {
        self.allowed_domains = Some(domains);
    }

    pub fn update_rate_limit(&mut self, provider: String, limit: RateLimit) {
        self.rate_limits.insert(provider, limit);
    }

    pub fn get_request_stats(&self, provider: &str) -> Option<(usize, usize)> {
        self.request_trackers.get(provider).map(|tracker| {
            let now = Instant::now();
            let one_minute_ago = now - Duration::from_secs(60);
            let one_hour_ago = now - Duration::from_secs(3600);
            
            let recent = tracker.requests.iter()
                .filter(|&&time| time > one_minute_ago)
                .count();
                
            let hourly = tracker.requests.iter()
                .filter(|&&time| time > one_hour_ago)
                .count();
                
            (recent, hourly)
        })
    }
}