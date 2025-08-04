import type { Agent } from '@/lib/ai';
import type { CoreMessage } from 'ai';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiCache, computationCache } from '@/lib/cache';

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

  // Cached actions
  getCachedConversations: (agentId: string) => Conversation[];
  getCachedSession: (agentId: string) => AgentSession | undefined;
  invalidateCache: (pattern?: string) => void;

  // Getters
  getActiveSession: () => AgentSession | null;
  getSessionByAgent: (agentId: string) => AgentSession | undefined;
  getConversationsByAgent: (agentId: string) => Conversation[];

  // Utility actions
  clearActiveSession: () => void;
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
        
        // Cache the session
        const session = get().sessions[agentId];
        if (session) {
          apiCache.set(`session:${agentId}`, session, 10 * 60 * 1000); // 10 minutes TTL
        }
      },

      selectAgent: (agentId) => {
        set({ selectedAgentId: agentId });
      },

      updateSession: (agentId, updates) => {
        set((state) => ({
          sessions: {
            ...state.sessions,
            [agentId]: {
              ...(state.sessions[agentId] ?? {
                agentId,
                agent: null,
                conversation: null,
                isActive: false,
                isLoading: false,
                error: null,
              }),
              ...updates,
            },
          },
        }));
        
        // Update cache
        const session = get().sessions[agentId];
        if (session) {
          apiCache.set(`session:${agentId}`, session, 10 * 60 * 1000);
        }
      },

      removeSession: (agentId) => {
        set((state) => {
          const { [agentId]: removed, ...rest } = state.sessions;
          return { sessions: rest };
        });
        
        // Remove from cache
        apiCache.delete(`session:${agentId}`);
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

        // Cache the conversation
        apiCache.set(`conversation:${conversation.id}`, conversation, 30 * 60 * 1000); // 30 minutes TTL
        
        // Invalidate agent conversations cache
        apiCache.invalidate(`conversations:${agentId}`);

        return conversation;
      },

      updateConversation: (conversationId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, ...updates, updatedAt: new Date() } : conv
          ),
        }));
        
        // Update cache
        const conversation = get().conversations.find(c => c.id === conversationId);
        if (conversation) {
          apiCache.set(`conversation:${conversationId}`, conversation, 30 * 60 * 1000);
          apiCache.invalidate(`conversations:${conversation.agentId}`);
        }
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
        
        // Update cache
        const conversation = get().conversations.find(c => c.id === conversationId);
        if (conversation) {
          apiCache.set(`conversation:${conversationId}`, conversation, 30 * 60 * 1000);
          apiCache.invalidate(`conversations:${conversation.agentId}`);
        }
      },

      loadConversation: (conversationId) => {
        const conversation = get().conversations.find((c) => c.id === conversationId);
        if (conversation?.agentId) {
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
            
            // Update session cache
            const updatedSession = get().sessions[conversation.agentId];
            if (updatedSession) {
              apiCache.set(`session:${conversation.agentId}`, updatedSession, 10 * 60 * 1000);
            }
          }
        }
      },

      deleteConversation: (conversationId) => {
        const conversation = get().conversations.find(c => c.id === conversationId);
        
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== conversationId),
        }));
        
        // Remove from cache
        apiCache.delete(`conversation:${conversationId}`);
        if (conversation) {
          apiCache.invalidate(`conversations:${conversation.agentId}`);
        }
      },

      // Cached getters
      getCachedConversations: (agentId) => {
        const cacheKey = `conversations:${agentId}`;
        const cached = apiCache.get(cacheKey);
        
        if (cached) {
          return cached;
        }
        
        const conversations = get().conversations.filter((c) => c.agentId === agentId);
        apiCache.set(cacheKey, conversations, 5 * 60 * 1000); // 5 minutes TTL
        return conversations;
      },

      getCachedSession: (agentId) => {
        const cacheKey = `session:${agentId}`;
        const cached = apiCache.get(cacheKey);
        
        if (cached) {
          return cached;
        }
        
        const session = get().sessions[agentId];
        if (session) {
          apiCache.set(cacheKey, session, 10 * 60 * 1000); // 10 minutes TTL
        }
        return session;
      },

      invalidateCache: (pattern) => {
        apiCache.invalidate(pattern);
      },

      getActiveSession: () => {
        const { selectedAgentId, sessions } = get();
        return selectedAgentId ? (sessions[selectedAgentId] ?? null) : null;
      },

      getSessionByAgent: (agentId) => {
        return get().sessions[agentId];
      },

      getConversationsByAgent: (agentId) => {
        return get().conversations.filter((c) => c.agentId === agentId);
      },

      clearActiveSession: () => {
        const { selectedAgentId } = get();
        if (selectedAgentId) {
          set((state) => {
            const currentSession = state.sessions[selectedAgentId];
            if (!currentSession) return state;

            return {
              ...state,
              sessions: {
                ...state.sessions,
                [selectedAgentId]: {
                  ...currentSession,
                  conversation: null,
                  isActive: false,
                },
              },
            };
          });
          
          // Update cache
          const session = get().sessions[selectedAgentId];
          if (session) {
            apiCache.set(`session:${selectedAgentId}`, session, 10 * 60 * 1000);
          }
        }
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

// Export the store hook
