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

const AUDIO_INPUT_CAPABILITIES: ModelCapabilities = {
  text_generation: false,
  chat_completion: false,
  function_calling: false,
  vision: false,
  audio_input: true,
  audio_output: false,
  image_generation: false,
  embeddings: false,
  fine_tuning: false,
  streaming: true,
  multimodal: true,
  reasoning: false,
  hybrid_reasoning: false,
  native_multimodal: true,
};

const AUDIO_OUTPUT_CAPABILITIES: ModelCapabilities = {
  text_generation: false,
  chat_completion: false,
  function_calling: false,
  vision: false,
  audio_input: false,
  audio_output: true,
  image_generation: false,
  embeddings: false,
  fine_tuning: false,
  streaming: true,
  multimodal: true,
  reasoning: false,
  hybrid_reasoning: false,
  native_multimodal: true,
};

// OpenAI Models (Updated August 2025)
export const OPENAI_MODELS: ModelConfig[] = [
  // o3 Series Models (Latest reasoning models - January 2025)
  {
    id: 'openai-o3-mini',
    name: 'o3-mini',
    display_name: 'o3-mini',
    provider: 'openai',
    model_id: 'o3-mini',
    description:
      'Latest reasoning model with exceptional STEM capabilities, replaces o1-mini with 3x rate limits',
    capabilities: { ...REASONING_CAPABILITIES, reasoning: true, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 200000,
      rate_limit: { requests_per_minute: 500, tokens_per_minute: 100000 },
      pricing: { input_tokens_per_1k: 0.55, output_tokens_per_1k: 4.4, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'reasoning', 'stem', 'coding', 'math', 'o3-series', 'cost-effective'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'openai-o3-mini-high',
    name: 'o3-mini-high',
    display_name: 'o3-mini (High Reasoning)',
    provider: 'openai',
    model_id: 'o3-mini-high',
    description:
      'o3-mini with high reasoning effort for complex problem solving, comparable to o1 performance',
    capabilities: { ...REASONING_CAPABILITIES, reasoning: true, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 200000,
      rate_limit: { requests_per_minute: 200, tokens_per_minute: 50000 },
      pricing: { input_tokens_per_1k: 0.55, output_tokens_per_1k: 4.4, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'reasoning', 'high-effort', 'complex-problems', 'o3-series'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // o1 Series Models (Premium reasoning models)
  {
    id: 'openai-o1-pro',
    name: 'o1-pro',
    display_name: 'o1-pro',
    provider: 'openai',
    model_id: 'o1-pro',
    description:
      'Most powerful reasoning model using maximum compute for consistently better responses',
    capabilities: { ...REASONING_CAPABILITIES, reasoning: true, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 200000,
      rate_limit: { requests_per_minute: 100, tokens_per_minute: 20000 },
      pricing: { input_tokens_per_1k: 150.0, output_tokens_per_1k: 600.0, currency: 'USD' },
    },
    tags: ['2025', 'premium', 'reasoning', 'highest-performance', 'o1-series', 'expensive'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'openai-o1',
    name: 'o1',
    display_name: 'o1',
    provider: 'openai',
    model_id: 'o1',
    description: 'Flagship reasoning model for complex multi-step problems requiring deep thinking',
    capabilities: { ...REASONING_CAPABILITIES, reasoning: true, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 200000,
      rate_limit: { requests_per_minute: 500, tokens_per_minute: 80000 },
      pricing: { input_tokens_per_1k: 15.0, output_tokens_per_1k: 60.0, currency: 'USD' },
    },
    tags: ['2024', 'reasoning', 'flagship', 'multi-step', 'o1-series'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'openai-o1-mini',
    name: 'o1-mini',
    display_name: 'o1-mini (Deprecated)',
    provider: 'openai',
    model_id: 'o1-mini',
    description:
      'Previous generation reasoning model - use o3-mini instead for better performance and lower cost',
    capabilities: { ...REASONING_CAPABILITIES, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 128000,
      rate_limit: { requests_per_minute: 200, tokens_per_minute: 40000 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 12.0, currency: 'USD' },
    },
    tags: ['2024', 'deprecated', 'reasoning', 'replaced-by-o3-mini', 'o1-series'],
    is_active: false,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // TTS (Text-to-Speech) Models
  {
    id: 'openai-tts-1',
    name: 'tts-1',
    display_name: 'TTS-1',
    provider: 'openai',
    model_id: 'tts-1',
    description: 'Latest text-to-speech model optimized for real-time use cases and speed',
    capabilities: { ...AUDIO_OUTPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 15.0, currency: 'USD' }, // $15 per 1M characters
    },
    tags: ['2025', 'tts', 'real-time', 'speech-synthesis', 'voice'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'openai-tts-1-hd',
    name: 'tts-1-hd',
    display_name: 'TTS-1 HD',
    provider: 'openai',
    model_id: 'tts-1-hd',
    description: 'Latest text-to-speech model optimized for high quality spoken audio output',
    capabilities: { ...AUDIO_OUTPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 300 },
      pricing: { input_tokens_per_1k: 30.0, currency: 'USD' }, // $30 per 1M characters
    },
    tags: ['2025', 'tts', 'high-quality', 'hd', 'speech-synthesis', 'voice'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // STT (Speech-to-Text) Models
  {
    id: 'openai-whisper-1',
    name: 'whisper-1',
    display_name: 'Whisper-1',
    provider: 'openai',
    model_id: 'whisper-1',
    description:
      'Robust speech recognition model via large-scale weak supervision, supports 99+ languages',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES, multimodal: true },
    limits: {
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 6.0, currency: 'USD' }, // $0.006 per minute of audio
    },
    tags: ['2025', 'stt', 'whisper', 'multilingual', 'speech-recognition', '99-languages'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    capabilities: {
      ...HYBRID_REASONING_CAPABILITIES,
      vision: true,
      reasoning: true,
      hybrid_reasoning: true,
    },
    limits: {
      max_tokens: 32000,
      context_window: 200000,
      rate_limit: { requests_per_minute: 500, tokens_per_minute: 2000000 },
      pricing: { input_tokens_per_1k: 15.0, output_tokens_per_1k: 75.0, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'premium', 'reasoning', 'multimodal', 'opus4', 'extended-thinking'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'anthropic-claude-sonnet-4-20250514',
    name: 'claude-sonnet-4-20250514',
    display_name: 'Claude Sonnet 4',
    provider: 'anthropic',
    model_id: 'claude-sonnet-4-20250514',
    description:
      'High-performance model with balanced intelligence, performance, and extended thinking',
    capabilities: {
      ...HYBRID_REASONING_CAPABILITIES,
      vision: true,
      reasoning: true,
      hybrid_reasoning: true,
    },
    limits: {
      max_tokens: 64000,
      context_window: 200000,
      rate_limit: { requests_per_minute: 1000, tokens_per_minute: 4000000 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'balanced', 'reasoning', 'multimodal', 'sonnet4', 'extended-thinking'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Google Models (Updated August 2025)
export const GOOGLE_MODELS: ModelConfig[] = [
  // Gemini 2.5 Series Models (Latest as of 2025)
  {
    id: 'google-gemini-2.5-pro',
    name: 'gemini-2.5-pro',
    display_name: 'Gemini 2.5 Pro',
    provider: 'google',
    model_id: 'gemini-2.5-pro',
    description: 'Most powerful Gemini 2.5 model with advanced reasoning and thinking capabilities',
    capabilities: {
      ...HYBRID_REASONING_CAPABILITIES,
      vision: true,
      reasoning: true,
      hybrid_reasoning: true,
    },
    limits: {
      max_tokens: 8192,
      context_window: 2000000,
      rate_limit: { requests_per_minute: 1000, tokens_per_minute: 4000000 },
      pricing: { input_tokens_per_1k: 1.25, output_tokens_per_1k: 5.0, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'thinking-model', 'reasoning', 'multimodal', 'vision', 'gemini-2.5'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'google-gemini-2.5-flash',
    name: 'gemini-2.5-flash',
    display_name: 'Gemini 2.5 Flash',
    provider: 'google',
    model_id: 'gemini-2.5-flash',
    description:
      'Fast and efficient Gemini 2.5 model with search tool capabilities and thinking features',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 1000000,
      rate_limit: { requests_per_minute: 2000, tokens_per_minute: 6000000 },
      pricing: { input_tokens_per_1k: 0.075, output_tokens_per_1k: 0.3, currency: 'USD' },
    },
    tags: [
      '2025',
      'latest',
      'flash',
      'thinking-model',
      'search-tools',
      'cost-effective',
      'gemini-2.5',
    ],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'google-gemini-2.5-flash-lite-preview',
    name: 'gemini-2.5-flash-lite-preview-06-17',
    display_name: 'Gemini 2.5 Flash Lite (Preview)',
    provider: 'google',
    model_id: 'gemini-2.5-flash-lite-preview-06-17',
    description: 'Lightweight version of Gemini 2.5 Flash optimized for speed and efficiency',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 8192,
      context_window: 1000000,
      rate_limit: { requests_per_minute: 3000, tokens_per_minute: 8000000 },
      pricing: { input_tokens_per_1k: 0.0375, output_tokens_per_1k: 0.15, currency: 'USD' },
    },
    tags: ['2025', 'preview', 'flash-lite', 'lightweight', 'speed', 'cost-effective', 'gemini-2.5'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'google-gemini-live-2.5-flash-preview',
    name: 'gemini-live-2.5-flash-preview',
    display_name: 'Gemini Live 2.5 Flash (Preview)',
    provider: 'google',
    model_id: 'gemini-live-2.5-flash-preview',
    description: 'Gemini 2.5 Flash optimized for live API features and real-time interactions',
    capabilities: {
      ...MULTIMODAL_CAPABILITIES,
      vision: true,
      audio_input: true,
      audio_output: true,
      streaming: true,
    },
    limits: {
      max_tokens: 8192,
      context_window: 1000000,
      rate_limit: { requests_per_minute: 1000, tokens_per_minute: 4000000 },
      pricing: { input_tokens_per_1k: 0.075, output_tokens_per_1k: 0.3, currency: 'USD' },
    },
    tags: ['2025', 'preview', 'live-api', 'real-time', 'streaming', 'multimodal', 'gemini-2.5'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
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

// Cohere Models (Updated January 2025)
export const COHERE_MODELS: ModelConfig[] = [
  // Command A 03-2025 (Latest flagship model)
  {
    id: 'cohere-command-a-03-2025',
    name: 'command-a-03-2025',
    display_name: 'Command A 03-2025',
    provider: 'cohere',
    model_id: 'command-a-03-2025',
    description:
      'Most performant Command model with 111B parameters, 150% higher throughput than R+',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 4096,
      context_window: 256000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 2.0, output_tokens_per_1k: 8.0, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'flagship', 'high-performance', 'command-a'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Command R+ 08-2024 (Updated version)
  {
    id: 'cohere-command-r-plus-08-2024',
    name: 'command-r-plus-08-2024',
    display_name: 'Command R+ 08-2024',
    provider: 'cohere',
    model_id: 'command-r-plus-08-2024',
    description: 'Enhanced Command R+ with improved tool use and decision-making capabilities',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 4096,
      context_window: 128000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'enhanced', 'tool-use', 'rag', 'command-r+'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Command R 08-2024 (Updated version)
  {
    id: 'cohere-command-r-08-2024',
    name: 'command-r-08-2024',
    display_name: 'Command R 08-2024',
    provider: 'cohere',
    model_id: 'command-r-08-2024',
    description: 'Enhanced Command R with improved tool use and efficient performance',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true, reasoning: true },
    limits: {
      max_tokens: 4096,
      context_window: 128000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 0.5, output_tokens_per_1k: 1.5, currency: 'USD' },
    },
    tags: ['2025', 'enhanced', 'efficient', 'tool-use', 'command-r'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Embed v4 (Latest embedding model)
  {
    id: 'cohere-embed-v4',
    name: 'embed-v4',
    display_name: 'Embed v4',
    provider: 'cohere',
    model_id: 'embed-v4',
    description: 'Latest high-performance embedding model with enhanced semantic understanding',
    capabilities: EMBEDDING_CAPABILITIES,
    limits: {
      context_window: 2048,
      rate_limit: { requests_per_minute: 5000 },
      pricing: { input_tokens_per_1k: 0.1, currency: 'USD' },
    },
    tags: ['2025', 'latest', 'embeddings', 'semantic-search'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Embed English v3.0
  {
    id: 'cohere-embed-english-v3',
    name: 'embed-english-v3.0',
    display_name: 'Embed English v3.0',
    provider: 'cohere',
    model_id: 'embed-english-v3.0',
    description: 'High-quality embeddings for English text with multimodal capabilities',
    capabilities: { ...EMBEDDING_CAPABILITIES, vision: true, multimodal: true },
    limits: {
      context_window: 512,
      rate_limit: { requests_per_minute: 5000 },
      pricing: { input_tokens_per_1k: 0.1, currency: 'USD' },
    },
    tags: ['2025', 'embeddings', 'english', 'multimodal', '1024-dimensions'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Embed English Light v3.0
  {
    id: 'cohere-embed-english-light-v3',
    name: 'embed-english-light-v3.0',
    display_name: 'Embed English Light v3.0',
    provider: 'cohere',
    model_id: 'embed-english-light-v3.0',
    description: 'Faster, smaller English embedding model optimized for speed',
    capabilities: { ...EMBEDDING_CAPABILITIES, vision: true, multimodal: true },
    limits: {
      context_window: 512,
      rate_limit: { requests_per_minute: 10000 },
      pricing: { input_tokens_per_1k: 0.05, currency: 'USD' },
    },
    tags: ['2025', 'embeddings', 'english', 'fast', 'light', '384-dimensions'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Embed Multilingual v3.0
  {
    id: 'cohere-embed-multilingual-v3',
    name: 'embed-multilingual-v3.0',
    display_name: 'Embed Multilingual v3.0',
    provider: 'cohere',
    model_id: 'embed-multilingual-v3.0',
    description: 'Multilingual embedding model supporting 100+ languages',
    capabilities: { ...EMBEDDING_CAPABILITIES, vision: true, multimodal: true },
    limits: {
      context_window: 512,
      rate_limit: { requests_per_minute: 5000 },
      pricing: { input_tokens_per_1k: 0.1, currency: 'USD' },
    },
    tags: ['2025', 'embeddings', 'multilingual', 'multimodal', '1024-dimensions'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Embed Multilingual Light v3.0
  {
    id: 'cohere-embed-multilingual-light-v3',
    name: 'embed-multilingual-light-v3.0',
    display_name: 'Embed Multilingual Light v3.0',
    provider: 'cohere',
    model_id: 'embed-multilingual-light-v3.0',
    description: 'Fast multilingual embedding model optimized for speed and efficiency',
    capabilities: { ...EMBEDDING_CAPABILITIES, vision: true, multimodal: true },
    limits: {
      context_window: 512,
      rate_limit: { requests_per_minute: 10000 },
      pricing: { input_tokens_per_1k: 0.05, currency: 'USD' },
    },
    tags: ['2025', 'embeddings', 'multilingual', 'fast', 'light', '384-dimensions'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Rerank v3.5 (Latest reranking model)
  {
    id: 'cohere-rerank-v3-5',
    name: 'rerank-v3.5',
    display_name: 'Rerank v3.5',
    provider: 'cohere',
    model_id: 'rerank-v3.5',
    description: 'Advanced document reranking model for improved search relevance',
    capabilities: {
      text_generation: false,
      chat_completion: false,
      function_calling: false,
      vision: false,
      audio_input: false,
      audio_output: false,
      image_generation: false,
      embeddings: false,
      fine_tuning: false,
      streaming: false,
      multimodal: false,
      reasoning: true,
      hybrid_reasoning: false,
      native_multimodal: false,
    },
    limits: {
      context_window: 4096,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 2.0, currency: 'USD' },
    },
    tags: ['2025', 'reranking', 'search', 'relevance', 'rag'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Perplexity Models (Updated January 2025)
export const PERPLEXITY_MODELS: ModelConfig[] = [
  // Sonar Pro (Premium search model)
  {
    id: 'perplexity-sonar-pro',
    name: 'sonar-pro',
    display_name: 'Sonar Pro',
    provider: 'perplexity',
    model_id: 'sonar-pro',
    description: 'Premium AI search model with real-time web access and large context window',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 200000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 15.0, currency: 'USD' },
    },
    tags: ['2025', 'search', 'real-time', 'premium', 'sonar-pro'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Sonar (Base search model)
  {
    id: 'perplexity-sonar',
    name: 'sonar',
    display_name: 'Sonar',
    provider: 'perplexity',
    model_id: 'sonar',
    description: 'Fast AI search model with real-time web access at competitive pricing',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 127000,
      rate_limit: { requests_per_minute: 2000 },
      pricing: { input_tokens_per_1k: 1.0, output_tokens_per_1k: 1.0, currency: 'USD' },
    },
    tags: ['2025', 'search', 'real-time', 'affordable', 'sonar'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Sonar Reasoning Pro (Advanced reasoning with search)
  {
    id: 'perplexity-sonar-reasoning-pro',
    name: 'sonar-reasoning-pro',
    display_name: 'Sonar Reasoning Pro',
    provider: 'perplexity',
    model_id: 'sonar-reasoning-pro',
    description: 'Advanced reasoning model with search capabilities for complex queries',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 200000,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 2.0, output_tokens_per_1k: 8.0, currency: 'USD' },
    },
    tags: ['2025', 'reasoning', 'search', 'advanced', 'sonar-reasoning'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Sonar Reasoning (Base reasoning with search)
  {
    id: 'perplexity-sonar-reasoning',
    name: 'sonar-reasoning',
    display_name: 'Sonar Reasoning',
    provider: 'perplexity',
    model_id: 'sonar-reasoning',
    description: 'Reasoning model with search capabilities for analytical tasks',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 127000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 1.0, output_tokens_per_1k: 5.0, currency: 'USD' },
    },
    tags: ['2025', 'reasoning', 'search', 'analytical', 'sonar-reasoning'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Sonar Deep Research (Research-focused model)
  {
    id: 'perplexity-sonar-deep-research',
    name: 'sonar-deep-research',
    display_name: 'Sonar Deep Research',
    provider: 'perplexity',
    model_id: 'sonar-deep-research',
    description: 'Specialized model for comprehensive research and analysis tasks',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 16384,
      context_window: 200000,
      rate_limit: { requests_per_minute: 200 },
      pricing: { input_tokens_per_1k: 2.0, output_tokens_per_1k: 8.0, currency: 'USD' },
    },
    tags: ['2025', 'research', 'comprehensive', 'analysis', 'deep-research'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Legacy PPLX 70B Online (Deprecated but still available)
  {
    id: 'perplexity-pplx-70b-online',
    name: 'pplx-70b-online',
    display_name: 'PPLX 70B Online (Legacy)',
    provider: 'perplexity',
    model_id: 'pplx-70b-online',
    description: 'Legacy 70B parameter model with real-time web access - deprecated Feb 2025',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true, reasoning: true },
    limits: {
      max_tokens: 4096,
      context_window: 4096,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 1.0, output_tokens_per_1k: 1.0, currency: 'USD' },
    },
    tags: ['2025', 'legacy', 'deprecated', '70b', 'pplx'],
    is_active: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Legacy PPLX 7B Online (Deprecated but still available)
  {
    id: 'perplexity-pplx-7b-online',
    name: 'pplx-7b-online',
    display_name: 'PPLX 7B Online (Legacy)',
    provider: 'perplexity',
    model_id: 'pplx-7b-online',
    description: 'Legacy 7B parameter model with real-time web access - deprecated Feb 2025',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 4096,
      context_window: 4096,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'legacy', 'deprecated', '7b', 'pplx'],
    is_active: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Fireworks AI Models (Updated January 2025)
export const FIREWORKS_MODELS: ModelConfig[] = [
  // DeepSeek R1 (Latest reasoning model)
  {
    id: 'fireworks-deepseek-r1',
    name: 'deepseek-r1',
    display_name: 'DeepSeek R1',
    provider: 'fireworks',
    model_id: 'accounts/fireworks/models/deepseek-r1',
    description: 'State-of-the-art reasoning model optimized through reinforcement learning',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 256000,
      rate_limit: { requests_per_minute: 600 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'reasoning', 'deepseek', 'reinforcement-learning', 'r1'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Mixtral 8x22B Instruct
  {
    id: 'fireworks-mixtral-8x22b-instruct',
    name: 'mixtral-8x22b-instruct',
    display_name: 'Mixtral 8x22B Instruct',
    provider: 'fireworks',
    model_id: 'accounts/fireworks/models/mixtral-8x22b-instruct',
    description: 'Large-scale Mixture-of-Experts instruction model with 22B parameters per expert',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 16384,
      context_window: 65536,
      rate_limit: { requests_per_minute: 600 },
      pricing: { input_tokens_per_1k: 0.5, output_tokens_per_1k: 0.5, currency: 'USD' },
    },
    tags: ['2025', 'mixtral', 'mixture-of-experts', 'instruct', '22b'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Mixtral 8x7B Instruct
  {
    id: 'fireworks-mixtral-8x7b-instruct',
    name: 'mixtral-8x7b-instruct',
    display_name: 'Mixtral 8x7B Instruct',
    provider: 'fireworks',
    model_id: 'accounts/fireworks/models/mixtral-8x7b-instruct',
    description: 'Fast Mixture-of-Experts instruction model with 7B parameters per expert',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 32768,
      rate_limit: { requests_per_minute: 600 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'mixtral', 'mixture-of-experts', 'instruct', '7b', 'fast'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Qwen QwQ (Reasoning-focused experimental model)
  {
    id: 'fireworks-qwen-qwq',
    name: 'qwen-qwq-32b-preview',
    display_name: 'Qwen QwQ 32B Preview',
    provider: 'fireworks',
    model_id: 'accounts/fireworks/models/qwen-qwq-32b-preview',
    description: 'Experimental research model focusing on enhanced AI reasoning capabilities',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 32768,
      rate_limit: { requests_per_minute: 600 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'qwen', 'experimental', 'reasoning', '32b', 'preview'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.3 70B Instruct
  {
    id: 'fireworks-llama-3-3-70b-instruct',
    name: 'llama-v3p3-70b-instruct',
    display_name: 'Llama 3.3 70B Instruct',
    provider: 'fireworks',
    model_id: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    description: 'Latest Llama 3.3 instruction-tuned model with 70B parameters',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 131072,
      rate_limit: { requests_per_minute: 600 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'llama', 'instruct', '70b', 'v3.3'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.1 405B Instruct
  {
    id: 'fireworks-llama-3-1-405b-instruct',
    name: 'llama-v3p1-405b-instruct',
    display_name: 'Llama 3.1 405B Instruct',
    provider: 'fireworks',
    model_id: 'accounts/fireworks/models/llama-v3p1-405b-instruct',
    description: 'Massive 405B parameter Llama model for complex reasoning tasks',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 4096,
      context_window: 131072,
      rate_limit: { requests_per_minute: 200 },
      pricing: { input_tokens_per_1k: 3.0, output_tokens_per_1k: 3.0, currency: 'USD' },
    },
    tags: ['2025', 'llama', 'instruct', '405b', 'massive', 'v3.1'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.1 70B Instruct
  {
    id: 'fireworks-llama-3-1-70b-instruct',
    name: 'llama-v3p1-70b-instruct',
    display_name: 'Llama 3.1 70B Instruct',
    provider: 'fireworks',
    model_id: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    description: 'High-performance 70B parameter Llama model for general tasks',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 131072,
      rate_limit: { requests_per_minute: 600 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'llama', 'instruct', '70b', 'v3.1'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.1 8B Instruct
  {
    id: 'fireworks-llama-3-1-8b-instruct',
    name: 'llama-v3p1-8b-instruct',
    display_name: 'Llama 3.1 8B Instruct',
    provider: 'fireworks',
    model_id: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    description: 'Efficient 8B parameter Llama model for fast inference',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 131072,
      rate_limit: { requests_per_minute: 600 },
      pricing: { input_tokens_per_1k: 0.05, output_tokens_per_1k: 0.05, currency: 'USD' },
    },
    tags: ['2025', 'llama', 'instruct', '8b', 'efficient', 'v3.1'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Cerebras Models (Updated January 2025)
export const CEREBRAS_MODELS: ModelConfig[] = [
  // Llama 4 Scout (Ultra-fast inference)
  {
    id: 'cerebras-llama-4-scout',
    name: 'llama-4-scout',
    display_name: 'Llama 4 Scout',
    provider: 'cerebras',
    model_id: 'llama-4-scout',
    description: 'Ultra-fast Llama 4 Scout with 18x faster inference reaching 2,600+ tokens/s',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 128000,
      rate_limit: { requests_per_minute: 2000 },
      pricing: { input_tokens_per_1k: 0.1, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'ultra-fast', 'llama4', 'scout', '2600-tokens-s'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.1 405B (Frontier model at instant speed)
  {
    id: 'cerebras-llama-3-1-405b',
    name: 'llama-3.1-405b',
    display_name: 'Llama 3.1 405B',
    provider: 'cerebras',
    model_id: 'llama-3.1-405b',
    description: 'Massive 405B parameter frontier model running at instant speed (969 tokens/s)',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 4096,
      context_window: 131072,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 6.0, output_tokens_per_1k: 12.0, currency: 'USD' },
    },
    tags: ['2025', 'frontier', 'massive', '405b', '969-tokens-s', 'instant-speed'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.1 70B (3x faster performance)
  {
    id: 'cerebras-llama-3-1-70b',
    name: 'llama-3.1-70b',
    display_name: 'Llama 3.1 70B',
    provider: 'cerebras',
    model_id: 'llama-3.1-70b',
    description: 'High-performance 70B model with record 2,100 tokens/s speed',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 131072,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 0.6, output_tokens_per_1k: 0.6, currency: 'USD' },
    },
    tags: ['2025', 'high-performance', '70b', '2100-tokens-s', 'record-speed'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.1 8B (Ultra-fast small model)
  {
    id: 'cerebras-llama-3-1-8b',
    name: 'llama-3.1-8b',
    display_name: 'Llama 3.1 8B',
    provider: 'cerebras',
    model_id: 'llama-3.1-8b',
    description: 'Efficient 8B model with blazing 1,800 tokens/s inference speed',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 131072,
      rate_limit: { requests_per_minute: 2000 },
      pricing: { input_tokens_per_1k: 0.1, output_tokens_per_1k: 0.1, currency: 'USD' },
    },
    tags: ['2025', 'efficient', '8b', '1800-tokens-s', 'blazing-fast'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Mistral Large 2 (Coming soon)
  {
    id: 'cerebras-mistral-large-2',
    name: 'mistral-large-2',
    display_name: 'Mistral Large 2',
    provider: 'cerebras',
    model_id: 'mistral-large-2',
    description: 'Advanced Mistral Large 2 model with ultra-fast Cerebras inference',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 128000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 1.0, output_tokens_per_1k: 2.0, currency: 'USD' },
    },
    tags: ['2025', 'coming-soon', 'mistral', 'large-2', 'ultra-fast'],
    is_active: false, // Coming soon
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Community Provider Models (Updated January 2025)

// OpenRouter Models (Representative sample from 400+ models)
export const OPENROUTER_MODELS: ModelConfig[] = [
  // Llama 4 Maverick (Latest MoE model)
  {
    id: 'openrouter-llama-4-maverick',
    name: 'meta-llama/llama-4-maverick',
    display_name: 'Llama 4 Maverick',
    provider: 'openrouter',
    model_id: 'meta-llama/llama-4-maverick',
    description: 'Advanced sparse mixture-of-experts model with 4.25% parameter activation',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 256000,
      rate_limit: { requests_per_minute: 200 },
      pricing: { input_tokens_per_1k: 0.8, output_tokens_per_1k: 2.4, currency: 'USD' },
    },
    tags: ['2025', 'moe', 'sparse', 'llama4', 'maverick'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Mistral Small 3.1 (24B parameter breakthrough)
  {
    id: 'openrouter-mistral-small-3-1',
    name: 'mistralai/mistral-small-3.1',
    display_name: 'Mistral Small 3.1',
    provider: 'openrouter',
    model_id: 'mistralai/mistral-small-3.1',
    description: '24B parameter model setting new benchmarks in the "small" LLM category',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 128000,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'mistral', 'small', '24b', 'benchmark'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Free tier option
  {
    id: 'openrouter-llama-3-1-8b-free',
    name: 'meta-llama/llama-3.1-8b-instruct:free',
    display_name: 'Llama 3.1 8B Instruct (Free)',
    provider: 'openrouter',
    model_id: 'meta-llama/llama-3.1-8b-instruct:free',
    description: 'Free tier access to Llama 3.1 8B with rate limits',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 131072,
      rate_limit: { requests_per_minute: 20 },
      pricing: { input_tokens_per_1k: 0.0, output_tokens_per_1k: 0.0, currency: 'USD' },
    },
    tags: ['2025', 'free', 'llama', '8b', 'instruct'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Ollama Models (Popular local models)
export const OLLAMA_MODELS: ModelConfig[] = [
  // DeepSeek R1 (Latest reasoning model)
  {
    id: 'ollama-deepseek-r1',
    name: 'deepseek-r1',
    display_name: 'DeepSeek R1',
    provider: 'ollama',
    model_id: 'deepseek-r1',
    description: 'Open reasoning model with performance approaching leading models',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 256000,
      rate_limit: { requests_per_minute: 0 }, // Local inference
      pricing: { input_tokens_per_1k: 0.0, output_tokens_per_1k: 0.0, currency: 'USD' },
    },
    tags: ['2025', 'local', 'reasoning', 'deepseek', 'r1'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.3 70B
  {
    id: 'ollama-llama-3-3-70b',
    name: 'llama3.3:70b',
    display_name: 'Llama 3.3 70B',
    provider: 'ollama',
    model_id: 'llama3.3:70b',
    description: 'Latest Llama 3.3 with multimodal support and long context',
    capabilities: { ...HYBRID_REASONING_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 8192,
      context_window: 256000,
      rate_limit: { requests_per_minute: 0 },
      pricing: { input_tokens_per_1k: 0.0, output_tokens_per_1k: 0.0, currency: 'USD' },
    },
    tags: ['2025', 'local', 'llama', '70b', 'multimodal'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Phi-4 (Lightweight model)
  {
    id: 'ollama-phi-4',
    name: 'phi4',
    display_name: 'Phi-4',
    provider: 'ollama',
    model_id: 'phi4',
    description: 'Compact high-efficiency model designed for edge and CPU-only devices',
    capabilities: { ...CHAT_CAPABILITIES, reasoning: true },
    limits: {
      max_tokens: 4096,
      context_window: 16384,
      rate_limit: { requests_per_minute: 0 },
      pricing: { input_tokens_per_1k: 0.0, output_tokens_per_1k: 0.0, currency: 'USD' },
    },
    tags: ['2025', 'local', 'lightweight', 'edge', 'cpu', 'phi4'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Gemma 3 (Multimodal)
  {
    id: 'ollama-gemma-3',
    name: 'gemma3',
    display_name: 'Gemma 3',
    provider: 'ollama',
    model_id: 'gemma3',
    description: 'Native multimodal support with visual comparison capabilities',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 8192,
      context_window: 32768,
      rate_limit: { requests_per_minute: 0 },
      pricing: { input_tokens_per_1k: 0.0, output_tokens_per_1k: 0.0, currency: 'USD' },
    },
    tags: ['2025', 'local', 'multimodal', 'vision', 'gemma3'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Together AI Models (Optimized open-source models)
export const TOGETHER_MODELS: ModelConfig[] = [
  // Mistral Small 3 (Category leader)
  {
    id: 'together-mistral-small-3',
    name: 'mistralai/Mistral-Small-Instruct-2409',
    display_name: 'Mistral Small 3',
    provider: 'together',
    model_id: 'mistralai/Mistral-Small-Instruct-2409',
    description: '24B parameter model delivering GPT-4o mini performance',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 128000,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 0.2, output_tokens_per_1k: 0.2, currency: 'USD' },
    },
    tags: ['2025', 'mistral', 'small-3', '24b', 'category-leader'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.3 70B Multilingual
  {
    id: 'together-llama-3-3-70b',
    name: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    display_name: 'Llama 3.3 70B Instruct Turbo',
    provider: 'together',
    model_id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    description: 'Optimized multilingual model with turbo inference speed',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 131072,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 0.9, output_tokens_per_1k: 0.9, currency: 'USD' },
    },
    tags: ['2025', 'llama', '70b', 'multilingual', 'turbo'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Llama 3.1 8B (Cost-effective)
  {
    id: 'together-llama-3-1-8b',
    name: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    display_name: 'Llama 3.1 8B Instruct Turbo',
    provider: 'together',
    model_id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    description: 'Fast and cost-effective 8B model with turbo optimization',
    capabilities: { ...CHAT_CAPABILITIES, function_calling: true, reasoning: true },
    limits: {
      max_tokens: 8192,
      context_window: 131072,
      rate_limit: { requests_per_minute: 2000 },
      pricing: { input_tokens_per_1k: 0.18, output_tokens_per_1k: 0.18, currency: 'USD' },
    },
    tags: ['2025', 'llama', '8b', 'cost-effective', 'turbo'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Replicate Models (Production-ready AI models)
export const REPLICATE_MODELS: ModelConfig[] = [
  // FLUX1.1 Pro (Image generation)
  {
    id: 'replicate-flux-1-1-pro',
    name: 'black-forest-labs/flux-1.1-pro',
    display_name: 'FLUX1.1 Pro',
    provider: 'replicate',
    model_id: 'black-forest-labs/flux-1.1-pro',
    description: 'State-of-the-art text-to-image model with fine details and artistic styles',
    capabilities: {
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
      multimodal: true,
      reasoning: false,
      hybrid_reasoning: false,
      native_multimodal: true,
    },
    limits: {
      max_tokens: 0,
      context_window: 0,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 0.0, output_tokens_per_1k: 0.0, currency: 'USD' },
    },
    tags: ['2025', 'image-generation', 'flux', 'artistic', 'high-quality'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Mixtral 8x7B (Text generation)
  {
    id: 'replicate-mixtral-8x7b',
    name: 'mistralai/mixtral-8x7b-instruct-v0.1',
    display_name: 'Mixtral 8x7B Instruct',
    provider: 'replicate',
    model_id: 'mistralai/mixtral-8x7b-instruct-v0.1',
    description: 'Sparse Mixture of Experts model with 6x faster inference than Llama 2 70B',
    capabilities: { ...REASONING_CAPABILITIES, function_calling: true },
    limits: {
      max_tokens: 8192,
      context_window: 32768,
      rate_limit: { requests_per_minute: 1000 },
      pricing: { input_tokens_per_1k: 0.3, output_tokens_per_1k: 1.0, currency: 'USD' },
    },
    tags: ['2025', 'mixtral', 'moe', 'fast-inference', '8x7b'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // LLaVA (Multimodal)
  {
    id: 'replicate-llava',
    name: 'yorickvp/llava-13b',
    display_name: 'LLaVA 13B',
    provider: 'replicate',
    model_id: 'yorickvp/llava-13b',
    description: 'Multimodal model combining vision and language, nearing GPT-4 level capabilities',
    capabilities: { ...MULTIMODAL_CAPABILITIES, vision: true },
    limits: {
      max_tokens: 4096,
      context_window: 8192,
      rate_limit: { requests_per_minute: 500 },
      pricing: { input_tokens_per_1k: 0.1, output_tokens_per_1k: 0.5, currency: 'USD' },
    },
    tags: ['2025', 'multimodal', 'vision', 'llava', '13b'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  // Hailuo 2 (Video generation)
  {
    id: 'replicate-hailuo-2',
    name: 'minimax/hailuo-2',
    display_name: 'Hailuo 2',
    provider: 'replicate',
    model_id: 'minimax/hailuo-2',
    description: 'Text-to-video and image-to-video model with realistic physics simulation',
    capabilities: {
      text_generation: false,
      chat_completion: false,
      function_calling: false,
      vision: true,
      audio_input: false,
      audio_output: false,
      image_generation: true,
      embeddings: false,
      fine_tuning: false,
      streaming: false,
      multimodal: true,
      reasoning: false,
      hybrid_reasoning: false,
      native_multimodal: true,
    },
    limits: {
      max_tokens: 0,
      context_window: 0,
      rate_limit: { requests_per_minute: 100 },
      pricing: { input_tokens_per_1k: 0.0, output_tokens_per_1k: 0.0, currency: 'USD' },
    },
    tags: ['2025', 'video-generation', 'text-to-video', 'physics', 'hailuo'],
    is_active: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// ElevenLabs Models
export const ELEVENLABS_MODELS: ModelConfig[] = [
  {
    id: 'elevenlabs-eleven-multilingual-v2',
    name: 'eleven_multilingual_v2',
    display_name: 'Eleven Multilingual v2',
    provider: 'elevenlabs',
    model_id: 'eleven_multilingual_v2',
    description: 'High-quality voice synthesis with support for 29 languages',
    capabilities: { ...AUDIO_OUTPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 50 },
      pricing: { input_tokens_per_1k: 0.18, currency: 'USD' }, // $0.18 per 1K characters
    },
    tags: ['multilingual', 'high-quality', 'v2'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'elevenlabs-eleven-turbo-v2_5',
    name: 'eleven_turbo_v2_5',
    display_name: 'Eleven Turbo v2.5',
    provider: 'elevenlabs',
    model_id: 'eleven_turbo_v2_5',
    description: 'Balanced quality and speed model with ~300ms latency across 32 languages',
    capabilities: { ...AUDIO_OUTPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 100 },
      pricing: { input_tokens_per_1k: 0.15, currency: 'USD' }, // $0.15 per 1K characters
    },
    tags: ['turbo', 'balanced', 'multilingual', 'v2.5'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'elevenlabs-eleven-flash-v2_5',
    name: 'eleven_flash_v2_5',
    display_name: 'Eleven Flash v2.5',
    provider: 'elevenlabs',
    model_id: 'eleven_flash_v2_5',
    description: 'Fastest model with ~75ms latency, optimized for real-time applications',
    capabilities: { ...AUDIO_OUTPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 150 },
      pricing: { input_tokens_per_1k: 0.1, currency: 'USD' }, // $0.10 per 1K characters
    },
    tags: ['flash', 'fastest', 'real-time', 'low-latency', 'v2.5'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'elevenlabs-eleven-v3-alpha',
    name: 'eleven_v3_alpha',
    display_name: 'Eleven v3 (Alpha)',
    provider: 'elevenlabs',
    model_id: 'eleven_v3_alpha',
    description: 'Latest model with audio tag system for emotional control and enhanced quality',
    capabilities: { ...AUDIO_OUTPUT_CAPABILITIES, multimodal: true },
    limits: {
      rate_limit: { requests_per_minute: 30 },
      pricing: { input_tokens_per_1k: 0.036, currency: 'USD' }, // 80% discount until June 2025
    },
    tags: ['v3', 'alpha', 'latest', 'emotional-control', 'audio-tags', 'discounted'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'elevenlabs-eleven-monolingual-v1',
    name: 'eleven_monolingual_v1',
    display_name: 'Eleven Monolingual v1',
    provider: 'elevenlabs',
    model_id: 'eleven_monolingual_v1',
    description: 'English-only model optimized for highest quality voice synthesis',
    capabilities: { ...AUDIO_OUTPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 40 },
      pricing: { input_tokens_per_1k: 0.2, currency: 'USD' }, // $0.20 per 1K characters
    },
    tags: ['monolingual', 'english-only', 'high-quality', 'v1'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// AssemblyAI Models
export const ASSEMBLYAI_MODELS: ModelConfig[] = [
  {
    id: 'assemblyai-universal-2',
    name: 'universal-2',
    display_name: 'Universal 2',
    provider: 'assemblyai',
    model_id: 'universal-2',
    description: 'Latest universal speech-to-text model with enhanced accuracy',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 100 },
      pricing: { input_tokens_per_1k: 0.75, currency: 'USD' }, // $0.75 per audio hour
    },
    tags: ['universal', 'v2', 'latest', 'high-accuracy'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'assemblyai-universal-1',
    name: 'universal-1',
    display_name: 'Universal 1',
    provider: 'assemblyai',
    model_id: 'universal-1',
    description: 'Previous generation universal speech-to-text model',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 100 },
      pricing: { input_tokens_per_1k: 0.65, currency: 'USD' }, // $0.65 per audio hour
    },
    tags: ['universal', 'v1', 'legacy'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'assemblyai-nano',
    name: 'nano',
    display_name: 'Nano',
    provider: 'assemblyai',
    model_id: 'nano',
    description: 'Fast, cost-effective speech-to-text for basic transcription needs',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 200 },
      pricing: { input_tokens_per_1k: 0.25, currency: 'USD' }, // $0.25 per audio hour
    },
    tags: ['nano', 'fast', 'cost-effective', 'basic'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
];

// Deepgram Models
export const DEEPGRAM_MODELS: ModelConfig[] = [
  {
    id: 'deepgram-nova-2',
    name: 'nova-2',
    display_name: 'Nova 2',
    provider: 'deepgram',
    model_id: 'nova-2',
    description: 'Latest Nova model with enhanced accuracy and speed for real-time transcription',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 150 },
      pricing: { input_tokens_per_1k: 0.59, currency: 'USD' }, // $0.0059 per minute
    },
    tags: ['nova', 'v2', 'latest', 'real-time', 'streaming'],
    is_active: true,
    is_default: true,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'deepgram-nova-1',
    name: 'nova-1',
    display_name: 'Nova 1',
    provider: 'deepgram',
    model_id: 'nova-1',
    description: 'Previous generation Nova model with good accuracy and performance',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 150 },
      pricing: { input_tokens_per_1k: 0.43, currency: 'USD' }, // $0.0043 per minute
    },
    tags: ['nova', 'v1', 'legacy', 'streaming'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'deepgram-whisper-cloud',
    name: 'whisper-cloud',
    display_name: 'Whisper Cloud',
    provider: 'deepgram',
    model_id: 'whisper-cloud',
    description: 'OpenAI Whisper optimized for cloud deployment with Deepgram infrastructure',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES, multimodal: true },
    limits: {
      rate_limit: { requests_per_minute: 100 },
      pricing: { input_tokens_per_1k: 0.48, currency: 'USD' }, // $0.0048 per minute
    },
    tags: ['whisper', 'cloud', 'openai', 'multilingual'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'deepgram-enhanced',
    name: 'enhanced',
    display_name: 'Enhanced',
    provider: 'deepgram',
    model_id: 'enhanced',
    description: 'Enhanced general-purpose model with improved punctuation and formatting',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 120 },
      pricing: { input_tokens_per_1k: 0.25, currency: 'USD' }, // $0.0025 per minute
    },
    tags: ['enhanced', 'general-purpose', 'punctuation', 'formatting'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
  {
    id: 'deepgram-base',
    name: 'base',
    display_name: 'Base',
    provider: 'deepgram',
    model_id: 'base',
    description: 'Cost-effective base model for standard transcription tasks',
    capabilities: { ...AUDIO_INPUT_CAPABILITIES },
    limits: {
      rate_limit: { requests_per_minute: 150 },
      pricing: { input_tokens_per_1k: 0.15, currency: 'USD' }, // $0.0015 per minute
    },
    tags: ['base', 'cost-effective', 'standard'],
    is_active: true,
    is_default: false,
    created_at: MODEL_TIMESTAMP,
    updated_at: MODEL_TIMESTAMP,
  },
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
  ...FIREWORKS_MODELS,
  ...CEREBRAS_MODELS,
  ...OPENROUTER_MODELS,
  ...OLLAMA_MODELS,
  ...TOGETHER_MODELS,
  ...REPLICATE_MODELS,
  ...ELEVENLABS_MODELS,
  ...ASSEMBLYAI_MODELS,
  ...DEEPGRAM_MODELS,
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
