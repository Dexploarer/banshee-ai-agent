/**
 * AI Provider Manager
 *
 * Central service for managing AI providers, models, and authentication
 * Integrates with AI SDK v5+ and handles provider lifecycle
 */

import { getAuthManager } from './auth';
import { getModelsByProvider } from './models';
import type { AuthConfig, AuthMethod, ModelConfig, ProviderConfig } from './types';
import { ALL_PROVIDERS } from './types';

export interface ProviderInstance {
  id: string;
  provider: ProviderConfig;
  models: ModelConfig[];
  auth_status: 'authenticated' | 'unauthenticated' | 'expired' | 'error';
  auth_method?: AuthMethod;
  is_enabled: boolean;
  last_used?: string;
  usage_stats?: {
    requests_today: number;
    tokens_used_today: number;
    last_request: string;
  };
  error_info?: {
    last_error: string;
    error_count: number;
    last_error_time: string;
  };
}

export interface ProviderUsage {
  provider_id: string;
  model_id: string;
  requests: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  date: string;
}

export class ProviderManager {
  private providers = new Map<string, ProviderInstance>();
  private authManager = getAuthManager();
  private usageStats = new Map<string, ProviderUsage[]>();
  private availableModelsCache: ModelConfig[] | null = null;
  private cacheTimestamp = 0;

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize all available providers
   */
  private initializeProviders(): void {
    for (const provider of ALL_PROVIDERS) {
      const models = getModelsByProvider(provider.id);

      const instance: ProviderInstance = {
        id: provider.id,
        provider,
        models,
        auth_status: 'unauthenticated',
        is_enabled: provider.is_enabled,
      };

      this.providers.set(provider.id, instance);
    }
  }

  /**
   * Get all provider instances
   */
  getAllProviders(): ProviderInstance[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get enabled providers only
   */
  getEnabledProviders(): ProviderInstance[] {
    return this.getAllProviders().filter((p) => p.is_enabled);
  }

  /**
   * Get authenticated providers only
   */
  getAuthenticatedProviders(): ProviderInstance[] {
    return this.getAllProviders().filter((p) => p.auth_status === 'authenticated');
  }

  /**
   * Get provider by ID
   */
  getProvider(providerId: string): ProviderInstance | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Enable or disable a provider
   */
  setProviderEnabled(providerId: string, enabled: boolean): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) return false;

