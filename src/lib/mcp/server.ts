import type {
  BansheeProviderConfig,
  MCPCapabilities,
  MCPMessage,
  MCPPrompt,
  MCPResource,
  MCPTool,
} from './types';

export interface MCPServerHandler {
  handleListResources(): Promise<MCPResource[]>;
  handleReadResource(uri: string): Promise<{ contents: string; mimeType?: string }>;
  handleListTools(): Promise<MCPTool[]>;
  handleCallTool(
    name: string,
    arguments_: unknown
  ): Promise<{ content: unknown; isError?: boolean }>;
  handleListPrompts(): Promise<MCPPrompt[]>;
  handleGetPrompt(name: string, arguments_?: Record<string, unknown>): Promise<{ prompt: string }>;
}

export class BansheeMCPServer {
  private config: BansheeProviderConfig;
  private handler: MCPServerHandler;
  private clients = new Map<string, MCPClient>();
  private running = false;

  constructor(config: BansheeProviderConfig, handler: MCPServerHandler) {
    this.config = config;
    this.handler = handler;
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Server already running');
    }

    try {
      // Start HTTP server via Tauri
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('start_mcp_server', {
        config: this.config,
      });

      // Set up message handling
      const { listen } = await import('@tauri-apps/api/event');

      await listen<{ clientId: string; message: string }>('mcp_server_message', async (event) => {
        try {
          const message: MCPMessage = JSON.parse(event.payload.message);
          const response = await this.handleMessage(message);

          if (response) {
            await invoke('send_mcp_server_response', {
              clientId: event.payload.clientId,
              message: JSON.stringify(response),
            });
          }
        } catch (error) {
          console.error('Error handling MCP message:', error);

          const errorResponse: MCPMessage = {
            jsonrpc: '2.0',
            id: 'error',
            error: {
              code: -32603,
              message: error instanceof Error ? error.message : String(error),
            },
          };

          await invoke('send_mcp_server_response', {
            clientId: event.payload.clientId,
            message: JSON.stringify(errorResponse),
          });
        }
      });

      await listen<{ clientId: string }>('mcp_client_connected', (event) => {
        this.clients.set(event.payload.clientId, new MCPClient(event.payload.clientId));
        console.log(`MCP client connected: ${event.payload.clientId}`);
      });

      await listen<{ clientId: string }>('mcp_client_disconnected', (event) => {
        this.clients.delete(event.payload.clientId);
        console.log(`MCP client disconnected: ${event.payload.clientId}`);
      });

      this.running = true;
      console.log(`Banshee MCP server started on port ${this.config.port}`);
    } catch (error) {
      throw new Error(`Failed to start MCP server: ${error}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('stop_mcp_server');

      this.clients.clear();
      this.running = false;

      console.log('Banshee MCP server stopped');
    } catch (error) {
      console.error('Error stopping MCP server:', error);
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  updateConfig(config: Partial<BansheeProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private async handleMessage(message: MCPMessage): Promise<MCPMessage | null> {
    try {
      if (!message.method) {
        return this.createErrorResponse(message.id, -32600, 'Invalid Request: missing method');
      }

      const result = await this.routeMethod(message);

      const response: MCPMessage = {
        jsonrpc: '2.0',
        result,
      };

      if (message.id !== undefined) {
        response.id = message.id;
      }

      return response;
    } catch (error) {
      return this.createErrorResponse(
        message.id,
        -32603,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private createErrorResponse(
    id: string | number | undefined,
    code: number,
    message: string
  ): MCPMessage {
    const response: MCPMessage = {
      jsonrpc: '2.0',
      error: { code, message },
    };

    if (id !== undefined) {
      response.id = id;
    }

    return response;
  }

  private async routeMethod(message: MCPMessage): Promise<unknown> {
    switch (message.method) {
      case 'initialize':
        return this.handleInitialize(
          message.params as {
            protocolVersion: string;
            capabilities: MCPCapabilities;
            clientInfo: { name: string; version: string };
          }
        );

      case 'resources/list':
        return this.handleResourcesList();

      case 'resources/read':
        return this.handleResourcesRead(message.params as { uri: string });

      case 'tools/list':
        return this.handleToolsList();

      case 'tools/call':
        return this.handleToolsCall(message.params as { name: string; arguments: unknown });

      case 'prompts/list':
        return this.handlePromptsList();

      case 'prompts/get':
        return this.handlePromptsGet(
          message.params as {
            name: string;
            arguments?: Record<string, unknown>;
          }
        );

      default:
        throw new Error(`Unknown method: ${message.method}`);
    }
  }

  private async handleResourcesList(): Promise<{ resources: MCPResource[] }> {
    if (!this.config.exposedResources.fileOperations) {
      throw new Error('Resource access not enabled');
    }
    return { resources: await this.handler.handleListResources() };
  }

  private async handleResourcesRead({
    uri,
  }: { uri: string }): Promise<{ contents: string; mimeType?: string }> {
    if (!this.config.exposedResources.fileOperations) {
      throw new Error('Resource access not enabled');
    }
    return this.handler.handleReadResource(uri);
  }

  private async handleToolsList(): Promise<{ tools: MCPTool[] }> {
    if (!this.config.exposedResources.systemCommands) {
      throw new Error('Tool access not enabled');
    }
    return { tools: await this.handler.handleListTools() };
  }

  private async handleToolsCall({
    name,
    arguments: args,
  }: { name: string; arguments: unknown }): Promise<{ content: unknown; isError?: boolean }> {
    if (!this.config.exposedResources.systemCommands) {
      throw new Error('Tool access not enabled');
    }
    return this.handler.handleCallTool(name, args);
  }

  private async handlePromptsList(): Promise<{ prompts: MCPPrompt[] }> {
    if (!this.config.exposedResources.agentConfigs) {
      throw new Error('Prompt access not enabled');
    }
    return { prompts: await this.handler.handleListPrompts() };
  }

  private async handlePromptsGet({
    name,
    arguments: args,
  }: { name: string; arguments?: Record<string, unknown> }): Promise<{ prompt: string }> {
    if (!this.config.exposedResources.agentConfigs) {
      throw new Error('Prompt access not enabled');
    }
    return this.handler.handleGetPrompt(name, args);
  }

  private async handleInitialize(_params: {
    protocolVersion: string;
    capabilities: MCPCapabilities;
    clientInfo: { name: string; version: string };
  }): Promise<{
    protocolVersion: string;
    capabilities: MCPCapabilities;
    serverInfo: { name: string; version: string };
  }> {
    const capabilities: MCPCapabilities = {
      logging: {
        level: 'info',
      },
    };

    if (this.config.exposedResources.fileOperations) {
      capabilities.resources = {
        subscribe: true,
        listChanged: true,
      };
    }

    if (this.config.exposedResources.systemCommands) {
      capabilities.tools = {
        listChanged: true,
      };
    }

    if (this.config.exposedResources.agentConfigs) {
      capabilities.prompts = {
        listChanged: true,
      };
    }

    return {
      protocolVersion: '2024-11-05',
      capabilities,
      serverInfo: {
        name: 'Banshee',
        version: '1.0.0',
      },
    };
  }
}

class MCPClient {
  constructor(public id: string) {}
}
