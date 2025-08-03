import type { LanguageModel } from 'ai';

export interface Agent {
  id: string;
  name: string;
  description: string;
  model: LanguageModel;
  systemPrompt?: string;
  tools?: string[];
  config?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export const agentConfigs: Agent[] = [
  {
    id: 'assistant',
    name: 'Assistant',
    description: 'General purpose AI assistant',
    model: {} as LanguageModel, // Will be set dynamically
    systemPrompt: 'You are a helpful AI assistant.',
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Code-focused AI assistant',
    model: {} as LanguageModel,
    systemPrompt: 'You are an expert software developer and programming assistant.',
  },
];

export function createAssistant(): Agent {
  const agent = agentConfigs.find((a) => a.id === 'assistant');
  if (!agent) throw new Error('Assistant agent not found');
  return agent;
}

export function createDeveloper(): Agent {
  const agent = agentConfigs.find((a) => a.id === 'developer');
  if (!agent) throw new Error('Developer agent not found');
  return agent;
}

export function getAgent(agentId: string): Agent | undefined {
  return agentConfigs.find((a) => a.id === agentId);
}

export function createFileManager(): Agent {
  return {
    id: 'file-manager',
    name: 'File Manager',
    description: 'File system operations',
    model: {} as LanguageModel,
    systemPrompt: 'You are a file management assistant.',
  };
}

export function createSystemAdmin(): Agent {
  return {
    id: 'system-admin',
    name: 'System Admin',
    description: 'System administration tasks',
    model: {} as LanguageModel,
    systemPrompt: 'You are a system administration assistant.',
  };
}

export function createWebAgent(): Agent {
  return {
    id: 'web-agent',
    name: 'Web Agent',
    description: 'Web scraping and research',
    model: {} as LanguageModel,
    systemPrompt: 'You are a web research assistant.',
  };
}

// Agent type is already exported above with the interface declaration
