import type { MCPServer } from '@/lib/mcp/types';
import { type MCPServerConfigWithOAuth, getRFC9728Discovery } from '@/lib/oauth/rfc9728';
import { useMCPStore } from '@/store/mcpStore';
import { experimental_createMCPClient } from 'ai';

/**
 * Native AI SDK MCP Integration with OAuth 2.1 and RFC 9728 Support
 *
 * Uses the native experimental_createMCPClient from AI SDK v5+
 * This replaces our custom bridge with the official implementation
 * and adds OAuth 2.1 support with RFC 9728 protected resource metadata discovery
 */
export class NativeMCPIntegration {
  private mcpClients = new Map<string, unknown>(); // AI SDK MCP Client instances
  private mcpTools = new Map<string, Record<string, unknown>>(); // Tools by server ID
  private serverConfigs = new Map<string, MCPServerConfigWithOAuth>(); // Enhanced configs with OAuth
  private isInitialized = false;
  private discovery = getRFC9728Discovery();

  constructor() {
    this.setupSubscriptions();
  }

  /**
   * Initialize MCP clients for all connected servers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const connectedServers = useMCPStore.getState().getConnectedServers();

    for (const server of connectedServers) {
      try {
        await this.connectToServer(server);
      } catch (error) {
        console.warn(`Failed to connect to MCP server ${server.id}:`, error);
      }
    }

    this.isInitialized = true;
  }

  /**
   * Connect to an MCP server using native AI SDK client with OAuth 2.1 support
   */
  async connectToServer(server: MCPServer): Promise<void> {
    try {
      // Convert to enhanced config with OAuth support
      const enhancedConfig = await this.enhanceServerConfig(server);
      this.serverConfigs.set(server.id, enhancedConfig);

      let client: unknown;
      const clientConfig: Record<string, unknown> = {};

      switch (server.type) {
        case 'stdio':
          if (!server.config.command) {
            throw new Error('stdio transport requires command');
          }
          clientConfig.transport = {
            type: 'stdio' as string,
            command: server.config.command,
            args: server.config.args || [],
            env: server.config.env || {},
          };
          break;

        case 'http':
          if (!server.config.url) {
            throw new Error('HTTP transport requires URL');
          }
          clientConfig.transport = {
            type: 'sse',
            url: server.config.url,
            headers: await this.buildHeaders(enhancedConfig),
          };
          break;

        default:
          throw new Error(`Unsupported transport type: ${server.type}`);
      }

      // Add OAuth configuration if available
      if (enhancedConfig.oauth?.enabled && enhancedConfig.oauth.metadata) {
        clientConfig.auth = {
          type: 'oauth2',
          clientId: enhancedConfig.oauth.client_id,
          clientSecret: enhancedConfig.oauth.client_secret,
          authorizationEndpoint: enhancedConfig.oauth.metadata.authorization_endpoint,
          tokenEndpoint: enhancedConfig.oauth.metadata.token_endpoint,
          scopes: enhancedConfig.oauth.scopes || ['read', 'write'],
        };
      }

      client = await experimental_createMCPClient(clientConfig);

      // Store the client
      this.mcpClients.set(server.id, client);

      // Load tools from the server
      const tools = await client.tools();
      this.mcpTools.set(server.id, tools);

      console.log(`Connected to MCP server ${server.name} with ${Object.keys(tools).length} tools`);
      console.log(`OAuth enabled: ${enhancedConfig.oauth?.enabled || false}`);
    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.id}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectFromServer(serverId: string): Promise<void> {
    const client = this.mcpClients.get(serverId);
    if (client) {
      try {
        await client.close();
      } catch (error) {
        console.warn(`Error closing MCP client ${serverId}:`, error);
      }
      this.mcpClients.delete(serverId);
      this.mcpTools.delete(serverId);
    }
  }

  /**
   * Get all tools from all connected MCP servers
   * This returns tools in the format expected by AI SDK
   */
  getAllTools(): Record<string, unknown> {
    const allTools: Record<string, unknown> = {};

    for (const [serverId, tools] of this.mcpTools) {
      // Prefix tool names with server ID to avoid conflicts
      for (const [toolName, tool] of Object.entries(tools)) {
        const prefixedName = `${serverId}_${toolName}`;
        allTools[prefixedName] = tool;
      }
    }

    return allTools;
  }

  /**
   * Get tools from a specific server
   */
  getServerTools(serverId: string): Record<string, unknown> {
    return this.mcpTools.get(serverId) || {};
  }

  /**
   * Get all connected MCP clients
   */
  getConnectedClients(): Map<string, unknown> {
    return new Map(this.mcpClients);
  }

  /**
   * Refresh tools for all servers
   */
  async refreshAllTools(): Promise<void> {
    for (const [serverId, client] of this.mcpClients) {
      try {
        const tools = await client.tools();
        this.mcpTools.set(serverId, tools);
      } catch (error) {
        console.warn(`Failed to refresh tools for server ${serverId}:`, error);
      }
    }
  }

  /**
   * Get statistics about connected servers and tools
   */
  getStats(): {
    connectedServers: number;
    totalTools: number;
    toolsByServer: Record<string, number>;
  } {
    const toolsByServer: Record<string, number> = {};
    let totalTools = 0;

    for (const [serverId, tools] of this.mcpTools) {
      const toolCount = Object.keys(tools).length;
      toolsByServer[serverId] = toolCount;
      totalTools += toolCount;
    }

    return {
      connectedServers: this.mcpClients.size,
      totalTools,
      toolsByServer,
    };
  }

  /**
   * Setup subscriptions to MCP store changes
   */
  private setupSubscriptions(): void {
    // Subscribe to MCP store changes for auto-connection/disconnection
    useMCPStore.subscribe((state) => {
      const connectedServers = state.getConnectedServers();
      const currentServerIds = new Set(this.mcpClients.keys());
      const newServerIds = new Set(connectedServers.map((s) => s.id));

      // Connect to new servers
      for (const server of connectedServers) {
        if (!currentServerIds.has(server.id)) {
          this.connectToServer(server).catch((error) => {
            console.error(`Failed to auto-connect to server ${server.id}:`, error);
          });
        }
      }

      // Disconnect from removed servers
      for (const serverId of currentServerIds) {
        if (!newServerIds.has(serverId)) {
          this.disconnectFromServer(serverId).catch((error) => {
            console.error(`Failed to auto-disconnect from server ${serverId}:`, error);
          });
        }
      }
    });
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    const disconnectPromises = Array.from(this.mcpClients.keys()).map((serverId) =>
      this.disconnectFromServer(serverId)
    );

    await Promise.allSettled(disconnectPromises);
    this.mcpClients.clear();
    this.mcpTools.clear();
    this.serverConfigs.clear();
    this.isInitialized = false;
  }

  /**
   * Enhance server configuration with OAuth 2.1 and RFC 9728 support
   */
  private async enhanceServerConfig(server: MCPServer): Promise<MCPServerConfigWithOAuth> {
    const enhanced: MCPServerConfigWithOAuth = {
      id: server.id,
      name: server.name,
      command: server.config.command || '',
      args: server.config.args || [],
      env: server.config.env || {},
      resource_server: server.config.url || server.config.command || '',
      oauth: {
        enabled: false,
        ...(server.config as Record<string, unknown>).oauth,
      },
    };

    // If OAuth is enabled and we have a resource server URL, discover metadata
    if (
      enhanced.oauth?.enabled &&
      enhanced.resource_server &&
      enhanced.resource_server.startsWith('http')
    ) {
      try {
        const metadata = await this.discovery.discoverMetadata(enhanced.resource_server);
        enhanced.oauth.metadata = metadata;
        enhanced.metadata = metadata;
        enhanced.last_updated = new Date().toISOString();

        console.log(`Discovered OAuth metadata for ${server.name}:`, {
          authorization_endpoint: metadata.authorization_endpoint,
          token_endpoint: metadata.token_endpoint,
          scopes_supported: metadata.scopes_supported,
        });
      } catch (error) {
        console.warn(`Failed to discover OAuth metadata for ${server.name}:`, error);
      }
    }

    return enhanced;
  }

  /**
   * Build headers for HTTP transport including OAuth tokens
   */
  private async buildHeaders(config: MCPServerConfigWithOAuth): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.env,
    };

