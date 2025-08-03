import { HTTPTransport } from './transport/http';
import { LocalTransport } from './transport/local';
import { StdioTransport } from './transport/stdio';
import type {
  MCPCapabilities,
  MCPMessage,
  MCPPrompt,
  MCPResource,
  MCPServer,
  MCPTool,
  MCPTransport,
  ResourceLinkContent,
  TextContent,
  ToolCallResult,
} from './types';

export class MCPClient {
  private servers = new Map<string, MCPServerConnection>();

  async connectServer(server: MCPServer): Promise<void> {
    if (this.servers.has(server.id)) {
      throw new Error(`Server ${server.id} already connected`);
    }

    const transport = this.createTransport(server);
    const connection = new MCPServerConnection(server, transport);

    try {
      await connection.connect();
      this.servers.set(server.id, connection);

      // Update server status
      server.status = 'connected';
      server.lastConnected = new Date();

      console.log(`Connected to MCP server: ${server.name}`);
    } catch (error) {
      server.status = 'error';
      server.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async disconnectServer(serverId: string): Promise<void> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      return;
    }

    await connection.disconnect();
    this.servers.delete(serverId);

    const server = connection.getServer();
    server.status = 'disconnected';

    console.log(`Disconnected from MCP server: ${server.name}`);
  }

  async listResources(serverId: string): Promise<MCPResource[]> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return connection.listResources();
  }

  async readResource(
    serverId: string,
    uri: string
  ): Promise<{
    contents: string;
    mimeType?: string;
    _meta?: Record<string, unknown>;
  }> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return connection.readResource(uri);
  }

  async listTools(serverId: string): Promise<MCPTool[]> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return connection.listTools();
  }

  async callTool(serverId: string, toolName: string, args: unknown): Promise<ToolCallResult> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return connection.callTool(toolName, args);
  }

  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return connection.listPrompts();
  }

  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, unknown>
  ): Promise<string> {
    const connection = this.servers.get(serverId);
    if (!connection) {
      throw new Error(`Server ${serverId} not connected`);
    }

    return connection.getPrompt(promptName, args);
  }

  getConnectedServers(): MCPServer[] {
    return Array.from(this.servers.values()).map((conn) => conn.getServer());
  }

  getServer(serverId: string): MCPServer | undefined {
    return this.servers.get(serverId)?.getServer();
  }

  private createTransport(server: MCPServer): MCPTransport {
    switch (server.type) {
      case 'http':
        if (!server.config.url) {
          throw new Error('HTTP transport requires URL');
        }
        return new HTTPTransport(server.config.url, server.config);

      case 'stdio':
        return new StdioTransport(server.config);

      case 'local':
        return new LocalTransport(server.config);

      default:
        throw new Error(`Unsupported transport type: ${server.type}`);
    }
  }
}

class MCPServerConnection {
  private server: MCPServer;
  private transport: MCPTransport;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  >();
  private messageId = 0;
  private capabilities?: MCPCapabilities;

  constructor(server: MCPServer, transport: MCPTransport) {
    this.server = server;
    this.transport = transport;

    this.transport.onMessage(this.handleMessage.bind(this));
    this.transport.onError(this.handleError.bind(this));
    this.transport.onClose(this.handleClose.bind(this));
  }

  async connect(): Promise<void> {
    await this.transport.connect();

    // Initialize connection with server
    const initResponse = await this.sendRequest<{
      protocolVersion: string;
      capabilities: MCPCapabilities;
      serverInfo: { name: string; version: string };
    }>('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {
        resources: { subscribe: true },
        tools: {},
        prompts: {},
        // New in 2025-06-18 specification
        elicitation: { supported: true },
      },
      clientInfo: {
        name: 'Banshee',
        version: '1.0.0',
      },
    });

    this.capabilities = initResponse.capabilities;
    this.server.capabilities = Object.keys(this.capabilities || {});
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
  }

  async listResources(): Promise<MCPResource[]> {
    const response = await this.sendRequest<{ resources: MCPResource[] }>('resources/list', {});
    return response.resources || [];
  }

  async readResource(uri: string): Promise<{
    contents: string;
    mimeType?: string;
    _meta?: Record<string, unknown>;
  }> {
    const response = await this.sendRequest<{
      contents: string;
      mimeType?: string;
      _meta?: Record<string, unknown>;
    }>('resources/read', { uri });

    return {
      contents: response.contents || '',
      ...(response.mimeType && { mimeType: response.mimeType }),
      _meta: {
        protocolVersion: '2025-06-18',
        timestamp: new Date().toISOString(),
        resourceUri: uri,
        serverId: this.server.id,
        accessLevel: 'read',
        ...response._meta,
      },
    };
  }

  async listTools(): Promise<MCPTool[]> {
    const response = await this.sendRequest<{ tools: MCPTool[] }>('tools/list', {});
    return response.tools || [];
  }

  async callTool(name: string, arguments_: unknown): Promise<ToolCallResult> {
    const response = await this.sendRequest<{
      content: Array<TextContent | ResourceLinkContent>;
      isError?: boolean;
      _meta?: Record<string, unknown>;
    }>('tools/call', {
      name,
      arguments: arguments_,
    });

    // Enhanced tool call result with resource linking support
    const result: ToolCallResult = {
      content: response.content || [{ type: 'text', text: 'No content returned' }],
      isError: response.isError || false,
      _meta: {
        protocolVersion: '2025-06-18',
        timestamp: new Date().toISOString(),
        toolName: name,
        serverId: this.server.id,
        // Add resource indicators for OAuth 2.1 compliance
        resourceIndicators: response._meta?.resourceIndicators || [],
        // Support for linked resources in tool results
        linkedResources: response._meta?.linkedResources || [],
        // Elicitation capability support
        elicitationPrompts: response._meta?.elicitationPrompts || [],
        ...response._meta,
      },
    };

    return result;
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    const response = await this.sendRequest<{ prompts: MCPPrompt[] }>('prompts/list', {});
    return response.prompts || [];
  }

  async getPrompt(name: string, arguments_?: Record<string, unknown>): Promise<string> {
    const response = await this.sendRequest<{ prompt: string }>('prompts/get', {
      name,
      arguments: arguments_,
    });
    return response.prompt || '';
  }

  getServer(): MCPServer {
    return this.server;
  }

  private async sendRequest<T = unknown>(method: string, params: unknown): Promise<T> {
    const id = ++this.messageId;
    const message: MCPMessage = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, this.server.config.timeout || 30000);

      this.transport
        .send(message)
        .then(() => {
          // Don't clear timeout here, wait for response
        })
        .catch((error) => {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(error);
        });
    });
  }

  private handleMessage(message: MCPMessage): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  private handleError(error: Error): void {
    console.error(`MCP server error (${this.server.name}):`, error);
    this.server.status = 'error';
    this.server.error = error.message;

    // Reject all pending requests
    for (const [, pending] of this.pendingRequests) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  private handleClose(): void {
    console.log(`MCP server disconnected: ${this.server.name}`);
    this.server.status = 'disconnected';

    // Reject all pending requests
    const error = new Error('Connection closed');
    for (const [, pending] of this.pendingRequests) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}
