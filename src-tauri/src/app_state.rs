use crate::mcp::oauth_storage::OAuthTokenStorage;
use anyhow::Result;
use std::path::PathBuf;

pub struct AppState {
    pub oauth_storage: OAuthTokenStorage,
}

impl AppState {
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let oauth_storage = OAuthTokenStorage::new(app_data_dir)?;
        
        Ok(Self {
            oauth_storage,
        })
    }
}