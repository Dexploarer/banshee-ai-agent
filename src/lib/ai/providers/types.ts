/**
 * AI SDK v5+ Model Provider Types and Configuration
 *
 * Comprehensive type definitions for all supported AI providers
 * and authentication methods for the AI SDK v5+ ecosystem
 */

export type AuthMethod =
  | 'api_key'
  | 'oauth2'
  | 'bearer_token'
  | 'jwt'
  | 'mtls'
  | 'openid_connect'
  | 'managed_identity'
  | 'basic_auth';

export interface AuthConfig {
  method: AuthMethod;
  credentials?: {
    api_key?: string;
    access_token?: string;
    refresh_token?: string;
    client_id?: string;
    client_secret?: string;
    username?: string;
    password?: string;
    certificate?: string;
    private_key?: string;
  };
  oauth?: {
    authorization_url?: string;
    token_url?: string;
    scopes?: string[];
    redirect_uri?: string;
  };
  expires_at?: number;
  metadata?: Record<string, unknown>;
  subscription_info?: {
    plan_type: 'pro' | 'max_5x' | 'max_20x';
    plan_name: string;
    usage_limits: {
      five_hour_limit: number;
      weekly_limit: number;
      model_access: string[];
    };
  };
}

export interface ModelCapabilities {
  text_generation: boolean;
  chat_completion: boolean;
  function_calling: boolean;
  vision: boolean;
  audio_input: boolean;
  audio_output: boolean;
  image_generation: boolean;
  embeddings: boolean;
  fine_tuning: boolean;
  streaming: boolean;
  multimodal: boolean;
  reasoning: boolean;
  hybrid_reasoning: boolean;
  native_multimodal: boolean;
}

export interface ModelLimits {
  max_tokens?: number;
  context_window?: number;
  rate_limit?: {
    requests_per_minute?: number;
    tokens_per_minute?: number;
    requests_per_day?: number;
  };
  pricing?: {
    input_tokens_per_1k?: number;
    output_tokens_per_1k?: number;
    currency?: string;
  };
}

export interface ModelConfig {
  id: string;
  name: string;
  display_name: string;
  provider: string;
  model_id: string;
  description?: string;
  capabilities: ModelCapabilities;
  limits: ModelLimits;
  tags?: string[];
  is_active: boolean;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  display_name: string;
  description: string;
  package_name: string;
  homepage_url?: string;
  documentation_url?: string;
  auth_methods: AuthMethod[];
  default_auth_method: AuthMethod;
  auth_config?: AuthConfig;
  is_enabled: boolean;
  is_community: boolean;
  models: ModelConfig[];
  logo_url?: string;
  status: 'active' | 'deprecated' | 'beta' | 'experimental';
  created_at: string;
  updated_at: string;
}

