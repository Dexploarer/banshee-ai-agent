export interface Agent {
  id: string;
  name: string;
  description: string;
  model: string;
  provider: string;
  tools: string[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  agentId: string;
  title: string;
  summary?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  tokenCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: Date;
  tokens?: number;
}

export interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done';
  data: unknown;
}
