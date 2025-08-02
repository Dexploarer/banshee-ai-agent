import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeAgents: number;
  activeMCPConnections: number;
  totalMessages: number;
  uptime: number;
}

async function fetchSystemStats(): Promise<SystemStats> {
  try {
    return await invoke('get_system_stats_command');
  } catch (error) {
    console.error('Failed to fetch system stats:', error);
    // Return default values on error
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      activeAgents: 0,
      activeMCPConnections: 0,
      totalMessages: 0,
      uptime: 0,
    };
  }
}

export function useSystemStats() {
  return useQuery({
    queryKey: ['systemStats'],
    queryFn: fetchSystemStats,
    refetchInterval: 2000, // Update every 2 seconds
    staleTime: 1000, // Consider data stale after 1 second
  });
}
