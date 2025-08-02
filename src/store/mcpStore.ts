import type { BansheeProviderConfig, MCPServer } from '@/lib/mcp';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MCPServerWithStats extends MCPServer {
  stats?: {
    totalRequests: number;
    totalErrors: number;
    lastRequestTime?: Date;
    averageResponseTime?: number;
  };
}

interface MCPState {
  // MCP Client state
  servers: MCPServerWithStats[];
  connectingServers: Set<string>;

  // MCP Provider state
  providerConfig: BansheeProviderConfig;
  providerRunning: boolean;
  providerStarting: boolean;
  connectedClients: string[];

  // Actions - Client
  addServer: (server: MCPServer) => void;
  updateServer: (serverId: string, updates: Partial<MCPServerWithStats>) => void;
  removeServer: (serverId: string) => void;
  setConnecting: (serverId: string, connecting: boolean) => void;
  updateServerStats: (serverId: string, stats: Partial<MCPServerWithStats['stats']>) => void;

  // Actions - Provider
  updateProviderConfig: (config: Partial<BansheeProviderConfig>) => void;
  setProviderRunning: (running: boolean) => void;
  setProviderStarting: (starting: boolean) => void;
  updateConnectedClients: (clients: string[]) => void;

  // Getters
  getServerById: (serverId: string) => MCPServerWithStats | undefined;
  getConnectedServers: () => MCPServerWithStats[];
  getServersByType: (type: MCPServer['type']) => MCPServerWithStats[];
}

export const useMCPStore = create<MCPState>()(
  persist(
    (set, get) => ({
      servers: [],
      connectingServers: new Set(),

      providerConfig: {
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
      },
      providerRunning: false,
      providerStarting: false,
      connectedClients: [],

      addServer: (server) => {
        set((state) => {
          const exists = state.servers.some((s) => s.id === server.id);
          if (exists) {
            return {
              servers: state.servers.map((s) => (s.id === server.id ? { ...s, ...server } : s)),
            };
          }
          return {
            servers: [...state.servers, { ...server, stats: { totalRequests: 0, totalErrors: 0 } }],
          };
        });
      },

      updateServer: (serverId, updates) => {
        set((state) => ({
          servers: state.servers.map((s) => (s.id === serverId ? { ...s, ...updates } : s)),
        }));
      },

      removeServer: (serverId) => {
        set((state) => ({
          servers: state.servers.filter((s) => s.id !== serverId),
          connectingServers: new Set(
            Array.from(state.connectingServers).filter((id) => id !== serverId)
          ),
        }));
      },

      setConnecting: (serverId, connecting) => {
        set((state) => {
          const newSet = new Set(state.connectingServers);
          if (connecting) {
            newSet.add(serverId);
          } else {
            newSet.delete(serverId);
          }
          return { connectingServers: newSet };
        });
      },

      updateServerStats: (serverId, stats) => {
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === serverId
              ? {
                  ...s,
                  stats: {
                    ...s.stats,
                    ...stats,
                    totalRequests: s.stats?.totalRequests || 0,
                    totalErrors: s.stats?.totalErrors || 0,
                  },
                }
              : s
          ),
        }));
      },

      updateProviderConfig: (config) => {
        set((state) => ({
          providerConfig: { ...state.providerConfig, ...config },
        }));
      },

      setProviderRunning: (running) => {
        set({ providerRunning: running });
      },

      setProviderStarting: (starting) => {
        set({ providerStarting: starting });
      },

      updateConnectedClients: (clients) => {
        set({ connectedClients: clients });
      },

      getServerById: (serverId) => {
        return get().servers.find((s) => s.id === serverId);
      },

      getConnectedServers: () => {
        return get().servers.filter((s) => s.status === 'connected');
      },

      getServersByType: (type) => {
        return get().servers.filter((s) => s.type === type);
      },
    }),
    {
      name: 'banshee-mcp',
      partialize: (state) => ({
        servers: state.servers.map(({ stats, ...server }) => server),
        providerConfig: state.providerConfig,
      }),
    }
  )
);
