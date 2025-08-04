/**
 * MCP OAuth Flow Handler
 * Implements OAuth 2.0 authorization code flow with PKCE
 */

import { invoke } from '@tauri-apps/api/core';
import type { OAuthToken } from './token-manager';
import { tokenManager } from './token-manager';

export interface OAuthConfig {
  serverId: string;
  clientId: string;
  clientSecret?: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
  redirectUri?: string;
  usePKCE?: boolean;
}

export interface OAuthState {
  serverId: string;
  state: string;
  codeVerifier?: string;
  createdAt: number;
}

export class MCPOAuthFlow {
  private static instance: MCPOAuthFlow;
  private pendingStates = new Map<string, OAuthState>();
  private readonly REDIRECT_URI = 'http://localhost:19703/oauth/callback';
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    // Clean up expired states periodically
    setInterval(() => this.cleanupExpiredStates(), 60 * 1000);
  }

  static getInstance(): MCPOAuthFlow {
    if (!MCPOAuthFlow.instance) {
      MCPOAuthFlow.instance = new MCPOAuthFlow();
    }
    return MCPOAuthFlow.instance;
  }

  /**
   * Start OAuth authorization flow
   */
  async startAuthorizationFlow(config: OAuthConfig): Promise<string> {
    // Generate secure random state
    const state = this.generateSecureRandom();

    // Generate PKCE code verifier if needed
    let codeVerifier: string | undefined;
    let codeChallenge: string | undefined;

    if (config.usePKCE !== false) {
      codeVerifier = this.generateCodeVerifier();
      codeChallenge = await this.generateCodeChallenge(codeVerifier);
    }

    // Store state for validation
    const oauthState: OAuthState = {
      serverId: config.serverId,
      state,
      codeVerifier,
      createdAt: Date.now(),
    };
    this.pendingStates.set(state, oauthState);

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri || this.REDIRECT_URI,
      scope: config.scopes.join(' '),
      state,
    });

    if (codeChallenge) {
      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');
    }

    const authUrl = `${config.authorizationEndpoint}?${params.toString()}`;

    // Open authorization URL in browser
    await invoke('open_oauth_browser', { url: authUrl });

    return state;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string, config: OAuthConfig): Promise<OAuthToken> {
    // Validate state
    const storedState = this.pendingStates.get(state);
    if (!storedState) {
      throw new Error('Invalid OAuth state');
    }

    if (storedState.serverId !== config.serverId) {
      throw new Error('State mismatch for server');
    }

    // Clean up state
    this.pendingStates.delete(state);

    // Exchange code for token
    const token = await this.exchangeCodeForToken(code, config, storedState.codeVerifier);

    // Store token securely
    await tokenManager.storeToken(config.serverId, token);

    return token;
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(
    code: string,
    config: OAuthConfig,
    codeVerifier?: string
  ): Promise<OAuthToken> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri || this.REDIRECT_URI,
      client_id: config.clientId,
    });

    if (config.clientSecret) {
      params.append('client_secret', config.clientSecret);
    }

    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }

    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenResponse = await response.json();

    // Calculate expiration timestamp
    const expiresAt = tokenResponse.expires_in
      ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
      : Math.floor(Date.now() / 1000) + 3600; // Default 1 hour

    const token: OAuthToken = {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type || 'Bearer',
      expires_at: expiresAt,
      refresh_token: tokenResponse.refresh_token,
      scope: tokenResponse.scope,
    };

    return token;
  }

  /**
   * Refresh an access token
   */
  async refreshAccessToken(refreshToken: string, config: OAuthConfig): Promise<OAuthToken> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    });

    if (config.clientSecret) {
      params.append('client_secret', config.clientSecret);
    }

    if (config.scopes.length > 0) {
      params.append('scope', config.scopes.join(' '));
    }

    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const tokenResponse = await response.json();

    // Calculate expiration timestamp
    const expiresAt = tokenResponse.expires_in
      ? Math.floor(Date.now() / 1000) + tokenResponse.expires_in
      : Math.floor(Date.now() / 1000) + 3600;

    const token: OAuthToken = {
      access_token: tokenResponse.access_token,
      token_type: tokenResponse.token_type || 'Bearer',
      expires_at: expiresAt,
      refresh_token: tokenResponse.refresh_token || refreshToken, // Keep old refresh token if not provided
      scope: tokenResponse.scope,
    };

    return token;
  }

  /**
   * Generate secure random string for state parameter
   */
  private generateSecureRandom(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    // Base64 URL encode without padding
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);

    // Base64 URL encode without padding
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(hash))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Clean up expired states
   */
  private cleanupExpiredStates(): void {
    const now = Date.now();
    Array.from(this.pendingStates.entries()).forEach(([state, oauthState]) => {
      if (now - oauthState.createdAt > this.STATE_EXPIRY_MS) {
        this.pendingStates.delete(state);
      }
    });
  }

  /**
   * Check if we're currently in an OAuth flow
   */
  isFlowPending(serverId: string): boolean {
    for (const state of Array.from(this.pendingStates.values())) {
      if (state.serverId === serverId) {
        return true;
      }
    }
    return false;
  }
}

export const oauthFlow = MCPOAuthFlow.getInstance();
