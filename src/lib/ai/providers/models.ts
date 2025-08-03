/**
 * AI SDK v5+ Model Definitions
 *
 * Comprehensive model configurations for all supported providers
 * Updated with latest models as of 2025
 */

import type { ModelConfig, ModelCapabilities, ModelLimits } from './types';

// Common capabilities for different model types
const CHAT_CAPABILITIES: ModelCapabilities = {
  text_generation: true,
  chat_completion: true,
  function_calling: true,
  vision: false,
  audio_input: false,
  audio_output: false,
  image_generation: false,
  embeddings: false,
  fine_tuning: false,
  streaming: true,
  multimodal: false,
  reasoning: false,
  hybrid_reasoning: false,
  native_multimodal: false,
};

const MULTIMODAL_CAPABILITIES: ModelCapabilities = {
  ...CHAT_CAPABILITIES,
  vision: true,
  multimodal: true,
  native_multimodal: true,
};

const REASONING_CAPABILITIES: ModelCapabilities = {
  ...CHAT_CAPABILITIES,
  reasoning: true,
};

const HYBRID_REASONING_CAPABILITIES: ModelCapabilities = {
  ...MULTIMODAL_CAPABILITIES,
  reasoning: true,
  hybrid_reasoning: true,
};

const AUDIO_CAPABILITIES: ModelCapabilities = {
  text_generation: false,
  chat_completion: false,
  function_calling: false,
  vision: false,
  audio_input: true,
  audio_output: true,
  image_generation: false,
  embeddings: false,
  fine_tuning: false,
  streaming: true,
  multimodal: false,
  reasoning: false,
  hybrid_reasoning: false,
  native_multimodal: false,
};

const IMAGE_CAPABILITIES: ModelCapabilities = {
  text_generation: false,
  chat_completion: false,
  function_calling: false,
  vision: false,
  audio_input: false,
  audio_output: false,
  image_generation: true,
  embeddings: false,
  fine_tuning: false,
  streaming: false,
  multimodal: false,
  reasoning: false,
  hybrid_reasoning: false,
  native_multimodal: false,
};

const EMBEDDING_CAPABILITIES: ModelCapabilities = {
  text_generation: false,
  chat_completion: false,
  function_calling: false,
  vision: false,
  audio_input: false,
  audio_output: false,
  image_generation: false,
  embeddings: true,
  fine_tuning: false,
  streaming: false,
  multimodal: false,
  reasoning: false,
  hybrid_reasoning: false,
  native_multimodal: false,
};

