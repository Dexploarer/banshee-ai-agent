import { z } from 'zod';

// Message validation
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message too long'),
  conversation_id: z.string().uuid('Invalid conversation ID'),
  tokens: z.number().min(0).optional(),
  tool_calls: z.string().optional(),
});

// Conversation validation
export const conversationSchema = z.object({
  id: z.string().uuid('Invalid conversation ID').optional(),
  agent_id: z.string().min(1, 'Agent ID is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  summary: z.string().max(500, 'Summary too long').optional(),
  token_count: z.number().min(0).optional(),
});

// Agent validation
export const agentSchema = z.object({
  id: z.string().min(1, 'Agent ID is required'),
  name: z.string().min(1, 'Agent name is required').max(50, 'Name too long'),
  description: z.string().max(200, 'Description too long'),
  systemPrompt: z.string().max(2000, 'System prompt too long').optional(),
  tools: z.array(z.string()).optional(),
  config: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().min(1).max(100000).optional(),
      topP: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

// Search validation
export const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  limit: z.number().min(1).max(100).optional(),
});

// Settings validation
export const settingsSchema = z.object({
  appName: z.string().min(1).max(50),
  language: z.string().min(2).max(10),
  autoStart: z.boolean(),
  minimizeToTray: z.boolean(),
  defaultProvider: z.string().min(1),
  defaultModel: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(100000),
  streamResponses: z.boolean(),
  showTokenCount: z.boolean(),
  darkMode: z.boolean(),
  fontSize: z.enum(['small', 'medium', 'large']),
  notifications: z.object({
    enabled: z.boolean(),
    sound: z.boolean(),
    desktop: z.boolean(),
  }),
  shortcuts: z.object({
    newConversation: z.string(),
    clearHistory: z.string(),
    toggleSidebar: z.string(),
  }),
});

// API Key validation
export const apiKeySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  key: z.string().min(1, 'API key is required').max(200, 'API key too long'),
});

// Validation helper functions
export function validateMessage(data: unknown) {
  return messageSchema.safeParse(data);
}

export function validateConversation(data: unknown) {
  return conversationSchema.safeParse(data);
}

export function validateAgent(data: unknown) {
  return agentSchema.safeParse(data);
}

export function validateSearch(data: unknown) {
  return searchSchema.safeParse(data);
}

export function validateSettings(data: unknown) {
  return settingsSchema.safeParse(data);
}

export function validateApiKey(data: unknown) {
  return apiKeySchema.safeParse(data);
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>'"]/g, '');
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
