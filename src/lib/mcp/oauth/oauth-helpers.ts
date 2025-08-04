/**
 * OAuth Helper Functions
 * Simplified API for OAuth operations
 */

import type { MCPServerConfigWithOAuth } from '@/lib/oauth/rfc9728';
import { type OAuthConfig, oauthFlow } from './oauth-flow';
import { tokenManager } from './token-manager';

/**
 * Get a valid OAuth token for a server
 */
export async function getValidToken(
  serverId: string,
  serverConfig: MCPServerConfigWithOAuth
): Promise<string | null> {
  if (!serverConfig.oauth?.enabled || !serverConfig.oauth.metadata) {
    return null;
  }

  const token = await tokenManager.getValidToken(serverId, async (refreshToken: string) => {
    const oauthConfig = buildOAuthConfig(serverId, serverConfig);
    return await oauthFlow.refreshAccessToken(refreshToken, oauthConfig);
  });

  return token?.access_token || null;
}

/**
 * Start OAuth flow for a server
 */
export async function startOAuthFlow(
  serverId: string,
  serverConfig: MCPServerConfigWithOAuth
): Promise<void> {
  if (!serverConfig.oauth?.enabled || !serverConfig.oauth.metadata) {
    throw new Error('OAuth not configured for this server');
  }

  const oauthConfig = buildOAuthConfig(serverId, serverConfig);
  await oauthFlow.startAuthorizationFlow(oauthConfig);
}

/**
 * Handle OAuth callback
 */
export async function handleOAuthCallback(
  serverId: string,
  serverConfig: MCPServerConfigWithOAuth,
  code: string,
  state: string
): Promise<void> {
  if (!serverConfig.oauth?.enabled || !serverConfig.oauth.metadata) {
    throw new Error('OAuth not configured for this server');
  }

  const oauthConfig = buildOAuthConfig(serverId, serverConfig);
  await oauthFlow.handleCallback(code, state, oauthConfig);
}

/**
 * Build OAuth configuration from server config
 */
function buildOAuthConfig(serverId: string, serverConfig: MCPServerConfigWithOAuth): OAuthConfig {
  if (!serverConfig.oauth?.metadata) {
    throw new Error('OAuth metadata not available');
  }

  return {
    serverId,
    clientId: serverConfig.oauth.client_id!,
    clientSecret: serverConfig.oauth.client_secret,
    authorizationEndpoint: serverConfig.oauth.metadata.authorization_endpoint,
    tokenEndpoint: serverConfig.oauth.metadata.token_endpoint,
    scopes: serverConfig.oauth.scopes || ['read', 'write'],
    usePKCE: true,
  };
}

/**
 * Check if OAuth is needed for a server
 */
export function isOAuthRequired(serverConfig: MCPServerConfigWithOAuth): boolean {
  return serverConfig.oauth?.enabled === true && !!serverConfig.oauth.client_id;
}

/**
 * Clear all OAuth tokens (for logout)
 */
export async function clearAllOAuthTokens(): Promise<void> {
  await tokenManager.clearAllTokens();
}
