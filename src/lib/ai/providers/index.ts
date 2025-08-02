import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export interface AIProvider {
  name: string;
  models: Record<string, LanguageModel>;
  defaultModel: string;
}

export const providers: Record<string, AIProvider> = {
  openai: {
    name: 'OpenAI',
    models: {
      'gpt-4o': openai('gpt-4o') as any as LanguageModel,
      'gpt-4o-mini': openai('gpt-4o-mini') as any as LanguageModel,
      'o3-mini': openai('o3-mini') as any as LanguageModel,
    },
    defaultModel: 'gpt-4o-mini',
  },
  anthropic: {
    name: 'Anthropic',
    models: {
      'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022') as any as LanguageModel,
      'claude-3-5-haiku': anthropic('claude-3-5-haiku-20241022') as any as LanguageModel,
    },
    defaultModel: 'claude-3-5-haiku',
  },
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
