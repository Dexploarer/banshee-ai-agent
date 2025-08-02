import type { Agent, Conversation, Message } from '@/lib/ai/types';
import { toast } from '@/store/uiStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface AgentSessionData {
  agentId: string;
  agent: Agent;
  conversationId?: string;
  conversation?: Conversation;
}

async function fetchActiveSessions(): Promise<AgentSessionData[]> {
  try {
    return await invoke('get_active_sessions_command');
  } catch (error) {
    console.error('Failed to fetch active sessions:', error);
    throw error;
  }
}

async function createAgentSession(agentId: string): Promise<AgentSessionData> {
  return await invoke('create_agent_session_command', { agentId });
}

async function closeAgentSession(agentId: string): Promise<void> {
  await invoke('close_agent_session_command', { agentId });
}

async function fetchConversationHistory(conversationId: string): Promise<Message[]> {
  return await invoke('get_conversation_history_command', { conversationId });
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['activeSessions'],
    queryFn: fetchActiveSessions,
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

export function useCreateAgentSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgentSession,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      queryClient.setQueryData(['session', data.agentId], data);
      toast.success('Session created', `Started session with ${data.agent.name}`);
    },
    onError: (error) => {
      console.error('Failed to create agent session:', error);
      toast.error('Session creation failed', error.message);
    },
  });
}

export function useCloseAgentSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeAgentSession,
    onSuccess: (_, agentId) => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      queryClient.removeQueries({ queryKey: ['session', agentId] });
      toast.success('Session closed', 'Agent session has been terminated');
    },
    onError: (error) => {
      console.error('Failed to close agent session:', error);
      toast.error('Failed to close session', error.message);
    },
  });
}

export function useConversationHistory(conversationId?: string) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () =>
      conversationId ? fetchConversationHistory(conversationId) : Promise.resolve([]),
    enabled: !!conversationId,
  });
}
