import {
  type NativeMCPIntegration,
  cleanupNativeMCP,
  initializeNativeMCP,
} from '@/lib/ai/mcpNative';
import { useMCPStore } from '@/store/mcpStore';
import { useEffect, useRef, useState } from 'react';

/**
 * Hook to manage native AI SDK MCP integration lifecycle
 */
export function useNativeMCP() {
  const integrationRef = useRef<NativeMCPIntegration | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState({
    connectedServers: 0,
    totalTools: 0,
    toolsByServer: {} as Record<string, number>,
  });

  const connectedServers = useMCPStore((state) => state.getConnectedServers());

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!integrationRef.current) {
          integrationRef.current = await initializeNativeMCP();
        }
        setIsReady(true);
        updateStats();
      } catch (error) {
        console.error('Failed to initialize native MCP integration:', error);
        setIsReady(false);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      cleanupNativeMCP().catch((error) => {
        console.error('Failed to cleanup native MCP:', error);
      });
      integrationRef.current = null;
      setIsReady(false);
    };
  }, []);

  // Update stats when ready
  useEffect(() => {
    if (isReady && integrationRef.current) {
      updateStats();
    }
  }, [isReady]);

  const updateStats = () => {
    if (integrationRef.current) {
      const newStats = integrationRef.current.getStats();
      setStats(newStats);
    }
  };

  const getAllTools = () => {
    if (!integrationRef.current) {
      return {};
    }
    return integrationRef.current.getAllTools();
  };

  const getServerTools = (serverId: string) => {
    if (!integrationRef.current) {
      return {};
    }
    return integrationRef.current.getServerTools(serverId);
  };

  const refreshTools = async () => {
    if (!integrationRef.current) {
      return;
    }
    await integrationRef.current.refreshAllTools();
    updateStats();
  };

  return {
    isReady,
    stats,
    getAllTools,
    getServerTools,
    refreshTools,
    integration: integrationRef.current,
  };
}
