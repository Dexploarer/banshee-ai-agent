use reqwest::{Client, Method, Response};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tracing::{info, error};
use anyhow::{Result, Context};

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

pub struct HttpClientManager {
    client: Client,
}

impl HttpClientManager {
    pub fn new() -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("TauriApp/1.0.0")
            .build()
            .context("Failed to create HTTP client")?;

        info!("HTTP client manager initialized");
        Ok(Self { client })
    }

    pub async fn make_request(&self, request: HttpRequest) -> Result<HttpResponse> {
        info!("Making HTTP request to: {} {}", request.method, request.url);

        let method = match request.method.to_uppercase().as_str() {
            "GET" => Method::GET,
            "POST" => Method::POST,
            "PUT" => Method::PUT,
            "DELETE" => Method::DELETE,
            "PATCH" => Method::PATCH,
            "HEAD" => Method::HEAD,
            "OPTIONS" => Method::OPTIONS,
            _ => {
                error!("Unsupported HTTP method: {}", request.method);
                return Err(anyhow::anyhow!("Unsupported HTTP method: {}", request.method));
            }
        };

        let mut req_builder = self.client.request(method, &request.url);

        // Add headers if provided
        if let Some(headers) = request.headers {
            for (key, value) in headers {
                req_builder = req_builder.header(&key, &value);
            }
        }

        // Add body if provided
        if let Some(body) = request.body {
            req_builder = req_builder.body(body);
        }

        let response = req_builder
            .send()
            .await
            .context("Failed to send HTTP request")?;

        self.response_to_http_response(response).await
    }

    async fn response_to_http_response(&self, response: Response) -> Result<HttpResponse> {
        let status = response.status().as_u16();
        
        let headers: HashMap<String, String> = response
            .headers()
            .iter()
            .map(|(name, value)| {
                (
                    name.to_string(),
                    value.to_str().unwrap_or("").to_string(),
                )
            })
            .collect();

        let body = response
            .text()
            .await
            .context("Failed to read response body")?;

        info!("HTTP response received: status {}, body length: {}", status, body.len());

        Ok(HttpResponse {
            status,
            headers,
            body,
        })
    }

    pub async fn download_file(&self, url: &str) -> Result<Vec<u8>> {
        info!("Downloading file from: {}", url);

        let response = self.client
            .get(url)
            .send()
            .await
            .context("Failed to download file")?;

        if !response.status().is_success() {
            error!("Failed to download file: HTTP {}", response.status());
            return Err(anyhow::anyhow!("HTTP error: {}", response.status()));
        }

        let content_length = response.content_length().unwrap_or(0);
        info!("Downloading {} bytes", content_length);

        let bytes = response
            .bytes()
            .await
            .context("Failed to read file content")?;

        info!("Successfully downloaded {} bytes", bytes.len());
        Ok(bytes.to_vec())
    }

    pub async fn upload_file(&self, url: &str, file_data: Vec<u8>, content_type: &str) -> Result<HttpResponse> {
        info!("Uploading file to: {} ({} bytes)", url, file_data.len());

        let response = self.client
            .post(url)
            .header("Content-Type", content_type)
            .body(file_data)
            .send()
            .await
            .context("Failed to upload file")?;

        self.response_to_http_response(response).await
    }

    pub async fn check_url_reachable(&self, url: &str) -> Result<bool> {
        info!("Checking if URL is reachable: {}", url);

        match self.client
            .head(url)
            .timeout(Duration::from_secs(10))
            .send()
            .await
        {
            Ok(response) => {
                let reachable = response.status().is_success();
                info!("URL {} is {}", url, if reachable { "reachable" } else { "not reachable" });
                Ok(reachable)
            }
            Err(e) => {
                error!("Failed to check URL {}: {}", url, e);
                Ok(false)
            }
        }
    }
}