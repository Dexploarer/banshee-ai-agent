import type { MCPClient } from '@/lib/mcp/client';
import type { MCPResource, MCPTool } from '@/lib/mcp/types';
import { useMCPStore } from '@/store/mcpStore';
import { z } from 'zod';

// Compatible tool type for AI SDK
type AITool = {
  description: string;
  parameters: z.ZodSchema;
  execute: (args: unknown) => Promise<unknown>;
};

/**
 * MCP-AI Runtime Integration Bridge
 *
 * Enables dynamic tool discovery and integration between MCP servers and AI runtime.
 * This bridge transforms MCP tools into AI SDK compatible tools with proper typing
 * and metadata support for the latest MCP protocol features.
 */
export class MCPAIBridge {
  private mcpClient: MCPClient;
  private toolCache = new Map<string, AITool>();
  private resourceCache = new Map<string, MCPResource[]>();
  private subscriptions = new Set<() => void>();

  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
    this.setupSubscriptions();
  }

  /**
   * Get all available tools from connected MCP servers as AI SDK tools
   */
  async getAvailableTools(): Promise<Record<string, AITool>> {
    const connectedServers = useMCPStore.getState().getConnectedServers();
    const allTools: Record<string, AITool> = {};

    for (const server of connectedServers) {
      try {
        const serverTools = await this.getServerTools(server.id);
        Object.assign(allTools, serverTools);
      } catch (error) {
        console.warn(`Failed to load tools from server ${server.id}:`, error);
      }
    }

    return allTools;
  }

  /**
   * Get tools from specific MCP server
   */
  async getServerTools(serverId: string): Promise<Record<string, AITool>> {
    try {
      const mcpTools = await this.mcpClient.listTools(serverId);
      const aiTools: Record<string, AITool> = {};

      for (const mcpTool of mcpTools) {
        const toolName = `${serverId}_${mcpTool.name}`;
        const aiTool = this.transformMCPToolToAITool(serverId, mcpTool);

        aiTools[toolName] = aiTool;
        this.toolCache.set(toolName, aiTool);
      }

      return aiTools;
    } catch (error) {
      console.error(`Error loading tools from server ${serverId}:`, error);
      return {};
    }
  }

  /**
   * Transform MCP tool definition to AI SDK tool with enhanced features
   */
  private transformMCPToolToAITool(serverId: string, mcpTool: MCPTool): AITool {
    // Create Zod schema from MCP tool input schema
    const inputSchema = this.createZodSchemaFromMCPSchema(mcpTool.inputSchema);

    return {
      description: mcpTool.description || 'MCP Tool',
      parameters: inputSchema,
      execute: async (args: unknown) => {
        try {
          const result = await this.mcpClient.callTool(serverId, mcpTool.name, args);

          // Transform MCP result content to simple format for AI SDK
          let contentText = '';
          if (Array.isArray(result.content)) {
            contentText = result.content
              .map((item) => {
                if (item.type === 'text') {
                  return item.text;
                }
                if (item.type === 'resource_link') {
                  return `[Resource: ${item.name}](${item.uri})${item.description ? ` - ${item.description}` : ''}`;
                }
                return '';
              })
              .join('\n');
          } else {
            contentText = String(result.content);
          }

          // Enhanced result with MCP 2025 features
          return {
            success: !result.isError,
            content: contentText,
            // Add resource linking support with _meta fields
            _meta: result._meta,
            // Support for linked resources in tool results
            linkedResources: result._meta?.linkedResources || [],
            // Elicitation capability support
            elicitationPrompts: result._meta?.elicitationPrompts || [],
            // Resource indicators for OAuth 2.1 compliance
            resourceIndicators: result._meta?.resourceIndicators || [],
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            _meta: {
              serverId,
              toolName: mcpTool.name,
              protocolVersion: '2025-06-18',
              timestamp: new Date().toISOString(),
              errorType: 'execution_error',
            },
          };
        }
      },
    };
  }

  /**
   * Create Zod schema from MCP tool input schema
   */
  private createZodSchemaFromMCPSchema(schema: unknown): z.ZodSchema {
    // Handle basic MCP schema to Zod conversion
    if (!schema || typeof schema !== 'object') {
      return z.any();
    }

    const schemaObj = schema as Record<string, unknown>;

    if (schemaObj.type === 'object' && schemaObj.properties) {
      const properties = schemaObj.properties as Record<string, unknown>;
      const required = (schemaObj.required as string[]) || [];

      const zodShape: Record<string, z.ZodType> = {};

      for (const [key, prop] of Object.entries(properties)) {
        const propSchema = prop as Record<string, unknown>;
        let zodType: z.ZodType;

        switch (propSchema.type) {
          case 'string':
            zodType = z.string();
            if (propSchema.description) {
              zodType = zodType.describe(propSchema.description as string);
            }
            break;
          case 'number':
            zodType = z.number();
            if (propSchema.description) {
              zodType = zodType.describe(propSchema.description as string);
            }
            break;
          case 'boolean':
            zodType = z.boolean();
            if (propSchema.description) {
              zodType = zodType.describe(propSchema.description as string);
            }
            break;
          case 'array': {
            const items = propSchema.items as Record<string, unknown>;
            if (items?.type === 'string') {
              zodType = z.array(z.string());
            } else {
              zodType = z.array(z.any());
            }
            if (propSchema.description) {
              zodType = zodType.describe(propSchema.description as string);
            }
            break;
          }
          default:
            zodType = z.any();
            if (propSchema.description) {
              zodType = zodType.describe(propSchema.description as string);
            }
        }

        // Make optional if not in required array
        if (!required.includes(key)) {
          zodType = zodType.optional();
        }

        zodShape[key] = zodType;
      }

      return z.object(zodShape);
    }

    return z.any();
  }

  /**
   * Get available resources from MCP servers with caching
   */
  async getAvailableResources(serverId?: string): Promise<MCPResource[]> {
    const connectedServers = serverId
      ? [useMCPStore.getState().getServerById(serverId)].filter(Boolean)
      : useMCPStore.getState().getConnectedServers();

    const allResources: MCPResource[] = [];

    for (const server of connectedServers) {
      const cacheKey = `resources_${server!.id}`;

      try {
        let resources = this.resourceCache.get(cacheKey);

        if (!resources) {
          resources = await this.mcpClient.listResources(server!.id);
          this.resourceCache.set(cacheKey, resources);
        }

        allResources.push(...resources);
      } catch (error) {
        console.warn(`Failed to load resources from server ${server!.id}:`, error);
      }
    }

    return allResources;
  }

  /**
   * Read resource content with enhanced metadata
   */
  async readResource(
    serverId: string,
    resourceUri: string
  ): Promise<{
    content: string;
    mimeType?: string | undefined;
    _meta?: Record<string, unknown> | undefined;
  }> {
    try {
      const result = await this.mcpClient.readResource(serverId, resourceUri);

      return {
        content: result.contents,
        mimeType: result.mimeType ?? undefined,
        _meta: {
          ...result._meta,
          // Enhanced metadata for MCP 2025
          resourceType: this.inferResourceType(resourceUri, result.mimeType),
        },
      };
    } catch (error) {
      throw new Error(`Failed to read resource ${resourceUri} from server ${serverId}: ${error}`);
    }
  }

  /**
   * Infer resource type from URI and MIME type
   */
  private inferResourceType(uri: string, mimeType?: string): string {
    if (mimeType) {
      if (mimeType.startsWith('text/')) return 'text';
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('application/json')) return 'json';
      if (mimeType.startsWith('application/')) return 'binary';
    }

    const ext = uri.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md':
      case 'txt':
        return 'text';
      case 'json':
        return 'json';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'image';
      default:
        return 'unknown';
    }
  }

  /**
   * Setup real-time subscriptions for server changes
   */
  private setupSubscriptions(): void {
    // Subscribe to MCP store changes for cache invalidation
    const unsubscribe = useMCPStore.subscribe((state) => {
      // Clear cache when servers disconnect
      const connectedServerIds = new Set(state.getConnectedServers().map((s) => s.id));

      for (const [cacheKey] of this.toolCache) {
        const serverId = cacheKey.split('_')[0];
        if (serverId && !connectedServerIds.has(serverId)) {
          this.toolCache.delete(cacheKey);
        }
      }

      for (const [cacheKey] of this.resourceCache) {
        const serverId = cacheKey.replace('resources_', '');
        if (!connectedServerIds.has(serverId)) {
          this.resourceCache.delete(cacheKey);
        }
      }
    });

    this.subscriptions.add(unsubscribe);
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.toolCache.clear();
    this.resourceCache.clear();
  }

  /**
   * Cleanup subscriptions and caches
   */
  dispose(): void {
    for (const unsubscribe of this.subscriptions) {
      unsubscribe();
    }
    this.subscriptions.clear();
    this.clearCache();
  }

  /**
   * Get tool usage statistics for monitoring
   */
  getToolStats(): {
    totalTools: number;
    toolsByServer: Record<string, number>;
    cacheSize: number;
  } {
    const toolsByServer: Record<string, number> = {};

    for (const [toolName] of this.toolCache) {
      const serverId = toolName.split('_')[0];
      if (serverId) {
        toolsByServer[serverId] = (toolsByServer[serverId] || 0) + 1;
      }
    }

    return {
      totalTools: this.toolCache.size,
      toolsByServer,
      cacheSize: this.toolCache.size + this.resourceCache.size,
    };
  }
}

/**
 * Global MCP-AI bridge instance
 */
let globalMCPBridge: MCPAIBridge | null = null;

/**
 * Initialize the global MCP-AI bridge
 */
export function initializeMCPBridge(mcpClient: MCPClient): MCPAIBridge {
  if (globalMCPBridge) {
    globalMCPBridge.dispose();
  }

  globalMCPBridge = new MCPAIBridge(mcpClient);
  return globalMCPBridge;
}

/**
 * Get the global MCP-AI bridge instance
 */
export function getMCPBridge(): MCPAIBridge | null {
  return globalMCPBridge;
}

/**
 * Cleanup global MCP bridge
 */
export function disposeMCPBridge(): void {
  if (globalMCPBridge) {
    globalMCPBridge.dispose();
    globalMCPBridge = null;
  }
}
