/**
 * Wallet Authentication Service
 *
 * Handles the complete flow: Google OAuth → Phantom Embedded Wallet Creation
 */

import { invoke } from '@tauri-apps/api/core';
import { buildWalletOAuthUrl, decodeJWT, exchangeCodeForToken } from './oauth-config';
import type { GoogleOAuthResult, WalletAuth, WalletUser } from './types';

export class WalletAuthService {
  private static instance: WalletAuthService;
  private activeOAuthFlow: {
    state: string;
    codeVerifier: string;
    timestamp: number;
  } | null = null;

  private constructor() {}

  static getInstance(): WalletAuthService {
    if (!WalletAuthService.instance) {
      WalletAuthService.instance = new WalletAuthService();
    }
    return WalletAuthService.instance;
  }

  /**
   * Start Google OAuth flow for wallet creation
   */
  async startGoogleOAuthFlow(): Promise<void> {
    try {
      console.log('Starting Google OAuth flow for wallet creation...');

      // Clear any existing flow
      this.activeOAuthFlow = null;

      // Generate OAuth URL with PKCE
      const { url, state, codeVerifier } = await buildWalletOAuthUrl();

      // Store flow data for validation
      this.activeOAuthFlow = {
        state,
        codeVerifier,
        timestamp: Date.now(),
      };

      console.log('Generated OAuth URL:', url);

      // Open OAuth URL in browser using Tauri
      await invoke('plugin:oauth|start', {
        url,
        port: 8902, // Use different port from AI provider OAuth
      });

      console.log('OAuth flow started successfully');
    } catch (error) {
      console.error('Failed to start Google OAuth flow:', error);
      this.activeOAuthFlow = null;
      throw new Error(`OAuth flow failed to start: ${error}`);
    }
  }

  /**
   * Complete OAuth flow and get user information
   */
  async completeOAuthFlow(authCode: string, receivedState: string): Promise<GoogleOAuthResult> {
    try {
      console.log('Completing OAuth flow...');

      // Validate state parameter
      if (!this.activeOAuthFlow || this.activeOAuthFlow.state !== receivedState) {
        throw new Error('Invalid OAuth state parameter');
      }

      // Check if flow hasn't expired (10 minutes)
      const flowAge = Date.now() - this.activeOAuthFlow.timestamp;
      if (flowAge > 600000) {
        throw new Error('OAuth flow has expired');
      }

      // Exchange authorization code for tokens
      const tokenData = await exchangeCodeForToken(authCode, this.activeOAuthFlow.codeVerifier);

      // Decode ID token to get user information
      if (!tokenData.id_token) {
        throw new Error('No ID token received from Google');
      }

      const userInfo = decodeJWT(tokenData.id_token);

      const user: WalletUser = {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        verified_email: userInfo.email_verified,
      };

      const result: GoogleOAuthResult = {
        user,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        idToken: tokenData.id_token,
        expiresIn: tokenData.expires_in || 3600,
      };

      // Clear the active flow
      this.activeOAuthFlow = null;

      console.log('OAuth flow completed successfully for user:', user.email);

      return result;
    } catch (error) {
      console.error('Failed to complete OAuth flow:', error);
      this.activeOAuthFlow = null;
      throw error;
    }
  }

  /**
   * Create wallet authentication object
   */
  createWalletAuth(oauthResult: GoogleOAuthResult): WalletAuth {
    const expiresAt = Date.now() + oauthResult.expiresIn * 1000;

    return {
      user: oauthResult.user,
      accessToken: oauthResult.accessToken,
      refreshToken: oauthResult.refreshToken || null,
      idToken: oauthResult.idToken || null,
      expiresAt,
    };
  }

  /**
   * Check if authentication is still valid
   */
  isAuthValid(auth: WalletAuth): boolean {
    if (!auth.user || !auth.accessToken) {
      return false;
    }

    if (auth.expiresAt && auth.expiresAt < Date.now()) {
      return false;
    }

    return true;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    id_token?: string;
  }> {
    try {
      // Use the existing Google OAuth config for token refresh
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: process.env.GOOGLE_WALLET_CLIENT_ID || 'demo-wallet-client-id',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      throw error;
    }
  }

  /**
   * Clear active OAuth flow (cleanup)
   */
  clearActiveFlow(): void {
    this.activeOAuthFlow = null;
  }

  /**
   * Get active flow status
   */
  getActiveFlowStatus(): { hasActiveFlow: boolean; state?: string } {
    return {
      hasActiveFlow: this.activeOAuthFlow !== null,
      state: this.activeOAuthFlow?.state || undefined,
    } as any;
  }
}

// Global instance
export const walletAuthService = WalletAuthService.getInstance();
