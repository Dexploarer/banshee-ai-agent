import type { Agent } from '@/lib/ai';
import type { CoreMessage } from 'ai';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Conversation {
  id: string;
  agentId: string;
  messages: CoreMessage[];
  createdAt: Date;
  updatedAt: Date;
  title?: string;
}

export interface AgentSession {
  agentId: string;
  agent: Agent | null;
  conversation: Conversation | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AgentState {
  // Active agents and their sessions
  sessions: Record<string, AgentSession>;

  // Conversation history
  conversations: Conversation[];

  // Currently selected agent
  selectedAgentId: string | null;

  // Actions
  createSession: (agentId: string) => void;
  selectAgent: (agentId: string | null) => void;
  updateSession: (agentId: string, updates: Partial<AgentSession>) => void;
  removeSession: (agentId: string) => void;

  // Conversation actions
  createConversation: (agentId: string) => Conversation;
  updateConversation: (conversationId: string, updates: Partial<Conversation>) => void;
  addMessage: (conversationId: string, message: CoreMessage) => void;
  loadConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;

  // Getters
  getActiveSession: () => AgentSession | null;
  getSessionByAgent: (agentId: string) => AgentSession | undefined;
  getConversationsByAgent: (agentId: string) => Conversation[];
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      sessions: {},
      conversations: [],
      selectedAgentId: null,

      createSession: (agentId) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [agentId]: {
              agentId,
              agent: null,
              conversation: null,
              isActive: false,
              isLoading: false,
              error: null,
            },
          },
        }));
      },

      selectAgent: (agentId) => {
        set({ selectedAgentId: agentId });
      },

      updateSession: (agentId, updates) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [agentId]: {
              ...state.sessions[agentId],
              ...updates,
            },
          },
        }));
      },

      removeSession: (agentId) => {
        set((state) => {
          const { [agentId]: removed, ...rest } = state.sessions;
          return { sessions: rest };
        });
      },

      createConversation: (agentId) => {
        const conversation: Conversation = {
          id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          agentId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          conversations: [...state.conversations, conversation],
        }));

        return conversation;
      },

      updateConversation: (conversationId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, ...updates, updatedAt: new Date() } : conv
          ),
        }));
      },

      addMessage: (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  updatedAt: new Date(),
                }
              : conv
          ),
        }));
      },

      loadConversation: (conversationId) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation && conversation.agentId) {
          const session = get().sessions[conversation.agentId];
          if (session) {
            set((state) => ({
              sessions: {
                ...state.sessions,
                [conversation.agentId]: {
                  ...session,
                  conversation,
                },
              },
              selectedAgentId: conversation.agentId,
            }));
          }
        }
      },

      deleteConversation: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== conversationId),
        }));
      },

      getActiveSession: () => {
        const { selectedAgentId, sessions } = get();
        return selectedAgentId ? sessions[selectedAgentId] : null;
      },

      getSessionByAgent: (agentId) => {
        return get().sessions[agentId];
      },

      getConversationsByAgent: (agentId) => {
        return get().conversations.filter((c) => c.agentId === agentId);
      },
    }),
    {
      name: 'banshee-agents',
      partialize: (state) => ({
        conversations: state.conversations,
      }),
    }
  )
);

export { useAgentStore };