// Core AI SDK Providers
export const CORE_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'openai',
    display_name: 'OpenAI',
    description: 'Industry-leading language models including GPT-4 and GPT-3.5',
    package_name: '@ai-sdk/openai',
    homepage_url: 'https://openai.com',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/openai',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'anthropic',
    name: 'anthropic',
    display_name: 'Anthropic',
    description:
      'Claude models optimized for safety and helpfulness. Use API key for Console access or OAuth for Pro/Max subscriptions.',
    package_name: '@ai-sdk/anthropic',
    homepage_url: 'https://anthropic.com',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/anthropic',
    auth_methods: ['api_key', 'oauth2'], // API key for Console, OAuth for Pro/Max subscriptions
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'google',
    name: 'google',
    display_name: 'Google AI',
    description: 'Gemini models and Google AI services',
    package_name: '@ai-sdk/google',
    homepage_url: 'https://ai.google.dev',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/google',
    auth_methods: ['api_key', 'oauth2', 'managed_identity'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mistral',
    name: 'mistral',
    display_name: 'Mistral AI',
    description: 'Open-source and commercial language models',
    package_name: '@ai-sdk/mistral',
    homepage_url: 'https://mistral.ai',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/mistral',
    auth_methods: ['api_key', 'bearer_token'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cohere',
    name: 'cohere',
    display_name: 'Cohere',
    description: 'Enterprise-focused language models and embeddings',
    package_name: '@ai-sdk/cohere',
    homepage_url: 'https://cohere.com',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/cohere',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'fireworks',
    name: 'fireworks',
    display_name: 'Fireworks AI',
    description: 'Fast inference for open-source models',
    package_name: '@ai-sdk/fireworks',
    homepage_url: 'https://fireworks.ai',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/fireworks',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'groq',
    name: 'groq',
    display_name: 'Groq',
    description: 'Ultra-fast inference with specialized hardware',
    package_name: '@ai-sdk/groq',
    homepage_url: 'https://groq.com',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/groq',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'perplexity',
    name: 'perplexity',
    display_name: 'Perplexity',
    description: 'Search-augmented language models',
    package_name: '@ai-sdk/perplexity',
    homepage_url: 'https://perplexity.ai',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/perplexity',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'deepseek',
    name: 'deepseek',
    display_name: 'DeepSeek',
    description: 'Advanced reasoning and coding models',
    package_name: '@ai-sdk/deepseek',
    homepage_url: 'https://deepseek.com',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/deepseek',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cerebras',
    name: 'cerebras',
    display_name: 'Cerebras',
    description: 'High-performance AI inference platform',
    package_name: '@ai-sdk/cerebras',
    homepage_url: 'https://cerebras.net',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/cerebras',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'meta',
    name: 'meta',
    display_name: 'Meta',
    description: 'Llama models and Meta AI services',
    package_name: '@ai-sdk/meta',
    homepage_url: 'https://llama.meta.com',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/meta',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'xai',
    name: 'xai',
    display_name: 'xAI',
    description: 'Grok models and xAI services',
    package_name: '@ai-sdk/xai',
    homepage_url: 'https://x.ai',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/xai',
    auth_methods: ['api_key', 'bearer_token'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Community Providers
export const COMMUNITY_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openrouter',
    name: 'openrouter',
    display_name: 'OpenRouter',
    description: 'Access to hundreds of AI models from leading providers',
    package_name: '@openrouter/ai-sdk-provider',
    homepage_url: 'https://openrouter.ai',
    documentation_url: 'https://ai-sdk.dev/providers/community-providers/openrouter',
    auth_methods: ['api_key', 'oauth2'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: true,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ollama',
    name: 'ollama',
    display_name: 'Ollama',
    description: 'Run large language models locally',
    package_name: '@ai-sdk/ollama',
    homepage_url: 'https://ollama.ai',
    documentation_url: 'https://ai-sdk.dev/providers/community-providers/ollama',
    auth_methods: ['basic_auth', 'bearer_token'],
    default_auth_method: 'basic_auth',
    is_enabled: true,
    is_community: true,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'together',
    name: 'together',
    display_name: 'Together AI',
    description: 'Open-source model inference platform',
    package_name: '@ai-sdk/openai-compatible',
    homepage_url: 'https://together.ai',
    documentation_url: 'https://ai-sdk.dev/providers/openai-compatible-providers',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: true,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'replicate',
    name: 'replicate',
    display_name: 'Replicate',
    description: 'Run AI models with a cloud API',
    package_name: '@ai-sdk/openai-compatible',
    homepage_url: 'https://replicate.com',
    documentation_url: 'https://ai-sdk.dev/providers/openai-compatible-providers',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: true,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Audio/Speech Providers
export const AUDIO_PROVIDERS: ProviderConfig[] = [
  {
    id: 'elevenlabs',
    name: 'elevenlabs',
    display_name: 'ElevenLabs',
    description: 'Premium AI voice generation and speech synthesis',
    package_name: '@ai-sdk/elevenlabs',
    homepage_url: 'https://elevenlabs.io',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/elevenlabs',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'assemblyai',
    name: 'assemblyai',
    display_name: 'AssemblyAI',
    description: 'Speech-to-text and audio intelligence',
    package_name: '@ai-sdk/assemblyai',
    homepage_url: 'https://assemblyai.com',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/assemblyai',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'deepgram',
    name: 'deepgram',
    display_name: 'Deepgram',
    description: 'Real-time speech-to-text and voice AI',
    package_name: '@ai-sdk/deepgram',
    homepage_url: 'https://deepgram.com',
    documentation_url: 'https://ai-sdk.dev/providers/ai-sdk-providers/deepgram',
    auth_methods: ['api_key'],
    default_auth_method: 'api_key',
    is_enabled: true,
    is_community: false,
    status: 'active',
    models: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// All providers combined
export const ALL_PROVIDERS = [...CORE_PROVIDERS, ...COMMUNITY_PROVIDERS, ...AUDIO_PROVIDERS];

// Provider categories for UI organization
export const PROVIDER_CATEGORIES = {
  core: {
    name: 'Core Providers',
    description: 'Official AI SDK providers with comprehensive support',
    providers: CORE_PROVIDERS,
  },
  community: {
    name: 'Community Providers',
    description: 'Community-maintained providers for specialized use cases',
    providers: COMMUNITY_PROVIDERS,
  },
  audio: {
    name: 'Audio & Speech',
    description: 'Specialized providers for audio processing and speech synthesis',
    providers: AUDIO_PROVIDERS,
  },
};

// Helper functions
export function getProviderById(id: string): ProviderConfig | undefined {
  return ALL_PROVIDERS.find((provider) => provider.id === id);
}

export function getProvidersByCategory(
  category: keyof typeof PROVIDER_CATEGORIES
): ProviderConfig[] {
  return PROVIDER_CATEGORIES[category]?.providers || [];
}

export function getProvidersByAuthMethod(authMethod: AuthMethod): ProviderConfig[] {
  return ALL_PROVIDERS.filter((provider) => provider.auth_methods.includes(authMethod));
}

export function getActiveProviders(): ProviderConfig[] {
  return ALL_PROVIDERS.filter((provider) => provider.is_enabled);
}

export function getCommunityProviders(): ProviderConfig[] {
  return ALL_PROVIDERS.filter((provider) => provider.is_community);
}

export function getOfficialProviders(): ProviderConfig[] {
  return ALL_PROVIDERS.filter((provider) => !provider.is_community);
}