// OpenAI Models
export const OPENAI_MODELS: ModelConfig[] = [
  // Latest 2025 Models
  {
    id: 'openai-gpt-4.1',
    name: 'gpt-4.1',
    display_name: 'GPT-4.1',
    provider: 'openai',
    model_id: 'gpt-4.1',
    description: 'Latest GPT-4 series with enhanced reasoning and multimodal capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, audio_input: true, audio_output: true },
    limits: {
      max_tokens: 32768,
      context_window: 200000,
      rate_limit: { requests_per_minute: 10000, tokens_per_minute: 1000000 },
      pricing: { input_tokens_per_1k: 5.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'reasoning', 'multimodal', 'premium'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'openai-gpt-4.1-mini',
    name: 'gpt-4.1-mini',
    display_name: 'GPT-4.1 Mini',
    provider: 'openai',
    model_id: 'gpt-4.1-mini',
    description: 'Efficient version of GPT-4.1 optimized for speed and cost',
    capabilities: { ...MULTIMODAL_CAPABILITIES, reasoning: true },
    limits: {
      max_tokens: 16384,
      context_window: 128000,
      rate_limit: { requests_per_minute: 20000, tokens_per_minute: 2000000 },
      pricing: { input_tokens_per_1k: 0.25, output_tokens_per_1k: 1.0, currency: 'USD' },
    },
    tags: ['2025', 'efficient', 'cost-effective', 'multimodal'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'openai-gpt-4.1-nano',
    name: 'gpt-4.1-nano',
    display_name: 'GPT-4.1 Nano',
    provider: 'openai',
    model_id: 'gpt-4.1-nano',
    description: 'Ultra-fast GPT-4.1 variant for high-throughput applications',
    capabilities: CHAT_CAPABILITIES,
    limits: {
      max_tokens: 8192,
      context_window: 32000,
      rate_limit: { requests_per_minute: 50000, tokens_per_minute: 5000000 },
      pricing: { input_tokens_per_1k: 0.05, output_tokens_per_1k: 0.15, currency: 'USD' },
    },
    tags: ['2025', 'ultra-fast', 'high-throughput', 'cost-effective'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'openai-gpt-4.5',
    name: 'gpt-4.5',
    display_name: 'GPT-4.5',
    provider: 'openai',
    model_id: 'gpt-4.5',
    description: 'Next-generation GPT model with breakthrough capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, audio_input: true, audio_output: true },
    limits: {
      max_tokens: 65536,
      context_window: 500000,
      rate_limit: { requests_per_minute: 5000, tokens_per_minute: 500000 },
      pricing: { input_tokens_per_1k: 10.0, output_tokens_per_1k: 30.0, currency: 'USD' },
    },
    tags: ['2025', 'cutting-edge', 'premium', 'experimental'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'openai-o3-mini',
    name: 'o3-mini',
    display_name: 'o3-mini',
    provider: 'openai',
    model_id: 'o3-mini',
    description: 'Advanced reasoning model optimized for complex problem solving',
    capabilities: REASONING_CAPABILITIES,
    limits: {
      max_tokens: 8192,
      context_window: 128000,
      rate_limit: { requests_per_minute: 1000, tokens_per_minute: 200000 },
      pricing: { input_tokens_per_1k: 1.0, output_tokens_per_1k: 4.0, currency: 'USD' },
    },
    tags: ['2025', 'reasoning', 'problem-solving', 'specialized'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'openai-o4-mini',
    name: 'o4-mini',
    display_name: 'o4-mini',
    provider: 'openai',
    model_id: 'o4-mini',
    description: 'Next-generation reasoning model with enhanced capabilities',
    capabilities: { ...REASONING_CAPABILITIES, multimodal: true, vision: true },
    limits: {
      max_tokens: 16384,
      context_window: 200000,
      rate_limit: { requests_per_minute: 800, tokens_per_minute: 150000 },
      pricing: { input_tokens_per_1k: 2.0, output_tokens_per_1k: 8.0, currency: 'USD' },
    },
    tags: ['2025', 'reasoning', 'multimodal', 'advanced'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Note: Add latest 2025 OpenAI embedding models when available
];

// Anthropic Models
export const ANTHROPIC_MODELS: ModelConfig[] = [
  // Latest 2025 Models
  {
    id: 'anthropic-claude-4-opus',
    name: 'claude-4-opus',
    display_name: 'Claude 4 Opus',
    provider: 'anthropic',
    model_id: 'claude-4-opus',
    description: 'Most powerful Claude model with advanced reasoning and multimodal capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true, audio_input: true },
    limits: {
      max_tokens: 16384,
      context_window: 500000,
      rate_limit: { requests_per_minute: 500, tokens_per_minute: 2000000 },
      pricing: { input_tokens_per_1k: 20.0, output_tokens_per_1k: 100.0, currency: 'USD' },
    },
    tags: ['2025', 'premium', 'reasoning', 'multimodal', 'flagship'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'anthropic-claude-4-sonnet',
    name: 'claude-4-sonnet',
    display_name: 'Claude 4 Sonnet',
    provider: 'anthropic',
    model_id: 'claude-4-sonnet',
    description: 'Balanced Claude 4 model optimized for performance and efficiency',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 8192,
      context_window: 300000,
      rate_limit: { requests_per_minute: 1000, tokens_per_minute: 4000000 },
      pricing: { input_tokens_per_1k: 5.0, output_tokens_per_1k: 25.0, currency: 'USD' },
    },
    tags: ['2025', 'balanced', 'reasoning', 'vision', 'popular'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Google Models
export const GOOGLE_MODELS: ModelConfig[] = [
  // Latest 2025 Models
  {
    id: 'google-gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    display_name: 'Gemini 2.5 Flash',
    provider: 'google',
    model_id: 'gemini-2.5-flash',
    description: 'Latest Gemini model with enhanced multimodal capabilities and reasoning',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, audio_input: true, audio_output: true },
    limits: {
      max_tokens: 16384,
      context_window: 2000000,
      rate_limit: { requests_per_minute: 1500, tokens_per_minute: 6000000 },
      pricing: { input_tokens_per_1k: 0.125, output_tokens_per_1k: 0.5, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'multimodal', 'audio', 'reasoning'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'google-gemini-2.0-pro-experimental',
    name: 'gemini-2.0-pro-experimental',
    display_name: 'Gemini 2.0 Pro Experimental',
    provider: 'google',
    model_id: 'gemini-2.0-pro-experimental',
    description: 'Experimental Gemini Pro with advanced reasoning and multimodal features',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, audio_input: true, audio_output: true },
    limits: {
      max_tokens: 32768,
      context_window: 2000000,
      rate_limit: { requests_per_minute: 500, tokens_per_minute: 2000000 },
      pricing: { input_tokens_per_1k: 0.0, output_tokens_per_1k: 0.0, currency: 'USD' },
    },
    tags: ['2025', 'experimental', 'reasoning', 'multimodal', 'free'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Mistral Models
export const MISTRAL_MODELS: ModelConfig[] = [
  // Latest 2025 Models
  {
    id: 'mistral-large-24.11',
    name: 'mistral-large-24.11',
    display_name: 'Mistral Large 24.11',
    provider: 'mistral',
    model_id: 'mistral-large-24.11',
    description: 'Latest Mistral Large with improved reasoning and multilingual capabilities',
    capabilities: { ...REASONING_CAPABILITIES, multimodal: true, vision: true },
    limits: {
      max_tokens: 16384,
      context_window: 256000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 9.0, currency: 'USD' },
    },
    tags: ['2025', 'reasoning', 'multilingual', 'advanced', 'multimodal'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mistral-codestral-25.01',
    name: 'codestral-25.01',
    display_name: 'Codestral 25.01',
    provider: 'mistral',
    model_id: 'codestral-25.01',
    description: 'Specialized coding model with enhanced programming capabilities',
    capabilities: { ...CHAT_CAPABILITIES, reasoning: true },
    limits: {
      max_tokens: 32768,
      context_window: 256000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 1.0, output_tokens_per_1k: 3.0, currency: 'USD' },
    },
    tags: ['2025', 'coding', 'programming', 'specialized'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// DeepSeek Models
export const DEEPSEEK_MODELS: ModelConfig[] = [
  // Latest 2025 Models
  {
    id: 'deepseek-r1',
    name: 'deepseek-r1',
    display_name: 'DeepSeek R1',
    provider: 'deepseek',
    model_id: 'deepseek-r1',
    description: 'Revolutionary reasoning model with breakthrough problem-solving capabilities',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 32768,
      context_window: 256000,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 0.55, output_tokens_per_1k: 2.19, currency: 'USD' },
    },
    tags: ['2025', 'reasoning', 'breakthrough', 'problem-solving'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'deepseek-v3',
    name: 'deepseek-v3',
    display_name: 'DeepSeek V3',
    provider: 'deepseek',
    model_id: 'deepseek-v3',
    description: 'Latest DeepSeek model with enhanced coding and reasoning capabilities',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 16384,
      context_window: 128000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 0.27, output_tokens_per_1k: 1.1, currency: 'USD' },
    },
    tags: ['2025', 'coding', 'reasoning', 'enhanced'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Meta/Llama Models (via Groq and other providers)
export const META_MODELS: ModelConfig[] = [
  // Latest 2025 Llama 4 Models
  {
    id: 'meta-llama-4-scout',
    name: 'llama-4-scout',
    display_name: 'Llama 4 Scout',
    provider: 'meta',
    model_id: 'llama-4-scout',
    description: 'Fast and efficient Llama 4 variant optimized for speed',
    capabilities: { ...CHAT_CAPABILITIES, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 128000,
      rate_limit: { requests_per_minute: 2000 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.6, currency: 'USD' },
    },
    tags: ['2025', 'fast', 'efficient', 'llama4'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'meta-llama-4-maverick',
    name: 'llama-4-maverick',
    display_name: 'Llama 4 Maverick',
    provider: 'meta',
    model_id: 'llama-4-maverick',
    description: 'Balanced Llama 4 model with strong reasoning capabilities',
    capabilities: { ...REASONING_CAPABILITIES, multimodal: true, vision: true },
    limits: {
      max_tokens: 16384,
      context_window: 256000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 0.5, output_tokens_per_1k: 1.5, currency: 'USD' },
    },
    tags: ['2025', 'balanced', 'reasoning', 'multimodal', 'llama4'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'meta-llama-4-behemoth',
    name: 'llama-4-behemoth',
    display_name: 'Llama 4 Behemoth',
    provider: 'meta',
    model_id: 'llama-4-behemoth',
    description: 'Most powerful Llama 4 model with advanced capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, audio_input: true },
    limits: {
      max_tokens: 32768,
      context_window: 500000,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 1.0, output_tokens_per_1k: 3.0, currency: 'USD' },
    },
    tags: ['2025', 'powerful', 'advanced', 'multimodal', 'llama4'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// xAI Models
export const XAI_MODELS: ModelConfig[] = [
  // Latest 2025 Grok Models
  {
    id: 'xai-grok-3',
    name: 'grok-3',
    display_name: 'Grok 3',
    provider: 'xai',
    model_id: 'grok-3',
    description: 'Advanced Grok model with real-time knowledge and reasoning',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 16384,
      context_window: 256000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 2.0, output_tokens_per_1k: 6.0, currency: 'USD' },
    },
    tags: ['2025', 'real-time', 'reasoning', 'advanced'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'xai-grok-4',
    name: 'grok-4',
    display_name: 'Grok 4',
    provider: 'xai',
    model_id: 'grok-4',
    description: 'Next-generation Grok with breakthrough AI capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, audio_input: true, audio_output: true },
    limits: {
      max_tokens: 32768,
      context_window: 500000,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 5.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'cutting-edge', 'multimodal', 'premium'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Groq Models (High-speed inference)
export const GROQ_MODELS: ModelConfig[] = [
  // Note: Groq now primarily offers infrastructure for running various open-source models
  // Models are accessed via other providers (Meta, etc.)
];

// Cohere Models
export const COHERE_MODELS: ModelConfig[] = [
  // Note: Add latest 2025 Cohere models when available
];

// Perplexity Models
export const PERPLEXITY_MODELS: ModelConfig[] = [
  // Note: Add latest 2025 Perplexity models when available
];

// All models combined
export const ALL_MODELS = [
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GOOGLE_MODELS,
  ...MISTRAL_MODELS,
  ...DEEPSEEK_MODELS,
  ...META_MODELS,
  ...XAI_MODELS,
  ...GROQ_MODELS,
  ...COHERE_MODELS,
  ...PERPLEXITY_MODELS,
];

// Update provider configs with their models
import { CORE_PROVIDERS, COMMUNITY_PROVIDERS, AUDIO_PROVIDERS } from './types';

// Link models to providers
CORE_PROVIDERS.forEach((provider) => {
  provider.models = getModelsByProvider(provider.id);
});

COMMUNITY_PROVIDERS.forEach((provider) => {
  provider.models = getModelsByProvider(provider.id);
});

AUDIO_PROVIDERS.forEach((provider) => {
  provider.models = getModelsByProvider(provider.id);
});

// Helper functions
export function getModelsByProvider(providerId: string): ModelConfig[] {
  return ALL_MODELS.filter((model) => model.provider === providerId);
}

export function getModelById(id: string): ModelConfig | undefined {
  return ALL_MODELS.find((model) => model.id === id);
}

export function getDefaultModels(): ModelConfig[] {
  return ALL_MODELS.filter((model) => model.is_default);
}

export function getModelsByCapability(capability: keyof ModelCapabilities): ModelConfig[] {
  return ALL_MODELS.filter((model) => model.capabilities[capability]);
}

export function getModelsByTag(tag: string): ModelConfig[] {
  return ALL_MODELS.filter((model) => model.tags?.includes(tag));
}

export function getChatModels(): ModelConfig[] {
  return getModelsByCapability('chat_completion');
}

export function getMultimodalModels(): ModelConfig[] {
  return getModelsByCapability('multimodal');
}

export function getEmbeddingModels(): ModelConfig[] {
  return getModelsByCapability('embeddings');
}

export function getVisionModels(): ModelConfig[] {
  return getModelsByCapability('vision');
}

export function getAudioModels(): ModelConfig[] {
  return ALL_MODELS.filter(
    (model) => model.capabilities.audio_input || model.capabilities.audio_output
  );
}
