import type { CoreMessage } from 'ai';
import { type AgentConfig, AgentRuntime } from '../runtime';

// Predefined agent configurations for common use cases
export const agentConfigs: Record<string, AgentConfig> = {
  assistant: {
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful AI assistant. Be concise and accurate in your responses.',
    tools: ['showNotification'],
    maxSteps: 5,
  },

  fileManager: {
    providerId: 'openai',
    modelId: 'gpt-4o-mini',
    systemPrompt:
      'You are a file management assistant. Help users read, write, and organize files safely.',
    tools: ['readFile', 'writeFile', 'listFiles'],
    maxSteps: 10,
  },

  systemAdmin: {
    providerId: 'anthropic',
    modelId: 'claude-3-5-haiku',
    systemPrompt:
      "You are a system administration assistant. Be careful with system commands and always explain what you're doing.",
    tools: ['executeCommand', 'readFile', 'writeFile', 'showNotification'],
    maxSteps: 15,
  },

  webAgent: {
    providerId: 'openai',
    modelId: 'gpt-4o',
    systemPrompt:
      'You are a web research assistant. Help users gather information from the internet.',
    tools: ['httpRequest', 'writeFile', 'showNotification'],
    maxSteps: 20,
  },

  developer: {
    providerId: 'anthropic',
    modelId: 'claude-3-5-sonnet',
    systemPrompt:
      'You are a software development assistant. Help with coding, debugging, and project management.',
    tools: 'all',
    maxSteps: 25,
  },
};

export class Agent {
  private runtime: AgentRuntime;
  private conversation: CoreMessage[] = [];

  constructor(configName: string, customConfig?: Partial<AgentConfig>) {
    const baseConfig = agentConfigs[configName];
    if (!baseConfig) {
      throw new Error(`Unknown agent config: ${configName}`);
    }

    const config = customConfig ? { ...baseConfig, ...customConfig } : baseConfig;
    this.runtime = new AgentRuntime(config);
  }

  async chat(message: string): Promise<string> {
    this.conversation.push({ role: 'user', content: message });

    const result = await this.runtime.generateResponse(this.conversation);

    this.conversation.push({ role: 'assistant', content: result.text });

    return result.text;
  }

  async chatStream(message: string): Promise<ReadableStream<string>> {
    this.conversation.push({ role: 'user', content: message });

    const result = await this.runtime.streamResponse(this.conversation);

    // Update conversation when streaming finishes
    result.onFinish.then(({ text }) => {
      this.conversation.push({ role: 'assistant', content: text });
    });

    return result.stream;
  }

  getConversation(): CoreMessage[] {
    return [...this.conversation];
  }

  clearConversation(): void {
    this.conversation = [];
  }

  async executeTask(
    task: string,
    options: {
      pattern?: 'sequential' | 'parallel';
      steps?: string[];
      maxSteps?: number;
    } = {}
  ): Promise<string> {
    const { pattern = 'sequential', steps, maxSteps } = options;

    if (steps && pattern === 'sequential') {
      const tasks = steps.map((step) => ({ prompt: step }));
      const results = await this.runtime.sequential(tasks);
      return results.map((r) => r.text).join('\n\n');
    }

    if (steps && pattern === 'parallel') {
      const tasks = steps.map((step) => ({ prompt: step }));
      const results = await this.runtime.parallel(tasks);
      return results.map((r) => r.text).join('\n\n');
    }

    // Single task execution
    const generateOptions: Parameters<typeof this.runtime.generateResponse>[1] = {};

    if (!maxSteps) {
      generateOptions.stopWhen = (text: string, toolCalls: unknown[]) => {
        // Stop when task appears complete
        return (
          text.toLowerCase().includes('task completed') ||
          text.toLowerCase().includes('finished') ||
          toolCalls.length === 0
        );
      };
    }

    const result = await this.runtime.generateResponse(
      [{ role: 'user', content: task }],
      generateOptions
    );

    return result.text;
  }
}

// Factory functions for common agents
export function createAssistant(customConfig?: Partial<AgentConfig>): Agent {
  return new Agent('assistant', customConfig);
}

export function createFileManager(customConfig?: Partial<AgentConfig>): Agent {
  return new Agent('fileManager', customConfig);
}

export function createSystemAdmin(customConfig?: Partial<AgentConfig>): Agent {
  return new Agent('systemAdmin', customConfig);
}

export function createWebAgent(customConfig?: Partial<AgentConfig>): Agent {
  return new Agent('webAgent', customConfig);
}

export function createDeveloper(customConfig?: Partial<AgentConfig>): Agent {
  return new Agent('developer', customConfig);
}
