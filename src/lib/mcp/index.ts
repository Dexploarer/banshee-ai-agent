// MCP Client exports
export { MCPClient } from './client';

// MCP Server exports
export { BansheeMCPServer } from './server';
export type { MCPServerHandler } from './server';

// Handler implementation
export { BansheeMCPHandler } from './handler';

// Types
export type {
  MCPServer,
  MCPServerConfig,
  MCPResource,
  MCPTool,
  MCPPrompt,
  MCPCapabilities,
  MCPMessage,
  MCPTransport,
  BansheeProviderConfig,
} from './types';

// Transport implementations
export { HTTPTransport } from './transport/http';
export { StdioTransport } from './transport/stdio';
export { LocalTransport } from './transport/local';

import type { BansheeProviderConfig, MCPServer } from './types';

// Default server configurations
export const defaultMCPServers: MCPServer[] = [
  {
    id: 'github-server',
    name: 'GitHub Server',
    description: 'Access GitHub repositories and issues',
    status: 'disconnected',
    type: 'http',
    config: {
      url: 'https://api.github.com/mcp',
      auth: {
        type: 'oauth2.1',
        scopes: ['repo', 'issues'],
      },
      timeout: 30000,
      retryCount: 3,
    },
  },
  {
    id: 'postgres-server',
    name: 'Postgres Server',
    description: 'Database operations and queries',
    status: 'disconnected',
    type: 'stdio',
    config: {
      command: 'postgres-mcp-server',
      args: ['--host', 'localhost', '--port', '5432'],
      timeout: 30000,
      retryCount: 3,
    },
  },
  {
    id: 'slack-server',
    name: 'Slack Server',
    description: 'Slack workspace integration',
    status: 'disconnected',
    type: 'http',
    config: {
      url: 'https://slack.com/api/mcp',
      auth: {
        type: 'bearer',
      },
      timeout: 30000,
      retryCount: 3,
    },
  },
  {
    id: 'local-files',
    name: 'Local Files',
    description: 'Access to local file system',
    status: 'disconnected',
    type: 'local',
    config: {
      path: '/usr/local/bin/files-mcp',
      timeout: 30000,
      retryCount: 3,
    },
  },
];

// Default Banshee provider configuration
export const defaultBansheeConfig: BansheeProviderConfig = {
  enabled: true,
  port: 8080,
  auth: {
    type: 'oauth2.1',
    oauth: {
      clientId: '',
      clientSecret: '',
      scopes: ['read', 'write', 'execute'],
      authUrl: 'http://localhost:8080/oauth/authorize',
      tokenUrl: 'http://localhost:8080/oauth/token',
    },
  },
  exposedResources: {
    agentConfigs: true,
    fileOperations: true,
    systemCommands: true,
    conversationHistory: false,
  },
  rateLimits: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
  },
};
