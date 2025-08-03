export interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  type: 'http' | 'stdio' | 'local';
  config: MCPServerConfig;
  capabilities?: string[];
  lastConnected?: Date;
  error?: string;
}

export interface MCPServerConfig {
  // HTTP transport
  url?: string;
  auth?: {
    type: 'oauth2.1' | 'bearer' | 'basic' | 'none';
    token?: string;
    clientId?: string;
    clientSecret?: string;
    scopes?: string[];
    // RFC 8707 Resource Indicators for OAuth 2.1 security
    resourceIndicator?: string;
    // RFC 9728 Protected Resource Metadata
    protectedResourceUrl?: string;
    authorizationServerUrl?: string;
  };
  headers?: Record<string, string>;

  // stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // Local transport
  path?: string;

  // General settings
  timeout?: number;
  retryCount?: number;
  keepAlive?: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  title?: string; // Display name for UI
  description?: string;
  mimeType?: string;
  // Enhanced metadata support (2025-06-18 spec)
  _meta?: Record<string, unknown>;
  // Legacy support (will be deprecated)
  annotations?: Record<string, unknown>;
}

export interface MCPTool {
  name: string;
  title?: string; // Display name for UI
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
  // Enhanced metadata support (2025-06-18 spec)
  _meta?: Record<string, unknown>;
}

export interface MCPPrompt {
  name: string;
  title?: string; // Display name for UI
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  // Enhanced metadata support (2025-06-18 spec)
  _meta?: Record<string, unknown>;
}

export interface MCPCapabilities {
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
  prompts?: {
    listChanged?: boolean;
  };
  // New in 2025-06-18 specification
  elicitation?: {
    supported?: boolean;
  };
  logging?: {
    level?: string;
  };
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: MCPMessage): Promise<void>;
  onMessage(callback: (message: MCPMessage) => void): void;
  onClose(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
}

// New 2025-06-18 specification: Resource link content type
export interface ResourceLinkContent {
  type: 'resource_link';
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export interface TextContent {
  type: 'text';
  text: string;
}

// Enhanced tool result to support resource links
export interface ToolCallResult {
  content: Array<TextContent | ResourceLinkContent>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

export interface BansheeProviderConfig {
  enabled: boolean;
  port: number;
  auth: {
    type: 'oauth2.1' | 'apikey' | 'none';
    oauth?: {
      clientId: string;
      clientSecret: string;
      scopes: string[];
      authUrl: string;
      tokenUrl: string;
    };
    apiKey?: {
      header: string;
      keys: string[];
    };
  };
  exposedResources: {
    agentConfigs: boolean;
    fileOperations: boolean;
    systemCommands: boolean;
    conversationHistory: boolean;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}
