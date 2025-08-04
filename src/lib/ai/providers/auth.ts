/**
 * AI Provider Authentication Manager
 *
 * Handles multiple authentication methods including API keys, OAuth 2.0,
 * JWT, and other modern authentication patterns for AI providers
 */

import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
  getOAuthConfig,
} from './oauth-config';
import {
  getAllAuthConfigs,
  getAuthConfig as getSecureAuthConfig,
  initializeAuthStore,
  removeAuthConfig as removeSecureAuthConfig,
  saveAuthConfig as saveSecureAuthConfig,
} from './secure-storage';
import { createSubscriptionAuthConfig, detectSubscriptionPlan } from './subscription';
import type { AuthConfig, AuthMethod, ProviderConfig } from './types';

export interface AuthFlow {
  id: string;
  provider_id: string;
  auth_method: AuthMethod;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
  created_at: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
  state?: string;
  code_verifier?: string; // For PKCE
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export class AuthenticationManager {
  private authConfigs = new Map<string, AuthConfig>();
  private activeFlows = new Map<string, AuthFlow>();
  private initialized = false;

  /**
   * Initialize the authentication manager
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await initializeAuthStore();

      // Load saved auth configs
      const savedConfigs = await getAllAuthConfigs();
      for (const [providerId, config] of Object.entries(savedConfigs)) {
        this.authConfigs.set(providerId, config);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize auth manager:', error);
    }
  }

  /**
   * Store authentication configuration for a provider
   */
  async setAuthConfig(providerId: string, config: AuthConfig): Promise<void> {
    await this.initialize();

    const configWithExpiry = {
      ...config,
      expires_at: config.expires_at || Date.now() + 3600000, // 1 hour default
    };

    this.authConfigs.set(providerId, configWithExpiry);

    // Save to secure storage
    try {
      await saveSecureAuthConfig(providerId, configWithExpiry);
    } catch (error) {
      console.error('Failed to save auth config to secure storage:', error);
    }
  }

  /**
   * Get authentication configuration for a provider
   */
  async getAuthConfig(providerId: string): Promise<AuthConfig | null> {
    await this.initialize();

    let config = this.authConfigs.get(providerId);

    // Try loading from secure storage if not in memory
    if (!config) {
      const storedConfig = await getSecureAuthConfig(providerId);
      if (storedConfig) {
        config = storedConfig;
        this.authConfigs.set(providerId, config);
      }
    }

    if (!config) return null;

    // Check if token is expired
    if (config.expires_at && config.expires_at < Date.now()) {
      this.authConfigs.delete(providerId);
      await removeSecureAuthConfig(providerId);
      return null;
    }

    return config;
  }

  /**
   * Check if a provider is authenticated
   */
  async isAuthenticated(providerId: string): Promise<boolean> {
    const config = await this.getAuthConfig(providerId);
    return config !== null;
  }

  /**
   * Get authentication headers for API requests
   */
  async getAuthHeaders(providerId: string): Promise<Record<string, string>> {
    const config = await this.getAuthConfig(providerId);
    if (!config) return {};

    const headers: Record<string, string> = {};

    switch (config.method) {
      case 'api_key':
        if (config.credentials?.api_key) {
          // Different providers use different header formats
          if (providerId === 'openai') {
            headers.Authorization = `Bearer ${config.credentials.api_key}`;
          } else if (providerId === 'anthropic') {
            headers['x-api-key'] = config.credentials.api_key;
          } else if (providerId === 'google') {
            headers['x-goog-api-key'] = config.credentials.api_key;
          } else {
            headers.Authorization = `Bearer ${config.credentials.api_key}`;
          }
        }
        break;

      case 'oauth2':
      case 'bearer_token':
        if (config.credentials?.access_token) {
          headers.Authorization = `Bearer ${config.credentials.access_token}`;
        }
        break;

      case 'jwt':
        if (config.credentials?.access_token) {
          headers.Authorization = `Bearer ${config.credentials.access_token}`;
        }
        break;

      case 'basic_auth':
        if (config.credentials?.username && config.credentials?.password) {
          const encoded = btoa(`${config.credentials.username}:${config.credentials.password}`);
          headers.Authorization = `Basic ${encoded}`;
        }
        break;

      case 'mtls':
        // mTLS is handled at the transport layer, not in headers
        break;

      case 'managed_identity':
        // Managed identity tokens are usually handled by the cloud provider
        if (config.credentials?.access_token) {
          headers.Authorization = `Bearer ${config.credentials.access_token}`;
        }
        break;
    }

    return headers;
  }

  /**
   * Start OAuth 2.0 authentication flow
   */
  async startOAuthFlow(providerId: string, provider: ProviderConfig): Promise<string> {
    const oauthConfig = getOAuthConfig(providerId);
    if (!oauthConfig) {
      throw new Error(`OAuth not supported for provider ${providerId}`);
    }

    const flowId = crypto.randomUUID();
    const state = generateOAuthState();

    // Create auth flow with state
    const flow: AuthFlow = {
      id: flowId,
      provider_id: providerId,
      auth_method: 'oauth2',
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(), // 10 minutes
      state,
    };

    // Handle PKCE if required
    if (oauthConfig.usePKCE) {
      const codeVerifier = generateCodeVerifier();
      flow.code_verifier = codeVerifier;
    }

    this.activeFlows.set(flowId, flow);

    try {
      const authUrl = await this.buildOAuthUrl(provider, flowId, state);
      return authUrl;
    } catch (error) {
      this.activeFlows.delete(flowId);
      throw error;
    }
  }

  /**
   * Complete OAuth 2.0 flow with authorization code
   */
  async completeOAuthFlow(flowId: string, authCode: string): Promise<boolean> {
    const flow = this.activeFlows.get(flowId);
    if (!flow || flow.status !== 'pending') {
      throw new Error('Invalid or expired OAuth flow');
    }

    try {
      flow.status = 'in_progress';
      this.activeFlows.set(flowId, flow);

      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForToken(flow, authCode);

      // Handle subscription authentication for Anthropic
      let authConfig: AuthConfig;
      if (flow.provider_id === 'anthropic') {
        // Detect subscription plan for Anthropic OAuth
        const subscriptionPlan = await detectSubscriptionPlan(tokenResponse.access_token);
        if (subscriptionPlan) {
          authConfig = createSubscriptionAuthConfig(
            tokenResponse.access_token,
            tokenResponse.refresh_token || '',
            tokenResponse.expires_in || 3600,
            subscriptionPlan
          );
        } else {
          // Fallback to basic OAuth config if plan detection fails
          authConfig = {
            method: 'oauth2',
            credentials: {
              access_token: tokenResponse.access_token,
              ...(tokenResponse.refresh_token && { refresh_token: tokenResponse.refresh_token }),
            },
            expires_at: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
          };
        }
      } else {
        // Standard OAuth configuration for other providers
        authConfig = {
          method: 'oauth2',
          credentials: {
            access_token: tokenResponse.access_token,
            ...(tokenResponse.refresh_token && { refresh_token: tokenResponse.refresh_token }),
          },
          expires_at: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
        };
      }

      this.setAuthConfig(flow.provider_id, authConfig);

      flow.status = 'completed';
      this.activeFlows.set(flowId, flow);

      return true;
    } catch (error) {
      flow.status = 'failed';
      this.activeFlows.set(flowId, flow);
      throw error;
    }
  }

  /**
   * Refresh OAuth 2.0 access token
   */
  async refreshOAuthToken(providerId: string): Promise<boolean> {
    const config = this.authConfigs.get(providerId);
    if (!config || config.method !== 'oauth2' || !config.credentials?.refresh_token) {
      return false;
    }

    try {
      const tokenResponse = await this.refreshToken(providerId, config.credentials.refresh_token);

      // Update the authentication configuration
      const updatedConfig: AuthConfig = {
        ...config,
        credentials: {
          ...config.credentials,
          access_token: tokenResponse.access_token,
          refresh_token: tokenResponse.refresh_token || config.credentials.refresh_token,
        },
        expires_at: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
      };

      this.setAuthConfig(providerId, updatedConfig);
      return true;
    } catch (error) {
      console.error(`Failed to refresh token for ${providerId}:`, error);
      return false;
    }
  }

  /**
   * Remove authentication for a provider
   */
  async removeAuth(providerId: string): Promise<void> {
    this.authConfigs.delete(providerId);

    try {
      await removeSecureAuthConfig(providerId);
    } catch (error) {
      console.error('Failed to remove auth from secure storage:', error);
    }
  }

  /**
   * Get active OAuth flows
   */
  getActiveFlows(): AuthFlow[] {
    return Array.from(this.activeFlows.values());
  }

  /**
   * Clean up expired flows
   */
  cleanupExpiredFlows(): void {
    const now = Date.now();
    for (const [flowId, flow] of this.activeFlows) {
      if (flow.expires_at && new Date(flow.expires_at).getTime() < now) {
        this.activeFlows.delete(flowId);
      }
    }
  }

  /**
   * Validate API key format for a provider
   */
  validateApiKey(providerId: string, apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // Provider-specific API key validation
    switch (providerId) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;

      case 'anthropic':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;

      case 'google':
        return apiKey.length >= 32; // Google API keys are typically 39 characters

      case 'mistral':
        return apiKey.length > 20;

      case 'cohere':
        return apiKey.length > 20;

      case 'groq':
        return apiKey.startsWith('gsk_') && apiKey.length > 20;

      case 'perplexity':
        return apiKey.startsWith('pplx-') && apiKey.length > 20;

      case 'deepseek':
        return apiKey.startsWith('sk-') && apiKey.length > 20;

      default:
        return apiKey.length >= 10; // Minimum length check
    }
  }

