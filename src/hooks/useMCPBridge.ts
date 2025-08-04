import { disposeMCPBridge, getMCPBridge, initializeMCPBridge } from '@/lib/ai/mcpBridge';
import { useEffect, useRef } from 'react';
import { useMCPClient } from './useMCP';

/**
 * Hook to manage MCP-AI bridge lifecycle and provide access to bridge functionality
 */
export function useMCPBridge() {
  const mcpClientHook = useMCPClient();
  const bridgeRef = useRef(getMCPBridge());

  useEffect(() => {
    // Initialize bridge when MCP client is available
    // Create a minimal MCPClient wrapper from the hook methods
    const mcpClientWrapper = {
      listResources: mcpClientHook.listResources,
      readResource: mcpClientHook.getResource,
      listTools: mcpClientHook.listTools,
      callTool: mcpClientHook.callTool,
      listPrompts: async () => [], // Placeholder for prompts
      getPrompt: async () => '', // Placeholder for prompts
    } as Record<string, unknown>;

    if (!bridgeRef.current) {
      bridgeRef.current = initializeMCPBridge(mcpClientWrapper);
    }

    // Cleanup on unmount
    return () => {
      if (bridgeRef.current) {
        disposeMCPBridge();
        bridgeRef.current = null;
      }
    };
  }, [mcpClientHook]);

  return {
    bridge: bridgeRef.current,
    isReady: !!bridgeRef.current,

    /**
     * Get all available tools from MCP servers
     */
    getAvailableTools: async () => {
      if (!bridgeRef.current) {
        throw new Error('MCP bridge not initialized');
      }
      return bridgeRef.current.getAvailableTools();
    },

    /**
     * Get available resources from MCP servers
     */
    getAvailableResources: async (serverId?: string) => {
      if (!bridgeRef.current) {
        throw new Error('MCP bridge not initialized');
      }
      return bridgeRef.current.getAvailableResources(serverId);
    },

    /**
     * Read resource content
     */
    readResource: async (serverId: string, resourceUri: string) => {
      if (!bridgeRef.current) {
        throw new Error('MCP bridge not initialized');
      }
      return bridgeRef.current.readResource(serverId, resourceUri);
    },

    /**
     * Get tool usage statistics
     */
    getToolStats: () => {
      if (!bridgeRef.current) {
        return { totalTools: 0, toolsByServer: {}, cacheSize: 0 };
      }
      return bridgeRef.current.getToolStats();
    },

    /**
     * Clear all caches
     */
    clearCache: () => {
      if (bridgeRef.current) {
        bridgeRef.current.clearCache();
      }
    },
  };
}