    // Add OAuth bearer token if available
    if (config.oauth?.enabled && config.oauth.metadata?.token_endpoint) {
      // In a real implementation, you would:
      // 1. Check for existing valid tokens
      // 2. Refresh tokens if needed
      // 3. Perform OAuth flow if no tokens exist

      // For now, we'll add a placeholder for token management
      const token = await this.getOAuthToken(config);
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Get OAuth token for a server (placeholder implementation)
   */
  private async getOAuthToken(config: MCPServerConfigWithOAuth): Promise<string | null> {
    // This is a placeholder implementation
    // In production, you would implement:
    // 1. Token storage and retrieval
    // 2. Token refresh logic
    // 3. OAuth authorization flow

    if (!config.oauth?.enabled || !config.oauth.client_id) {
      return null;
    }

    // Check if we have a cached token
    const cachedToken = this.getStoredToken(config.id);
    if (cachedToken && !this.isTokenExpired(cachedToken)) {
      return cachedToken.access_token;
    }

    // If no valid token, would trigger OAuth flow
    console.log(`OAuth token needed for ${config.name}, would trigger authorization flow`);
    return null;
  }

  /**
   * Get stored OAuth token (placeholder)
   */
  private getStoredToken(_serverId: string): unknown {
    // In production, retrieve from secure storage
    // For now, return null to indicate no stored token
    return null;
  }

  /**
   * Check if OAuth token is expired (placeholder)
   */
  private isTokenExpired(_token: unknown): boolean {
    // In production, check token expiration
    return true;
  }

  /**
   * Get server OAuth configuration
   */
  getServerOAuthConfig(serverId: string): MCPServerConfigWithOAuth | null {
    return this.serverConfigs.get(serverId) || null;
  }

  /**
   * Update OAuth configuration for a server
   */
  async updateServerOAuth(serverId: string, oauthConfig: Record<string, unknown>): Promise<void> {
    const config = this.serverConfigs.get(serverId);
    if (config) {
      config.oauth = { ...config.oauth, ...oauthConfig };
      this.serverConfigs.set(serverId, config);

      // If OAuth is now enabled, try to reconnect
      if (oauthConfig.enabled) {
        const server = useMCPStore
          .getState()
          .getConnectedServers()
          .find((s) => s.id === serverId);
        if (server) {
          await this.disconnectFromServer(serverId);
          await this.connectToServer(server);
        }
      }
    }
  }
}

/**
 * Global native MCP integration instance
 */
let globalNativeMCP: NativeMCPIntegration | null = null;

/**
 * Get or create the global native MCP integration
 */
export function getNativeMCPIntegration(): NativeMCPIntegration {
  if (!globalNativeMCP) {
    globalNativeMCP = new NativeMCPIntegration();
  }
  return globalNativeMCP;
}

/**
 * Initialize the global native MCP integration
 */
export async function initializeNativeMCP(): Promise<NativeMCPIntegration> {
  const integration = getNativeMCPIntegration();
  await integration.initialize();
  return integration;
}

/**
 * Cleanup the global native MCP integration
 */
export async function cleanupNativeMCP(): Promise<void> {
  if (globalNativeMCP) {
    await globalNativeMCP.cleanup();
    globalNativeMCP = null;
  }
}
