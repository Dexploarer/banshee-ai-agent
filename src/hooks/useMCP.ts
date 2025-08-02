import {
  BansheeMCPHandler,
  BansheeMCPServer,
  type BansheeProviderConfig,
  MCPClient,
  type MCPServer,
  defaultBansheeConfig,
} from '@/lib/mcp';
import { useCallback, useEffect, useState } from 'react';

export function useMCPClient() {
  const [client] = useState(() => new MCPClient());
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [connecting, setConnecting] = useState<Set<string>>(new Set());

  const connectServer = useCallback(
    async (server: MCPServer) => {
      setConnecting((prev) => new Set(prev.add(server.id)));

      try {
        await client.connectServer(server);
        setServers((prev) =>
          prev.map((s) => (s.id === server.id ? { ...s, status: 'connected' as const } : s))
        );
      } catch (error) {
        console.error(`Failed to connect to ${server.name}:`, error);
        setServers((prev) =>
          prev.map((s) =>
            s.id === server.id
              ? {
                  ...s,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : String(error),
                }
              : s
          )
        );
      } finally {
        setConnecting((prev) => {
          const next = new Set(prev);
          next.delete(server.id);
          return next;
        });
      }
    },
    [client]
  );

  const disconnectServer = useCallback(
    async (serverId: string) => {
      try {
        await client.disconnectServer(serverId);
        setServers((prev) =>
          prev.map((s) => (s.id === serverId ? { ...s, status: 'disconnected' as const } : s))
        );
      } catch (error) {
        console.error(`Failed to disconnect server ${serverId}:`, error);
      }
    },
    [client]
  );

  const listResources = useCallback(
    async (serverId: string) => {
      return client.listResources(serverId);
    },
    [client]
  );

  const getResource = useCallback(
    async (serverId: string, uri: string) => {
      return client.getResource(serverId, uri);
    },
    [client]
  );

  const listTools = useCallback(
    async (serverId: string) => {
      return client.listTools(serverId);
    },
    [client]
  );

  const callTool = useCallback(
    async (serverId: string, toolName: string, args: unknown) => {
      return client.callTool(serverId, toolName, args);
    },
    [client]
  );

  const addServer = useCallback((server: MCPServer) => {
    setServers((prev) => {
      if (prev.some((s) => s.id === server.id)) {
        return prev.map((s) => (s.id === server.id ? server : s));
      }
      return [...prev, server];
    });
  }, []);

  const removeServer = useCallback(
    async (serverId: string) => {
      await disconnectServer(serverId);
      setServers((prev) => prev.filter((s) => s.id !== serverId));
    },
    [disconnectServer]
  );

  return {
    servers,
    connecting: Array.from(connecting),
    connectServer,
    disconnectServer,
    addServer,
    removeServer,
    listResources,
    getResource,
    listTools,
    callTool,
  };
}

export function useMCPProvider() {
  const [server, setServer] = useState<BansheeMCPServer | null>(null);
  const [config, setConfig] = useState<BansheeProviderConfig>(defaultBansheeConfig);
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);

  const handler = useState(() => new BansheeMCPHandler())[0];

  const startServer = useCallback(async () => {
    if (running || starting) return;

    setStarting(true);
    try {
      const mcpServer = new BansheeMCPServer(config, handler);
      await mcpServer.start();
      setServer(mcpServer);
      setRunning(true);
      console.log('Banshee MCP server started');
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw error;
    } finally {
      setStarting(false);
    }
  }, [config, handler, running, starting]);

  const stopServer = useCallback(async () => {
    if (!server || !running) return;

    try {
      await server.stop();
      setServer(null);
      setRunning(false);
      console.log('Banshee MCP server stopped');
    } catch (error) {
      console.error('Failed to stop MCP server:', error);
      throw error;
    }
  }, [server, running]);

  const updateConfig = useCallback(
    (newConfig: Partial<BansheeProviderConfig>) => {
      setConfig((prev) => ({ ...prev, ...newConfig }));
      if (server) {
        server.updateConfig(newConfig);
      }
    },
    [server]
  );

  const restartServer = useCallback(async () => {
    if (running) {
      await stopServer();
    }
    await startServer();
  }, [running, stopServer, startServer]);

  // Auto-start server if enabled
  useEffect(() => {
    if (config.enabled && !running && !starting) {
      startServer().catch(console.error);
    }
  }, [config.enabled, running, starting, startServer]);

  return {
    server,
    config,
    running,
    starting,
    startServer,
    stopServer,
    updateConfig,
    restartServer,
    connectedClients: server?.getConnectedClients() || [],
  };
}
