/**
 * MCP OAuth Token Manager
 * Handles secure token storage, refresh, and lifecycle management
 */

import { invoke } from '@tauri-apps/api/core';

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_at: number; // Unix timestamp
  refresh_token?: string;
  scope?: string;
}

export interface TokenStorageEntry {
  serverId: string;
  token: OAuthToken;
  encrypted: boolean;
  createdAt: number;
  lastUsed: number;
}

export class MCPTokenManager {
  private static instance: MCPTokenManager;
  private tokenCache = new Map<string, TokenStorageEntry>();
  private refreshPromises = new Map<string, Promise<OAuthToken | null>>();

  private constructor() {
    // Load tokens from secure storage on initialization
    this.loadStoredTokens().catch(console.error);
  }

  static getInstance(): MCPTokenManager {
    if (!MCPTokenManager.instance) {
      MCPTokenManager.instance = new MCPTokenManager();
    }
    return MCPTokenManager.instance;
  }

  /**
   * Get a valid token for a server, refreshing if necessary
   */
  async getValidToken(
    serverId: string,
    refreshCallback?: (refreshToken: string) => Promise<OAuthToken>
  ): Promise<OAuthToken | null> {
    // Check cache first
    const cached = this.tokenCache.get(serverId);
    if (cached && !this.isTokenExpired(cached.token)) {
      // Update last used timestamp
      cached.lastUsed = Date.now();
      return cached.token;
    }

    // If token is expired and we have a refresh token, try to refresh
    if (cached?.token.refresh_token && refreshCallback) {
      // Prevent multiple simultaneous refresh attempts
      const existingRefresh = this.refreshPromises.get(serverId);
      if (existingRefresh) {
        return existingRefresh;
      }

      const refreshPromise = this.refreshToken(
        serverId,
        cached.token.refresh_token,
        refreshCallback
      );
      this.refreshPromises.set(serverId, refreshPromise);

      try {
        const newToken = await refreshPromise;
        return newToken;
      } finally {
        this.refreshPromises.delete(serverId);
      }
    }

    return null;
  }

  /**
   * Store a new token
   */
  async storeToken(serverId: string, token: OAuthToken): Promise<void> {
    const entry: TokenStorageEntry = {
      serverId,
      token,
      encrypted: true,
      createdAt: Date.now(),
      lastUsed: Date.now(),
    };

    // Store in memory cache
    this.tokenCache.set(serverId, entry);

    // Persist to secure storage
    await this.persistToken(entry);
  }

  /**
   * Remove a token
   */
  async removeToken(serverId: string): Promise<void> {
    this.tokenCache.delete(serverId);
    await this.deletePersistedToken(serverId);
  }

  /**
   * Check if a token is expired
   */
  private isTokenExpired(token: OAuthToken): boolean {
    if (!token.expires_at) {
      // If no expiration, assume it's valid
      return false;
    }

    // Add 5 minute buffer before actual expiration
    const bufferMs = 5 * 60 * 1000;
    return Date.now() + bufferMs >= token.expires_at * 1000;
  }

  /**
   * Refresh an expired token
   */
  private async refreshToken(
    serverId: string,
    refreshToken: string,
    refreshCallback: (refreshToken: string) => Promise<OAuthToken>
  ): Promise<OAuthToken | null> {
    try {
      const newToken = await refreshCallback(refreshToken);

      // Store the refreshed token
      await this.storeToken(serverId, newToken);

      return newToken;
    } catch (error) {
      console.error(`Failed to refresh token for ${serverId}:`, error);

      // Remove the invalid token
      await this.removeToken(serverId);

      return null;
    }
  }

  /**
   * Load stored tokens from secure storage
   */
  private async loadStoredTokens(): Promise<void> {
    try {
      // Use Tauri's secure storage API
      const encryptedTokens = await invoke<Record<string, string>>('get_mcp_oauth_tokens');

      for (const [serverId, encryptedData] of Object.entries(encryptedTokens)) {
        try {
          // Decrypt the token data
          const decrypted = await invoke<string>('decrypt_data', { data: encryptedData });
          const entry: TokenStorageEntry = JSON.parse(decrypted);

          // Only load non-expired tokens
          if (!this.isTokenExpired(entry.token)) {
            this.tokenCache.set(serverId, entry);
          }
        } catch (error) {
          console.error(`Failed to load token for ${serverId}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
    }
  }

  /**
   * Persist a token to secure storage
   */
  private async persistToken(entry: TokenStorageEntry): Promise<void> {
    try {
      // Encrypt the token data
      const data = JSON.stringify(entry);
      const encrypted = await invoke<string>('encrypt_data', { data });

      // Store in secure storage
      await invoke('store_mcp_oauth_token', {
        serverId: entry.serverId,
        encryptedData: encrypted,
      });
    } catch (error) {
      console.error('Failed to persist token:', error);
    }
  }

  /**
   * Delete a persisted token
   */
  private async deletePersistedToken(serverId: string): Promise<void> {
    try {
      await invoke('delete_mcp_oauth_token', { serverId });
    } catch (error) {
      console.error('Failed to delete token:', error);
    }
  }

  /**
   * Clear all tokens (for logout)
   */
  async clearAllTokens(): Promise<void> {
    this.tokenCache.clear();
    this.refreshPromises.clear();

    try {
      await invoke('clear_all_mcp_oauth_tokens');
    } catch (error) {
      console.error('Failed to clear all tokens:', error);
    }
  }

  /**
   * Get token statistics
   */
  getTokenStats(): {
    totalTokens: number;
    activeTokens: number;
    expiredTokens: number;
  } {
    let activeTokens = 0;
    let expiredTokens = 0;

    Array.from(this.tokenCache.entries()).forEach(([_serverId, entry]) => {
      if (this.isTokenExpired(entry.token)) {
        expiredTokens++;
      } else {
        activeTokens++;
      }
    });

    return {
      totalTokens: this.tokenCache.size,
      activeTokens,
      expiredTokens,
    };
  }
}

export const tokenManager = MCPTokenManager.getInstance();
