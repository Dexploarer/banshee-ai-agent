/**
 * Test data factories and utilities
 */

export interface TestAgent {
  name: string;
  character_role: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  model: string;
}

export interface TestConversation {
  title: string;
  agent_id: string;
  summary?: string;
}

export interface TestMemory {
  content: string;
  type: 'Task' | 'Learning' | 'Conversation' | 'Knowledge';
  tags: string[];
  metadata?: Record<string, string>;
}

export interface TestMCPServer {
  name: string;
  url: string;
  description: string;
  enabled: boolean;
}

/**
 * Generate test agent data
 */
export function createTestAgent(overrides: Partial<TestAgent> = {}): TestAgent {
  const timestamp = Date.now();
  return {
    name: `Test Agent ${timestamp}`,
    character_role: 'Assistant',
    system_prompt: 'You are a helpful AI assistant for testing purposes.',
    temperature: 0.7,
    max_tokens: 2000,
    model: 'claude-3-sonnet',
    ...overrides,
  };
}

/**
 * Generate test conversation data
 */
export function createTestConversation(
  overrides: Partial<TestConversation> = {}
): TestConversation {
  const timestamp = Date.now();
  return {
    title: `Test Conversation ${timestamp}`,
    agent_id: 'test-agent-id',
    summary: 'A test conversation for E2E testing',
    ...overrides,
  };
}

/**
 * Generate test memory data
 */
export function createTestMemory(overrides: Partial<TestMemory> = {}): TestMemory {
  const timestamp = Date.now();
  return {
    content: `Test memory content created at ${timestamp}`,
    type: 'Task',
    tags: ['test', 'e2e'],
    metadata: {
      priority: 'medium',
      category: 'testing',
    },
    ...overrides,
  };
}

/**
 * Generate test MCP server data
 */
export function createTestMCPServer(overrides: Partial<TestMCPServer> = {}): TestMCPServer {
  const timestamp = Date.now();
  return {
    name: `Test MCP Server ${timestamp}`,
    url: 'http://localhost:3001',
    description: 'A test MCP server for E2E testing',
    enabled: true,
    ...overrides,
  };
}

/**
 * Generate multiple test items
 */
export function createMultipleTestAgents(count: number): TestAgent[] {
  return Array.from({ length: count }, (_, i) =>
    createTestAgent({ name: `Test Agent ${Date.now()}-${i}` })
  );
}

export function createMultipleTestMemories(count: number): TestMemory[] {
  return Array.from({ length: count }, (_, i) =>
    createTestMemory({
      content: `Test memory ${Date.now()}-${i}`,
      tags: [`test-${i}`, 'e2e'],
    })
  );
}

/**
 * Common test data sets
 */
export const TEST_DATA = {
  agents: {
    basic: createTestAgent(),
    advanced: createTestAgent({
      name: 'Advanced Test Agent',
      character_role: 'Expert',
      system_prompt: 'You are an expert AI assistant with advanced capabilities.',
      temperature: 0.9,
      max_tokens: 4000,
    }),
    specialist: createTestAgent({
      name: 'Specialist Agent',
      character_role: 'Specialist',
      system_prompt: 'You are a specialist in a particular domain.',
      temperature: 0.5,
      max_tokens: 1500,
    }),
  },
  conversations: {
    basic: createTestConversation(),
    long: createTestConversation({
      title: 'Long Test Conversation',
      summary: 'A long conversation with many messages for testing pagination and performance',
    }),
  },
  memories: {
    task: createTestMemory({ type: 'Task', tags: ['task', 'todo', 'important'] }),
    learning: createTestMemory({
      type: 'Learning',
      content: 'Important learning about AI systems',
      tags: ['learning', 'ai', 'knowledge'],
    }),
    conversation: createTestMemory({
      type: 'Conversation',
      content: 'Key points from an important conversation',
      tags: ['conversation', 'meeting', 'notes'],
    }),
    knowledge: createTestMemory({
      type: 'Knowledge',
      content: 'General knowledge item for reference',
      tags: ['knowledge', 'reference', 'docs'],
    }),
  },
  mcpServers: {
    basic: createTestMCPServer(),
    filesystem: createTestMCPServer({
      name: 'Filesystem Server',
      url: 'stdio://path/to/filesystem-server',
      description: 'Provides file system access capabilities',
    }),
    web: createTestMCPServer({
      name: 'Web Server',
      url: 'http://localhost:3002',
      description: 'Provides web scraping and HTTP capabilities',
    }),
  },
};

/**
 * Generate random test data
 */
export function randomTestData() {
  const id = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now();

  return {
    id,
    timestamp,
    email: `test-${id}@example.com`,
    name: `Test User ${id}`,
    description: `Generated test data at ${timestamp}`,
    tags: [`test-${id}`, 'generated', 'e2e'],
  };
}

/**
 * Clean up test data patterns
 */
export const TEST_DATA_PATTERNS = {
  agents: /^Test Agent \d+/,
  conversations: /^Test Conversation \d+/,
  memories: /^Test memory (content created at \d+|\d+-\d+)$/,
  mcpServers: /^Test MCP Server \d+/,
};
