/**
 * AI SDK v5+ Model Definitions
 *
 * Comprehensive model configurations for all supported providers
 * Updated with latest models as of 2025
 */

import type { ModelCapabilities, ModelConfig } from './types';

// Create a single timestamp for all models to avoid repeated Date creation
const MODEL_TIMESTAMP = new Date().toISOString();

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

// OpenAI Models (Updated August 2025)
export const OPENAI_MODELS: ModelConfig[] = [
  // GPT-4o Models (Latest as of August 2025)
  {
    id: 'openai-gpt-4o',
    name: 'gpt-4o',
    display_name: 'GPT-4o',
    provider: 'openai',
    model_id: 'gpt-4o',
    description: 'Latest GPT-4o model with enhanced reasoning, vision, and multimodal capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, audio_input: true, audio_output: true },
    limits: {
      max_tokens: 4096,
      context_window: 128000,
      rate_limit: { requests_per_minute: 10000, tokens_per_minute: 1000000 },
      pricing: { input_tokens_per_1k: 5.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'reasoning', 'multimodal', 'vision', 'audio'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'openai-gpt-4o-mini',
    name: 'gpt-4o-mini',
    display_name: 'GPT-4o Mini',
    provider: 'openai',
    model_id: 'gpt-4o-mini',
    description: 'Efficient GPT-4o variant optimized for speed and cost',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 4096,
      context_window: 128000,
      rate_limit: { requests_per_minute: 20000, tokens_per_minute: 2000000 },
      pricing: { input_tokens_per_1k: 0.15, output_tokens_per_1k: 0.6, currency: 'USD' },
    },
    tags: ['2025', 'efficient', 'cost-effective', 'multimodal', 'vision'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // GPT-4 Turbo Models
  {
    id: 'openai-gpt-4-turbo',
    name: 'gpt-4-turbo',
    display_name: 'GPT-4 Turbo',
    provider: 'openai',
    model_id: 'gpt-4-turbo',
    description: 'GPT-4 Turbo with vision capabilities and improved performance',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 4096,
      context_window: 128000,
      rate_limit: { requests_per_minute: 5000, tokens_per_minute: 500000 },
      pricing: { input_tokens_per_1k: 10.0, output_tokens_per_1k: 30.0, currency: 'USD' },
    },
    tags: ['2025', 'turbo', 'vision', 'multimodal'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // GPT-3.5 Turbo Models
  {
    id: 'openai-gpt-3.5-turbo',
    name: 'gpt-3.5-turbo',
    display_name: 'GPT-3.5 Turbo',
    provider: 'openai',
    model_id: 'gpt-3.5-turbo',
    description: 'Fast and efficient GPT-3.5 Turbo model',
    capabilities: CHAT_CAPABILITIES,
    limits: {
      max_tokens: 4096,
      context_window: 16385,
      rate_limit: { requests_per_minute: 3000, tokens_per_minute: 300000 },
      pricing: { input_tokens_per_1k: 0.5, output_tokens_per_1k: 1.5, currency: 'USD' },
    },
    tags: ['2025', 'fast', 'efficient', 'chat'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'openai-gpt-3.5-turbo-0125',
    name: 'gpt-3.5-turbo-0125',
    display_name: 'GPT-3.5 Turbo (Jan 2025)',
    provider: 'openai',
    model_id: 'gpt-3.5-turbo-0125',
    description: 'Latest GPT-3.5 Turbo with improved instruction following and JSON mode',
    capabilities: CHAT_CAPABILITIES,
    limits: {
      max_tokens: 4096,
      context_window: 16385,
      rate_limit: { requests_per_minute: 3000, tokens_per_minute: 300000 },
      pricing: { input_tokens_per_1k: 0.5, output_tokens_per_1k: 1.5, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'chat', 'json-mode'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Embedding Models
  {
    id: 'openai-text-embedding-3-small',
    name: 'text-embedding-3-small',
    display_name: 'Text Embedding 3 Small',
    provider: 'openai',
    model_id: 'text-embedding-3-small',
    description: 'Latest text embedding model optimized for efficiency',
    capabilities: EMBEDDING_CAPABILITIES,
    limits: {
      context_window: 8192,
      rate_limit: { requests_per_minute: 10000 },
      pricing: { input_tokens_per_1k: 0.00002, currency: 'USD' },
    },
    tags: ['2025', 'embeddings', 'efficient'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'openai-text-embedding-3-large',
    name: 'text-embedding-3-large',
    display_name: 'Text Embedding 3 Large',
    provider: 'openai',
    model_id: 'text-embedding-3-large',
    description: 'High-performance text embedding model',
    capabilities: EMBEDDING_CAPABILITIES,
    limits: {
      context_window: 8192,
      rate_limit: { requests_per_minute: 5000 },
      pricing: { input_tokens_per_1k: 0.00013, currency: 'USD' },
    },
    tags: ['2025', 'embeddings', 'high-performance'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Anthropic Models (Updated August 2025)
export const ANTHROPIC_MODELS: ModelConfig[] = [
  // Claude 4 Models (Latest as of August 2025)
  {
    id: 'anthropic-claude-opus-4-20250514',
    name: 'claude-opus-4-20250514',
    display_name: 'Claude Opus 4',
    provider: 'anthropic',
    model_id: 'claude-opus-4-20250514',
    description:
      'Most capable Claude model with highest level of intelligence and extended thinking',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 32000,
      context_window: 200000,
      rate_limit: { requests_per_minute: 500, tokens_per_minute: 2000000 },
      pricing: { input_tokens_per_1k: 15.0, output_tokens_per_1k: 75.0, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'premium', 'reasoning', 'multimodal', 'opus4'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'anthropic-claude-sonnet-4-20250514',
    name: 'claude-sonnet-4-20250514',
    display_name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-20250514',
    description: 'High-performance model with balanced intelligence and performance',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 64000,
      context_window: 200000,
      rate_limit: { requests_per_minute: 1000, tokens_per_minute: 4000000 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'balanced', 'reasoning', 'multimodal', 'sonnet4'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Claude 3.7 Models
  {
    id: 'anthropic-claude-3-7-sonnet-20250219',
    name: 'claude-3-7-sonnet-20250219',
    display_name: 'Claude 3.7 Sonnet',
    provider: 'anthropic',
    model_id: 'claude-3-7-sonnet-20250219',
    description: 'High-performance model with early extended thinking capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 64000,
      context_window: 200000,
      rate_limit: { requests_per_minute: 1000, tokens_per_minute: 4000000 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'reasoning', 'extended-thinking', 'multimodal', 'sonnet3.7'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Claude 3.5 Models
  {
    id: 'anthropic-claude-3-5-sonnet-20241022',
    name: 'claude-3-5-sonnet-20241022',
    display_name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    model_id: 'claude-3-5-sonnet-20241022',
    description: 'Previous intelligent model with high level of intelligence and capability',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 8192,
      context_window: 200000,
      rate_limit: { requests_per_minute: 1000, tokens_per_minute: 4000000 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'previous', 'intelligent', 'multimodal', 'sonnet3.5'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'anthropic-claude-3-5-haiku-20241022',
    name: 'claude-3-5-haiku-20241022',
    display_name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    model_id: 'claude-3-5-haiku-20241022',
    description: 'Fastest Claude model optimized for speed and cost',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 8192,
      context_window: 200000,
      rate_limit: { requests_per_minute: 2000, tokens_per_minute: 8000000 },
      pricing: { input_tokens_per_1k: 0.8, output_tokens_per_1k: 4.0, currency: 'USD' },
    },
    tags: ['2025', 'fastest', 'cost-effective', 'multimodal', 'haiku3.5'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // Claude 3 Models (Legacy but still available)
  {
    id: 'anthropic-claude-3-opus-20240229',
    name: 'claude-3-opus-20240229',
    display_name: 'Claude 3 Opus',
    provider: 'anthropic',
    model_id: 'claude-3-opus-20240229',
    description: 'Powerful Claude 3 model for complex tasks',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 4096,
      context_window: 200000,
      rate_limit: { requests_per_minute: 500, tokens_per_minute: 2000000 },
      pricing: { input_tokens_per_1k: 15.0, output_tokens_per_1k: 75.0, currency: 'USD' },
    },
    tags: ['2025', 'legacy', 'powerful', 'multimodal', 'opus3'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'anthropic-claude-3-haiku-20240307',
    name: 'claude-3-haiku-20240307',
    display_name: 'Claude 3 Haiku',
    provider: 'anthropic',
    model_id: 'claude-3-haiku-20240307',
    description: 'Fast and compact Claude 3 model for near-instant responsiveness',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 4096,
      context_window: 200000,
      rate_limit: { requests_per_minute: 2000, tokens_per_minute: 8000000 },
      pricing: { input_tokens_per_1k: 0.25, output_tokens_per_1k: 1.25, currency: 'USD' },
    },
    tags: ['2025', 'legacy', 'fast', 'compact', 'multimodal', 'haiku3'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Google Models (Updated August 2025)
export const GOOGLE_MODELS: ModelConfig[] = [
  // Gemini 2.0 Models (Latest as of August 2025)
  {
    id: 'google-gemini-2.0-flash-exp',
    name: 'gemini-2.0-flash-exp',
    display_name: 'Gemini 2.0 Flash (Experimental)',
    provider: 'google',
    model_id: 'gemini-2.0-flash-exp',
    description: 'Latest Gemini 2.0 Flash model with enhanced multimodal capabilities',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 16384,
      context_window: 2000000,
      rate_limit: { requests_per_minute: 1500, tokens_per_minute: 6000000 },
      pricing: { input_tokens_per_1k: 0.125, output_tokens_per_1k: 0.5, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'experimental', 'multimodal', 'flash'],
    is_active: true,
    is_default: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'google-gemini-2.0-pro-exp',
    name: 'gemini-2.0-pro-exp',
    display_name: 'Gemini 2.0 Pro (Experimental)',
    provider: 'google',
    model_id: 'gemini-2.0-pro-exp',
    description: 'Experimental Gemini 2.0 Pro with advanced reasoning capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true },
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
  // Gemini 1.5 Models (Stable)
  {
    id: 'google-gemini-1.5-flash',
    name: 'gemini-1.5-flash',
    display_name: 'Gemini 1.5 Flash',
    provider: 'google',
    model_id: 'gemini-1.5-flash',
    description: 'Fast and efficient Gemini 1.5 model with multimodal capabilities',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 16384,
      context_window: 2000000,
      rate_limit: { requests_per_minute: 1500, tokens_per_minute: 6000000 },
      pricing: { input_tokens_per_1k: 0.125, output_tokens_per_1k: 0.5, currency: 'USD' },
    },
    tags: ['2025', 'stable', 'fast', 'multimodal', 'flash'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'google-gemini-1.5-pro',
    name: 'gemini-1.5-pro',
    display_name: 'Gemini 1.5 Pro',
    provider: 'google',
    model_id: 'gemini-1.5-pro',
    description: 'Advanced Gemini 1.5 Pro with reasoning and multimodal capabilities',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 32768,
      context_window: 2000000,
      rate_limit: { requests_per_minute: 500, tokens_per_minute: 2000000 },
      pricing: { input_tokens_per_1k: 3.5, output_tokens_per_1k: 10.5, currency: 'USD' },
    },
    tags: ['2025', 'stable', 'advanced', 'reasoning', 'multimodal'],
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
  // Llama Models (via Groq)
  {
    id: 'groq-llama-3.1-8b-instant',
    name: 'llama-3.1-8b-instant',
    display_name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    model_id: 'llama-3.1-8b-instant',
    description: 'Ultra-fast Llama 3.1 8B model optimized for instant responses',
    capabilities: CHAT_CAPABILITIES,
    limits: {
      max_tokens: 4096,
      context_window: 8192,
      rate_limit: { requests_per_minute: 10000, tokens_per_minute: 1000000 },
      pricing: { input_tokens_per_1k: 0.05, output_tokens_per_1k: 0.1, currency: 'USD' },
    },
    tags: ['2025', 'ultra-fast', 'instant', 'llama3.1', 'groq'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'groq-llama-3.1-70b-version',
    name: 'llama-3.1-70b-version',
    display_name: 'Llama 3.1 70B Version',
    provider: 'groq',
    model_id: 'llama-3.1-70b-version',
    description: 'High-performance Llama 3.1 70B model with enhanced capabilities',
    capabilities: { ...CHAT_CAPABILITIES, reasoning: true },
    limits: {
      max_tokens: 4096,
      context_window: 8192,
      rate_limit: { requests_per_minute: 5000, tokens_per_minute: 500000 },
      pricing: { input_tokens_per_1k: 0.7, output_tokens_per_1k: 0.8, currency: 'USD' },
    },
    tags: ['2025', 'high-performance', 'reasoning', 'llama3.1', 'groq'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'groq-llama-3.1-405b-reasoning',
    name: 'llama-3.1-405b-reasoning',
    display_name: 'Llama 3.1 405B Reasoning',
    provider: 'groq',
    model_id: 'llama-3.1-405b-reasoning',
    description: 'Massive 405B parameter model optimized for complex reasoning tasks',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 4096,
      context_window: 8192,
      rate_limit: { requests_per_minute: 2000, tokens_per_minute: 200000 },
      pricing: { input_tokens_per_1k: 2.0, output_tokens_per_1k: 2.0, currency: 'USD' },
    },
    tags: ['2025', 'massive', 'reasoning', 'llama3.1', 'groq'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Mixtral Models (via Groq)
  {
    id: 'groq-mixtral-8x7b-32768',
    name: 'mixtral-8x7b-32768',
    display_name: 'Mixtral 8x7B 32K',
    provider: 'groq',
    model_id: 'mixtral-8x7b-32768',
    description: 'Ultra-fast Mixtral 8x7B model with 32K context window',
    capabilities: CHAT_CAPABILITIES,
    limits: {
      max_tokens: 4096,
      context_window: 32768,
      rate_limit: { requests_per_minute: 8000, tokens_per_minute: 800000 },
      pricing: { input_tokens_per_1k: 0.14, output_tokens_per_1k: 0.42, currency: 'USD' },
    },
    tags: ['2025', 'ultra-fast', 'mixtral', 'groq'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Gemma Models (via Groq)
  {
    id: 'groq-gemma-2-9b-it',
    name: 'gemma-2-9b-it',
    display_name: 'Gemma 2 9B IT',
    provider: 'groq',
    model_id: 'gemma-2-9b-it',
    description: 'Fast Gemma 2 9B instruction-tuned model',
    capabilities: CHAT_CAPABILITIES,
    limits: {
      max_tokens: 4096,
      context_window: 8192,
      rate_limit: { requests_per_minute: 10000, tokens_per_minute: 1000000 },
      pricing: { input_tokens_per_1k: 0.1, output_tokens_per_1k: 0.1, currency: 'USD' },
    },
    tags: ['2025', 'fast', 'gemma2', 'groq'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'groq-gemma-2-27b-it',
    name: 'gemma-2-27b-it',
    display_name: 'Gemma 2 27B IT',
    provider: 'groq',
    model_id: 'gemma-2-27b-it',
    description: 'High-performance Gemma 2 27B instruction-tuned model',
    capabilities: { ...CHAT_CAPABILITIES, reasoning: true },
    limits: {
      max_tokens: 4096,
      context_window: 8192,
      rate_limit: { requests_per_minute: 5000, tokens_per_minute: 500000 },
      pricing: { input_tokens_per_1k: 0.3, output_tokens_per_1k: 0.3, currency: 'USD' },
    },
    tags: ['2025', 'high-performance', 'reasoning', 'gemma2', 'groq'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
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
import { AUDIO_PROVIDERS, COMMUNITY_PROVIDERS, CORE_PROVIDERS } from './types';

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
