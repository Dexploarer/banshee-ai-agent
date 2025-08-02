import { toast } from '@/store/uiStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface ApiKey {
  provider: string;
  apiKey: string;
  createdAt: Date;
  lastUsed?: Date;
}

async function fetchApiKeys(): Promise<ApiKey[]> {
  try {
    return await invoke('get_api_keys_command');
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    throw error;
  }
}

async function storeApiKey(data: { provider: string; apiKey: string }): Promise<void> {
  await invoke('store_api_key_command', data);
}

async function deleteApiKey(provider: string): Promise<void> {
  await invoke('delete_api_key_command', { provider });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: fetchApiKeys,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useStoreApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API key stored', 'Your API key has been securely saved');
    },
    onError: (error) => {
      console.error('Failed to store API key:', error);
      toast.error('Failed to store API key', error.message);
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API key deleted', 'The API key has been removed');
    },
    onError: (error) => {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key', error.message);
    },
  });
}