    provider.is_enabled = enabled;
    this.providers.set(providerId, provider);
    return true;
  }

  /**
   * Authenticate a provider with API key
   */
  async authenticateWithApiKey(providerId: string, apiKey: string): Promise<boolean> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not found`);

    // Validate API key format
    if (!this.authManager.validateApiKey(providerId, apiKey)) {
      throw new Error('Invalid API key format');
    }

    try {
      // Test the API key by making a simple request
      await this.testApiKey(providerId, apiKey);

      // Store authentication config
      const authConfig: AuthConfig = {
        method: 'api_key',
        credentials: { api_key: apiKey },
        expires_at: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
      };

      this.authManager.setAuthConfig(providerId, authConfig);

      // Update provider status
      provider.auth_status = 'authenticated';
      provider.auth_method = 'api_key';
      provider.last_used = new Date().toISOString();
      this.providers.set(providerId, provider);

      // Invalidate cache
      this.availableModelsCache = null;

      return true;
    } catch (error) {
      provider.auth_status = 'error';
      provider.error_info = {
        last_error: error instanceof Error ? error.message : 'Authentication failed',
        error_count: (provider.error_info?.error_count || 0) + 1,
        last_error_time: new Date().toISOString(),
      };
      this.providers.set(providerId, provider);
      throw error;
    }
  }

  /**
   * Start OAuth authentication flow
   */
  async startOAuthAuthentication(providerId: string): Promise<string> {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Provider ${providerId} not found`);

    if (!provider.provider.auth_methods.includes('oauth2')) {
      throw new Error(`Provider ${providerId} does not support OAuth 2.0`);
    }

    return this.authManager.startOAuthFlow(providerId, provider.provider);
  }

  /**
   * Complete OAuth authentication
   */
  async completeOAuthAuthentication(flowId: string, authCode: string): Promise<boolean> {
    const success = await this.authManager.completeOAuthFlow(flowId, authCode);

    if (success) {
      // Update provider status
      const flow = this.authManager.getActiveFlows().find((f) => f.id === flowId);
      if (flow) {
        const provider = this.providers.get(flow.provider_id);
        if (provider) {
          provider.auth_status = 'authenticated';
          provider.auth_method = 'oauth2';
          provider.last_used = new Date().toISOString();
          this.providers.set(flow.provider_id, provider);

          // Invalidate cache
          this.availableModelsCache = null;
        }
      }
    }

    return success;
  }

  /**
   * Remove authentication for a provider
   */
  removeAuthentication(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.auth_status = 'unauthenticated';
      provider.auth_method = undefined as any;
      provider.error_info = undefined as any;
      this.providers.set(providerId, provider);

      // Invalidate cache
      this.availableModelsCache = null;
    }

    this.authManager.removeAuth(providerId);
  }

  /**
   * Get available models for authenticated providers
   */
  getAvailableModels(): ModelConfig[] {
    const now = Date.now();
    const cacheValid = this.availableModelsCache && now - this.cacheTimestamp < 5000; // 5 second cache

    if (cacheValid) {
      return this.availableModelsCache || [];
    }

    const authenticatedProviders = this.getAuthenticatedProviders();
    const models: ModelConfig[] = [];

    for (const providerInstance of authenticatedProviders) {
      models.push(...providerInstance.models.filter((m) => m.is_active));
    }

    // Update cache
    this.availableModelsCache = models;
    this.cacheTimestamp = now;

    return models;
  }

  /**
   * Get available models with provider information
   */
  getAvailableModelsWithProvider(): Array<
    ModelConfig & { provider_name: string; provider_id: string }
  > {
    const authenticatedProviders = this.getAuthenticatedProviders();
    const models: Array<ModelConfig & { provider_name: string; provider_id: string }> = [];

    for (const providerInstance of authenticatedProviders) {
      const providerModels = providerInstance.models
        .filter((m) => m.is_active)
        .map((model) => ({
          ...model,
          provider_name: providerInstance.provider.name,
          provider_id: providerInstance.id,
        }));
      models.push(...providerModels);
    }

    return models;
  }

  /**
   * Get models by provider ID
   */
  getModelsByProviderId(providerId: string): ModelConfig[] {
    const provider = this.providers.get(providerId);
    if (!provider || provider.auth_status !== 'authenticated') {
      return [];
    }
    return provider.models.filter((m) => m.is_active);
  }

  /**
   * Get models by capability
   */
  getModelsByCapability(capability: string): ModelConfig[] {
    return this.getAvailableModels().filter(
      (model) => (model.capabilities as any)[capability] === true
    );
  }

  /**
   * Get chat models
   */
  getChatModels(): ModelConfig[] {
    return this.getModelsByCapability('chat_completion');
  }

  /**
   * Get multimodal models
   */
  getMultimodalModels(): ModelConfig[] {
    return this.getModelsByCapability('multimodal');
  }

  /**
   * Get embedding models
   */
  getEmbeddingModels(): ModelConfig[] {
    return this.getModelsByCapability('embeddings');
  }

  /**
   * Test API key by making a simple request
   */
  private async testApiKey(providerId: string, apiKey: string): Promise<void> {
    // This would make an actual API call to test the key
    // For now, we'll do a simple validation

    const testEndpoints: Record<string, string> = {
      openai: 'https://api.openai.com/v1/models',
      anthropic: 'https://api.anthropic.com/v1/messages',
      google: 'https://generativelanguage.googleapis.com/v1/models',
      mistral: 'https://api.mistral.ai/v1/models',
      cohere: 'https://api.cohere.ai/v1/models',
      groq: 'https://api.groq.com/openai/v1/models',
      perplexity: 'https://api.perplexity.ai/models',
      deepseek: 'https://api.deepseek.com/v1/models',
    };

    const endpoint = testEndpoints[providerId];
    if (!endpoint) {
      // For providers without test endpoints, just validate format
      return;
    }

    try {
      const headers = await this.authManager.getAuthHeaders(providerId);
      headers.Authorization = this.getTestAuthHeader(providerId, apiKey);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`API test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to validate API key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get test auth header for a provider
   */
  private getTestAuthHeader(providerId: string, apiKey: string): string {
    switch (providerId) {
      case 'openai':
      case 'groq':
      case 'deepseek':
        return `Bearer ${apiKey}`;
      case 'anthropic':
        return `Bearer ${apiKey}`;
      case 'google':
        return `Bearer ${apiKey}`;
      default:
        return `Bearer ${apiKey}`;
    }
  }

  /**
   * Record usage for a provider
   */
  recordUsage(usage: ProviderUsage): void {
    const key = `${usage.provider_id}-${usage.date}`;
    const existing = this.usageStats.get(key) || [];

    // Find existing entry for the same model or create new one
    const existingIndex = existing.findIndex((u) => u.model_id === usage.model_id);

    if (existingIndex >= 0) {
      // Update existing usage
      const existingUsage = existing[existingIndex];
      if (existingUsage) {
        existingUsage.requests += usage.requests;
        existingUsage.input_tokens += usage.input_tokens;
        existingUsage.output_tokens += usage.output_tokens;
        existingUsage.cost_usd += usage.cost_usd;
      }
    } else {
      // Add new usage entry
      existing.push(usage);
    }

    this.usageStats.set(key, existing);

    // Update provider instance stats
    const provider = this.providers.get(usage.provider_id);
    if (provider) {
      if (!provider.usage_stats) {
        provider.usage_stats = {
          requests_today: 0,
          tokens_used_today: 0,
          last_request: new Date().toISOString(),
        };
      }

      provider.usage_stats.requests_today += usage.requests;
      provider.usage_stats.tokens_used_today += usage.input_tokens + usage.output_tokens;
      provider.usage_stats.last_request = new Date().toISOString();
      provider.last_used = new Date().toISOString();

      this.providers.set(usage.provider_id, provider);
    }
  }

  /**
   * Get usage statistics for a provider
   */
  getUsageStats(providerId: string, days = 30): ProviderUsage[] {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const usage: ProviderUsage[] = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const key = `${providerId}-${dateKey}`;
      const dayUsage = this.usageStats.get(key);

      if (dayUsage) {
        usage.push(...dayUsage);
      }
    }

    return usage;
  }

  /**
   * Get total usage across all providers
   */
  getTotalUsage(days = 30): ProviderUsage[] {
    const usage: ProviderUsage[] = [];

    for (const provider of this.getAllProviders()) {
      usage.push(...this.getUsageStats(provider.id, days));
    }

    return usage;
  }

  /**
   * Get provider configuration for AI SDK
   */
  async getProviderSDKConfig(providerId: string): Promise<any> {
    const provider = this.getProvider(providerId);
    if (!provider || provider.auth_status !== 'authenticated') {
      return null;
    }

    const authConfig = await this.authManager.getAuthConfig(providerId);
    if (!authConfig) return null;

    // Return configuration object for AI SDK
    return {
      provider: provider.provider,
      auth: authConfig,
      models: provider.models,
    };
  }

  /**
   * Refresh authentication status for all providers
   */
  async refreshAuthStatus(): Promise<void> {
    for (const [providerId, provider] of this.providers) {
      const authConfig = await this.authManager.getAuthConfig(providerId);

      if (!authConfig) {
        provider.auth_status = 'unauthenticated';
      } else if (authConfig.expires_at && authConfig.expires_at < Date.now()) {
        provider.auth_status = 'expired';

        // Try to refresh OAuth tokens
        if (authConfig.method === 'oauth2') {
          const refreshed = await this.authManager.refreshOAuthToken(providerId);
          if (refreshed) {
            provider.auth_status = 'authenticated';
          }
        }
      } else {
        provider.auth_status = 'authenticated';
      }

      this.providers.set(providerId, provider);
    }
  }

  /**
   * Export provider configurations
   */
  exportConfig(): any {
    const config: any = {
      providers: {},
      usage: {},
    };

    for (const [providerId, provider] of this.providers) {
      config.providers[providerId] = {
        is_enabled: provider.is_enabled,
        auth_method: provider.auth_method,
        last_used: provider.last_used,
      };
    }

    for (const [key, usage] of this.usageStats) {
      config.usage[key] = usage;
    }

    return config;
  }

  /**
   * Import provider configurations
   */
  importConfig(config: any): void {
    if (config.providers) {
      for (const [providerId, providerConfig] of Object.entries(config.providers as any)) {
        const provider = this.providers.get(providerId);
        if (provider && typeof providerConfig === 'object' && providerConfig !== null) {
          const configObj = providerConfig as { is_enabled?: boolean; last_used?: string };
          provider.is_enabled = configObj.is_enabled ?? provider.is_enabled;
          provider.last_used = configObj.last_used || (undefined as any);
          this.providers.set(providerId, provider);
        }
      }
    }

    if (config.usage) {
      for (const [key, usage] of Object.entries(config.usage as any)) {
        this.usageStats.set(key, usage as ProviderUsage[]);
      }
    }
  }
}

/**
 * Global provider manager instance
 */
let globalProviderManager: ProviderManager | null = null;

/**
 * Get the global provider manager
 */
export function getProviderManager(): ProviderManager {
  if (!globalProviderManager) {
    globalProviderManager = new ProviderManager();

    // Set up periodic auth status refresh
    setInterval(() => {
      globalProviderManager?.refreshAuthStatus();
    }, 600000); // Every 10 minutes
  }

  return globalProviderManager;
}

/**
 * Helper function to get authenticated chat models
 */
export function getAuthenticatedChatModels(): ModelConfig[] {
  const manager = getProviderManager();
  return manager.getChatModels();
}

/**
 * Helper function to check if any providers are authenticated
 */
export function hasAuthenticatedProviders(): boolean {
  const manager = getProviderManager();
  return manager.getAuthenticatedProviders().length > 0;
}

/**
 * Helper function to get the most popular providers
 */
export function getPopularProviders(): ProviderInstance[] {
  const manager = getProviderManager();
  const providers = manager.getAllProviders();

  // Sort by usage and status
  return providers.sort((a, b) => {
    // Authenticated providers first
    if (a.auth_status === 'authenticated' && b.auth_status !== 'authenticated') return -1;
    if (b.auth_status === 'authenticated' && a.auth_status !== 'authenticated') return 1;

    // Then by usage
    const aUsage = a.usage_stats?.requests_today || 0;
    const bUsage = b.usage_stats?.requests_today || 0;

    return bUsage - aUsage;
  });
}
