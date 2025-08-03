/**
 * OAuth Configuration for AI Providers
 *
 * Defines OAuth endpoints and settings for providers that support OAuth authentication
 */

export interface OAuthProviderConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri?: string;
  usePKCE?: boolean;
  responseType?: string;
  clientId?: string;
  additionalParams?: Record<string, string>;
}

/**
 * OAuth configurations for supported providers
 * Note: Only Google and OpenRouter have proper OAuth support for API access
 */
export const OAUTH_CONFIGS: Record<string, OAuthProviderConfig> = {
  google: {
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/generative-language.retriever',
      'https://www.googleapis.com/auth/cloud-platform',
    ],
    responseType: 'code',
    additionalParams: {
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Always show consent screen to get refresh token
    },
  },

  openrouter: {
    authorizationUrl: 'https://openrouter.ai/api/v1/auth/authorize',
    tokenUrl: 'https://openrouter.ai/api/v1/auth/token',
    scopes: ['read'],
    usePKCE: true, // OpenRouter supports PKCE for enhanced security
    responseType: 'code',
  },

  // Anthropic OAuth is primarily for Claude Code/Pro/Max subscriptions
  // Not for general API access
  anthropic: {
    authorizationUrl: 'https://console.anthropic.com/oauth/authorize',
    tokenUrl: 'https://console.anthropic.com/oauth/token',
    scopes: ['read', 'write'],
    responseType: 'code',
    clientId: '9d1c250a-e61b-44d9-88ed-5944d1962f5e', // Claude Code client ID
  },
};

/**
 * Get OAuth configuration for a provider
 */
export function getOAuthConfig(providerId: string): OAuthProviderConfig | null {
  return OAUTH_CONFIGS[providerId] || null;
}

/**
 * Check if a provider supports OAuth for API access
 */
export function supportsOAuthForAPI(providerId: string): boolean {
  // Only Google and OpenRouter support OAuth for API access
  // Others like OpenAI, Meta, and most providers use API keys
  return ['google', 'openrouter'].includes(providerId);
}

/**
 * Generate a secure random state parameter for OAuth
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate PKCE code verifier
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate PKCE code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * OAuth error types
 */
export enum OAuthError {
  INVALID_STATE = 'INVALID_STATE',
  EXCHANGE_FAILED = 'EXCHANGE_FAILED',
  REFRESH_FAILED = 'REFRESH_FAILED',
  PROVIDER_NOT_SUPPORTED = 'PROVIDER_NOT_SUPPORTED',
  USER_CANCELLED = 'USER_CANCELLED',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * OAuth flow result
 */
export interface OAuthResult {
  success: boolean;
  tokens?: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
    scope?: string;
  };
  error?: {
    type: OAuthError;
    message: string;
  };
}
