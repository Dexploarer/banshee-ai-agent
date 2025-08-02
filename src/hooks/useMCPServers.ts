import type { MCPServer } from '@/lib/mcp/types';
import { toast } from '@/store/uiStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

async function fetchMCPServers(): Promise<MCPServer[]> {
  try {
    return await invoke('get_mcp_servers_command');
  } catch (error) {
    console.error('Failed to fetch MCP servers:', error);
    throw error;
  }
}

async function connectMCPServer(serverId: string): Promise<void> {
  await invoke('connect_mcp_server_command', { serverId });
}

async function disconnectMCPServer(serverId: string): Promise<void> {
  await invoke('disconnect_mcp_server_command', { serverId });
}

async function testMCPConnection(serverId: string): Promise<boolean> {
  return await invoke('test_mcp_connection_command', { serverId });
}

export function useMCPServers() {
  return useQuery({
    queryKey: ['mcpServers'],
    queryFn: fetchMCPServers,
    refetchInterval: 5000, // Poll every 5 seconds for status updates
  });
}

export function useConnectMCPServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: connectMCPServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      toast.success('Connected', 'MCP server connected successfully');
    },
    onError: (error) => {
      console.error('Failed to connect MCP server:', error);
      toast.error('Connection failed', error.message);
    },
  });
}

export function useDisconnectMCPServer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: disconnectMCPServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      toast.success('Disconnected', 'MCP server disconnected');
    },
    onError: (error) => {
      console.error('Failed to disconnect MCP server:', error);
      toast.error('Disconnection failed', error.message);
    },
  });
}

export function useTestMCPConnection() {
  return useMutation({
    mutationFn: testMCPConnection,
    onSuccess: (isConnected) => {
      if (isConnected) {
        toast.success('Connection test passed', 'MCP server is reachable');
      } else {
        toast.warning('Connection test failed', 'MCP server is not responding');
      }
    },
    onError: (error) => {
      console.error('Failed to test MCP connection:', error);
      toast.error('Test failed', error.message);
    },
  });
}
