import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
// import { google } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export interface AIProvider {
  name: string;
  models: Record<string, LanguageModel>;
  defaultModel: string;
  visionModels?: string[]; // Models that support image input
  embeddingModels?: string[]; // Models that support embeddings
}

export interface GlobalProviderConfig {
  defaultProvider: string;
  providers: Record<
    string,
    {
      apiKey?: string;
      baseUrl?: string;
      config?: Record<string, any>;
      createModel?: (modelId: string, config?: any) => LanguageModel;
    }
  >;
}

// Global configuration state
let globalConfig: GlobalProviderConfig = {
  defaultProvider: 'anthropic',
  providers: {},
};

export const providers: Record<string, AIProvider> = {
  openai: {
    name: 'OpenAI',
    models: {
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'gpt-4o': openai('gpt-4o') as any as LanguageModel,
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'gpt-4o-mini': openai('gpt-4o-mini') as any as LanguageModel,
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'o3-mini': openai('o3-mini') as any as LanguageModel,
      // Vision-capable models
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'gpt-4-vision-preview': openai('gpt-4-vision-preview') as any as LanguageModel,
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'gpt-4o-2024-08-06': openai('gpt-4o-2024-08-06') as any as LanguageModel,
    },
    defaultModel: 'gpt-4o-mini',
    visionModels: ['gpt-4o', 'gpt-4-vision-preview', 'gpt-4o-2024-08-06'],
    embeddingModels: ['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'],
  },
  anthropic: {
    name: 'Anthropic',
    models: {
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022') as any as LanguageModel,
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'claude-3-5-haiku': anthropic('claude-3-5-haiku-20241022') as any as LanguageModel,
      // Vision-capable models
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'claude-3-opus': anthropic('claude-3-opus-20240229') as any as LanguageModel,
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'claude-3-sonnet': anthropic('claude-3-sonnet-20240229') as any as LanguageModel,
      // biome-ignore lint/suspicious/noExplicitAny: SDK type compatibility
      'claude-3-haiku': anthropic('claude-3-haiku-20240307') as any as LanguageModel,
    },
    defaultModel: 'claude-3-5-haiku',
    visionModels: ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    embeddingModels: [], // Anthropic doesn't provide embedding models directly
  },
  // Note: Google provider commented out until @ai-sdk/google is available
  // google: {
  //   name: 'Google',
  //   models: {
  //     'gemini-2.0-flash-exp': google('gemini-2.0-flash-exp') as any as LanguageModel,
  //     'gemini-1.5-pro': google('gemini-1.5-pro') as any as LanguageModel,
  //     'gemini-1.5-flash': google('gemini-1.5-flash') as any as LanguageModel,
  //     'gemini-1.5-flash-8b': google('gemini-1.5-flash-8b') as any as LanguageModel,
  //   },
  //   defaultModel: 'gemini-1.5-flash',
  //   visionModels: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  //   embeddingModels: ['text-embedding-004'],
  // },
};

export function getModel(providerId: string, modelId?: string): LanguageModel {
  const provider = providers[providerId];
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  const modelKey = modelId || provider.defaultModel;
  const model = provider.models[modelKey];

  if (!model) {
    throw new Error(`Unknown model: ${modelKey} for provider: ${providerId}`);
  }

  return model;
}

export function listProviders(): Array<{ id: string; name: string; models: string[] }> {
  return Object.entries(providers).map(([id, provider]) => ({
    id,
    name: provider.name,
    models: Object.keys(provider.models),
  }));
}

export function getVisionModels(): Array<{
  providerId: string;
  modelId: string;
  providerName: string;
}> {
  const visionModels: Array<{ providerId: string; modelId: string; providerName: string }> = [];

  for (const [providerId, provider] of Object.entries(providers)) {
    if (provider.visionModels) {
      for (const modelId of provider.visionModels) {
        visionModels.push({
          providerId,
          modelId,
          providerName: provider.name,
        });
      }
    }
  }

  return visionModels;
}

export function getEmbeddingModels(): Array<{
  providerId: string;
  modelId: string;
  providerName: string;
}> {
  const embeddingModels: Array<{ providerId: string; modelId: string; providerName: string }> = [];

  for (const [providerId, provider] of Object.entries(providers)) {
    if (provider.embeddingModels) {
      for (const modelId of provider.embeddingModels) {
        embeddingModels.push({
          providerId,
          modelId,
          providerName: provider.name,
        });
      }
    }
  }

  return embeddingModels;
}

export function isVisionModel(providerId: string, modelId: string): boolean {
  const provider = providers[providerId];
  return provider?.visionModels?.includes(modelId) ?? false;
}

export function isEmbeddingModel(providerId: string, modelId: string): boolean {
  const provider = providers[providerId];
  return provider?.embeddingModels?.includes(modelId) ?? false;
}

/**
 * Global Provider Configuration Functions
 */

/**
 * Configure global provider settings
 */
export function configureGlobalProviders(config: Partial<GlobalProviderConfig>): void {
  globalConfig = {
    ...globalConfig,
    ...config,
    providers: {
      ...globalConfig.providers,
      ...config.providers,
    },
  };
}

