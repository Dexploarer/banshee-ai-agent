/**
 * Google OAuth Configuration for Phantom Wallet Integration
 *
 * Separate from AI provider OAuth to handle wallet-specific authentication
 */

export interface WalletOAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  responseType: string;
  authorizationUrl: string;
  tokenUrl: string;
  usePKCE: boolean;
  additionalParams?: Record<string, string>;
}

/**
 * Google OAuth configuration for wallet creation
 * Note: This requires a separate Google OAuth client configured for wallet functionality
 */
export const WALLET_GOOGLE_OAUTH_CONFIG: WalletOAuthConfig = {
  clientId: process.env.GOOGLE_WALLET_CLIENT_ID || 'demo-wallet-client-id',
  redirectUri:
    process.env.GOOGLE_WALLET_REDIRECT_URI || 'http://localhost:1420/wallet/oauth/callback',
  scopes: ['openid', 'profile', 'email'],
  responseType: 'code',
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  usePKCE: true,
  additionalParams: {
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  },
};

/**
 * Generate PKCE code verifier for enhanced security
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
 * Generate secure random state parameter
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build Google OAuth URL for wallet authentication
 */
export async function buildWalletOAuthUrl(): Promise<{
  url: string;
  state: string;
  codeVerifier: string;
}> {
  const config = WALLET_GOOGLE_OAUTH_CONFIG;
  const state = generateOAuthState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: config.responseType,
    scope: config.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    ...config.additionalParams,
  });

  const url = `${config.authorizationUrl}?${params.toString()}`;

  return {
    url,
    state,
    codeVerifier,
  };
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  authCode: string,
  codeVerifier: string
): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
}> {
  const config = WALLET_GOOGLE_OAUTH_CONFIG;

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: authCode,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Decode JWT token to get user information
 */
export function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token');
    }

    const payload = parts[1];
    if (!payload) {
      throw new Error('Invalid JWT token: missing payload');
    }
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Failed to decode JWT: ${error}`);
  }
}