  /**
   * Get supported OAuth providers
   */
  getOAuthProviders(): string[] {
    // Only providers that actually support OAuth for API access
    return ['google', 'openrouter'];
  }

  /**
   * Build OAuth authorization URL
   */
  private async buildOAuthUrl(
    provider: ProviderConfig,
    flowId: string,
    state: string
  ): Promise<string> {
    const oauthConfig = getOAuthConfig(provider.id);
    if (!oauthConfig) {
      throw new Error(`OAuth not configured for provider ${provider.id}`);
    }

    // Default redirect URI for Tauri OAuth plugin
    const redirectUri = oauthConfig.redirectUri || 'http://localhost:8901/callback';

    const params = new URLSearchParams({
      response_type: oauthConfig.responseType || 'code',
      client_id: oauthConfig.clientId || provider.id,
      redirect_uri: redirectUri,
      scope: oauthConfig.scopes.join(' '),
      state,
    });

    // Add PKCE challenge if required
    if (oauthConfig.usePKCE) {
      const flow = this.activeFlows.get(flowId);
      if (flow?.code_verifier) {
        const codeChallenge = await generateCodeChallenge(flow.code_verifier);
        params.append('code_challenge', codeChallenge);
        params.append('code_challenge_method', 'S256');
      }
    }

    // Add any additional parameters
    if (oauthConfig.additionalParams) {
      Object.entries(oauthConfig.additionalParams).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    return `${oauthConfig.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(flow: AuthFlow, authCode: string): Promise<TokenResponse> {
    const oauthConfig = getOAuthConfig(flow.provider_id);
    if (!oauthConfig) {
      throw new Error(`OAuth not configured for provider ${flow.provider_id}`);
    }

    const redirectUri = oauthConfig.redirectUri || 'http://localhost:8901/callback';

    // Build token exchange request
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: redirectUri,
      client_id: oauthConfig.clientId || flow.provider_id,
    });

    // Add PKCE verifier if used
    if (oauthConfig.usePKCE && flow.code_verifier) {
      params.append('code_verifier', flow.code_verifier);
    }

    // Google requires client_secret even for desktop apps (use PKCE instead in production)
    if (flow.provider_id === 'google') {
      // In a real implementation, you'd use a backend service for this
      // For desktop apps, Google recommends using PKCE or a backend service
      console.warn('Google OAuth requires special handling for desktop apps');
    }

    try {
      const response = await fetch(oauthConfig.tokenUrl, {
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

      const data = await response.json();

      return {
        access_token: data.access_token,
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in,
        refresh_token: data.refresh_token,
        scope: data.scope,
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error(`Failed to exchange authorization code: ${error}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshToken(providerId: string, refreshToken: string): Promise<TokenResponse> {
    const oauthConfig = getOAuthConfig(providerId);
    if (!oauthConfig) {
      throw new Error(`OAuth not configured for provider ${providerId}`);
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: oauthConfig.clientId || providerId,
    });

    try {
      const response = await fetch(oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        token_type: data.token_type || 'Bearer',
        expires_in: data.expires_in,
        refresh_token: data.refresh_token || refreshToken, // Some providers don't return new refresh token
        scope: data.scope,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error(`Failed to refresh token: ${error}`);
    }
  }

  /**
   * Check if provider supports managed identity
   */
  supportsManagedIdentity(providerId: string): boolean {
    return ['google', 'azure-openai'].includes(providerId);
  }

  /**
   * Get authentication method display name
   */
  getAuthMethodDisplayName(method: AuthMethod): string {
    const displayNames: Record<AuthMethod, string> = {
      api_key: 'API Key',
      oauth2: 'OAuth 2.0',
      bearer_token: 'Bearer Token',
      jwt: 'JWT Token',
      mtls: 'Mutual TLS',
      openid_connect: 'OpenID Connect',
      managed_identity: 'Managed Identity',
      basic_auth: 'Basic Authentication',
    };

    return displayNames[method] || method;
  }

  /**
   * Get authentication status for all providers
   */
  async getAuthStatus(): Promise<
    Record<string, { method: AuthMethod; authenticated: boolean; expires_at?: number }>
  > {
    const status: Record<
      string,
      { method: AuthMethod; authenticated: boolean; expires_at?: number }
    > = {};

    for (const [providerId, config] of this.authConfigs) {
      status[providerId] = {
        method: config.method,
        authenticated: await this.isAuthenticated(providerId),
        ...(config.expires_at && { expires_at: config.expires_at }),
      };
    }

    return status;
  }
}

/**
 * Global authentication manager instance
 */
let globalAuthManager: AuthenticationManager | null = null;

/**
 * Get the global authentication manager
 */
export function getAuthManager(): AuthenticationManager {
  if (!globalAuthManager) {
    globalAuthManager = new AuthenticationManager();

    // Set up periodic cleanup of expired flows
    setInterval(() => {
      globalAuthManager?.cleanupExpiredFlows();
    }, 300000); // Every 5 minutes
  }

  return globalAuthManager;
}

/**
 * Helper function to check if a provider supports OAuth
 */
export function supportsOAuth(providerId: string): boolean {
  const authManager = getAuthManager();
  return authManager.getOAuthProviders().includes(providerId);
}

/**
 * Helper function to get provider-specific auth instructions
 */
export function getAuthInstructions(providerId: string, authMethod: AuthMethod): string {
  const instructions: Record<string, Record<AuthMethod, string>> = {
    openai: {
      api_key: 'Get your API key from https://platform.openai.com/api-keys',
      oauth2: 'Configure OAuth in your OpenAI organization settings',
      bearer_token: 'Use your OpenAI API key as a bearer token',
      jwt: 'Not supported by OpenAI',
      mtls: 'Contact OpenAI Enterprise support',
      openid_connect: 'Not supported by OpenAI',
      managed_identity: 'Not supported by OpenAI',
      basic_auth: 'Not supported by OpenAI',
    },
    anthropic: {
      api_key: 'Get your API key from https://console.anthropic.com/settings/keys',
      oauth2: 'Anthropic does not support OAuth. Use API keys instead.',
      bearer_token: 'Use your Anthropic API key as a bearer token',
      jwt: 'Not supported by Anthropic',
      mtls: 'Contact Anthropic Enterprise support',
      openid_connect: 'Not supported by Anthropic',
      managed_identity: 'Not supported by Anthropic',
      basic_auth: 'Not supported by Anthropic',
    },
    google: {
      api_key: 'Get your API key from https://aistudio.google.com/app/apikey',
      oauth2: 'Configure OAuth 2.0 in Google Cloud Console',
      managed_identity: 'Use Google Cloud managed identity for GCP services',
      bearer_token: 'Use Google access tokens',
      jwt: 'Use Google service account JWT',
      mtls: 'Configure mTLS in Google Cloud',
      openid_connect: 'Use Google OpenID Connect',
      basic_auth: 'Not supported by Google AI',
    },
    openrouter: {
      api_key: 'Get your API key from https://openrouter.ai/keys',
      oauth2: 'Configure OAuth at https://openrouter.ai/docs/oauth',
      bearer_token: 'Use your OpenRouter API key as a bearer token',
      jwt: 'Not supported by OpenRouter',
      mtls: 'Not supported by OpenRouter',
      openid_connect: 'Not supported by OpenRouter',
      managed_identity: 'Not supported by OpenRouter',
      basic_auth: 'Not supported by OpenRouter',
    },
    mistral: {
      api_key: 'Get your API key from https://console.mistral.ai/api-keys',
      oauth2: 'Not supported by Mistral',
      bearer_token: 'Use your Mistral API key as a bearer token',
      jwt: 'Not supported by Mistral',
      mtls: 'Not supported by Mistral',
      openid_connect: 'Not supported by Mistral',
      managed_identity: 'Not supported by Mistral',
      basic_auth: 'Not supported by Mistral',
    },
    cohere: {
      api_key: 'Get your API key from https://dashboard.cohere.com/api-keys',
      oauth2: 'Not supported by Cohere',
      bearer_token: 'Use your Cohere API key as a bearer token',
      jwt: 'Not supported by Cohere',
      mtls: 'Not supported by Cohere',
      openid_connect: 'Not supported by Cohere',
      managed_identity: 'Not supported by Cohere',
      basic_auth: 'Not supported by Cohere',
    },
    groq: {
      api_key: 'Get your API key from https://console.groq.com/keys',
      oauth2: 'Not supported by Groq',
      bearer_token: 'Use your Groq API key as a bearer token',
      jwt: 'Not supported by Groq',
      mtls: 'Not supported by Groq',
      openid_connect: 'Not supported by Groq',
      managed_identity: 'Not supported by Groq',
      basic_auth: 'Not supported by Groq',
    },
    perplexity: {
      api_key: 'Get your API key from https://perplexity.ai/settings/api',
      oauth2: 'Not supported by Perplexity',
      bearer_token: 'Use your Perplexity API key as a bearer token',
      jwt: 'Not supported by Perplexity',
      mtls: 'Not supported by Perplexity',
      openid_connect: 'Not supported by Perplexity',
      managed_identity: 'Not supported by Perplexity',
      basic_auth: 'Not supported by Perplexity',
    },
    deepseek: {
      api_key: 'Get your API key from https://platform.deepseek.com/api_keys',
      oauth2: 'Not supported by DeepSeek',
      bearer_token: 'Use your DeepSeek API key as a bearer token',
      jwt: 'Not supported by DeepSeek',
      mtls: 'Not supported by DeepSeek',
      openid_connect: 'Not supported by DeepSeek',
      managed_identity: 'Not supported by DeepSeek',
      basic_auth: 'Not supported by DeepSeek',
    },
    meta: {
      api_key:
        'Meta models are available through cloud providers like AWS Bedrock, Azure, or Replicate',
      oauth2: 'Not directly supported - use cloud provider authentication',
      bearer_token: 'Use cloud provider tokens',
      jwt: 'Use cloud provider JWT',
      mtls: 'Configure through cloud provider',
      openid_connect: 'Use cloud provider OpenID Connect',
      managed_identity: 'Use cloud provider managed identity',
      basic_auth: 'Not supported',
    },
  };

  return (
    instructions[providerId]?.[authMethod] ||
    `Configure ${authMethod} authentication for ${providerId}`
  );
}