/**
 * Set API key for a provider
 */
export function setProviderApiKey(providerId: string, apiKey: string): void {
  if (!globalConfig.providers[providerId]) {
    globalConfig.providers[providerId] = {};
  }
  globalConfig.providers[providerId].apiKey = apiKey;
}

/**
 * Set base URL for a provider
 */
export function setProviderBaseUrl(providerId: string, baseUrl: string): void {
  if (!globalConfig.providers[providerId]) {
    globalConfig.providers[providerId] = {};
  }
  globalConfig.providers[providerId].baseUrl = baseUrl;
}

/**
 * Set default provider
 */
export function setDefaultProvider(providerId: string): void {
  if (!providers[providerId]) {
    throw new Error(`Unknown provider: ${providerId}`);
  }
  globalConfig.defaultProvider = providerId;
}

/**
 * Get current global configuration
 */
export function getGlobalConfig(): GlobalProviderConfig {
  return { ...globalConfig };
}

/**
 * Create a configured model instance with global settings
 */
export function createConfiguredModel(providerId: string, modelId: string): LanguageModel {
  const providerConfig = globalConfig.providers[providerId];

  if (providerConfig?.apiKey || providerConfig?.baseUrl) {
    // Create custom provider instance with configuration
    switch (providerId) {
      case 'openai': {
        const customOpenAI = createOpenAI({
          ...(providerConfig.apiKey && { apiKey: providerConfig.apiKey }),
          ...(providerConfig.baseUrl && { baseURL: providerConfig.baseUrl }),
          ...providerConfig.config,
        });
        return customOpenAI(modelId) as any as LanguageModel;
      }
      case 'anthropic': {
        // For anthropic, we'd need createAnthropic (not available in current import)
        // Fall back to default for now
        return getModel(providerId, modelId);
      }
      case 'google': {
        // For google, we'd need createGoogle with custom config
        // Fall back to default for now
        return getModel(providerId, modelId);
      }
      default:
        return getModel(providerId, modelId);
    }
  }

  return getModel(providerId, modelId);
}

/**
 * Get model using global configuration (supports string-only model IDs)
 */
export function getGlobalModel(modelId: string): LanguageModel {
  // Check if it's a full provider:model format
  if (modelId.includes(':')) {
    const [providerId, actualModelId] = modelId.split(':', 2);
    if (providerId && actualModelId) {
      return createConfiguredModel(providerId, actualModelId);
    }
    throw new Error(`Invalid provider:model format: ${modelId}`);
  }

  // Find the model in any provider
  for (const [providerId, provider] of Object.entries(providers)) {
    if (provider.models[modelId]) {
      return createConfiguredModel(providerId, modelId);
    }
  }

  // Use default provider with fallback
  const defaultProvider = globalConfig.defaultProvider;
  const defaultProviderData = providers[defaultProvider];
  const defaultModelId = modelId || defaultProviderData?.defaultModel;

  if (defaultModelId) {
    return createConfiguredModel(defaultProvider, defaultModelId);
  }

  throw new Error(`Model '${modelId}' not found in any provider`);
}

/**
 * Register a custom provider
 */
export function registerProvider(
  providerId: string,
  provider: AIProvider,
  createModelFunction: (modelId: string, config?: any) => LanguageModel
): void {
  (providers as any)[providerId] = provider;

  // Store the create function for later use
  if (!globalConfig.providers[providerId]) {
    globalConfig.providers[providerId] = {};
  }
  globalConfig.providers[providerId].createModel = createModelFunction;
}

/**
 * Add Ollama local provider support
 */
export function addOllamaProvider(baseUrl: string = 'http://localhost:11434'): void {
  const ollamaProvider: AIProvider = {
    name: 'Ollama',
    models: {
      // Common Ollama models - these would be dynamically discovered in production
      'llama3.2': createOpenAI({
        baseURL: `${baseUrl}/v1`,
        apiKey: 'ollama', // Ollama doesn't require real API key
      })('llama3.2') as any as LanguageModel,
      'llama3.1': createOpenAI({
        baseURL: `${baseUrl}/v1`,
        apiKey: 'ollama',
      })('llama3.1') as any as LanguageModel,
      codellama: createOpenAI({
        baseURL: `${baseUrl}/v1`,
        apiKey: 'ollama',
      })('codellama') as any as LanguageModel,
      mistral: createOpenAI({
        baseURL: `${baseUrl}/v1`,
        apiKey: 'ollama',
      })('mistral') as any as LanguageModel,
    },
    defaultModel: 'llama3.2',
    visionModels: ['llama3.2-vision'], // Some Ollama models support vision
    embeddingModels: ['nomic-embed-text'], // Ollama embedding models
  };

  registerProvider('ollama', ollamaProvider, (modelId: string) => {
    return createOpenAI({
      baseURL: `${baseUrl}/v1`,
      apiKey: 'ollama',
    })(modelId) as any as LanguageModel;
  });

  // Configure the provider
  configureGlobalProviders({
    providers: {
      ollama: {
        baseUrl,
        apiKey: 'ollama',
      },
    },
  });
}
