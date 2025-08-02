import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface APIKey {
  provider: string;
  key: string;
  addedAt: Date;
}

export interface Settings {
  // General settings
  appName: string;
  language: string;
  autoStart: boolean;
  minimizeToTray: boolean;

  // AI settings
  defaultProvider: string;
  defaultModel?: string;
  temperature: number;
  maxTokens: number;
  streamResponses: boolean;

  // Security settings
  apiKeys: APIKey[];
  encryptStorage: boolean;
  requireAuth: boolean;

  // UI settings
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showTokenCount: boolean;
  enableAnimations: boolean;

  // Keyboard shortcuts
  shortcuts: {
    newChat: string;
    toggleTheme: string;
    search: string;
    settings: string;
  };
}

interface SettingsState extends Settings {
  // Actions
  updateSettings: (settings: Partial<Settings>) => void;
  addApiKey: (provider: string, key: string) => Promise<void>;
  removeApiKey: (provider: string) => Promise<void>;
  getApiKey: (provider: string) => APIKey | undefined;
  loadApiKeys: () => Promise<void>;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  appName: 'Banshee',
  language: 'en',
  autoStart: false,
  minimizeToTray: true,

  defaultProvider: 'openai',
  defaultModel: undefined,
  temperature: 0.7,
  maxTokens: 2048,
  streamResponses: true,

  apiKeys: [],
  encryptStorage: true,
  requireAuth: false,

  fontSize: 'medium',
  compactMode: false,
  showTokenCount: true,
  enableAnimations: true,

  shortcuts: {
    newChat: 'Cmd+N',
    toggleTheme: 'Cmd+Shift+T',
    search: 'Cmd+K',
    settings: 'Cmd+,',
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      updateSettings: (settings) => {
        set((state) => ({ ...state, ...settings }));
      },

      addApiKey: async (provider, key) => {
        try {
          // Store in secure backend storage
          await invoke('store_api_key_command', { provider, apiKey: key });

          // Update local state
          set((state) => ({
            apiKeys: [
              ...state.apiKeys.filter((k) => k.provider !== provider),
              { provider, key, addedAt: new Date() },
            ],
          }));
        } catch (error) {
          console.error('Failed to store API key:', error);
          throw error;
        }
      },

      removeApiKey: async (provider) => {
        try {
          // Remove from backend storage
          await invoke('remove_api_key_command', { provider });

          // Update local state
          set((state) => ({
            apiKeys: state.apiKeys.filter((k) => k.provider !== provider),
          }));
        } catch (error) {
          console.error('Failed to remove API key:', error);
          throw error;
        }
      },

      getApiKey: (provider) => {
        return get().apiKeys.find((k) => k.provider === provider);
      },

      loadApiKeys: async () => {
        try {
          // Load available providers from backend
          const providers = await invoke<string[]>('list_providers_command');

          // For each provider, check if we have a key
          const apiKeys: APIKey[] = [];
          for (const provider of providers) {
            try {
              const key = await invoke<string>('get_api_key_command', { provider });
              if (key) {
                apiKeys.push({ provider, key, addedAt: new Date() });
              }
            } catch {
              // Key not found for this provider
            }
          }

          set({ apiKeys });
        } catch (error) {
          console.error('Failed to load API keys:', error);
        }
      },

      resetSettings: () => {
        set(defaultSettings);
      },
    }),
    {
      name: 'banshee-settings',
      partialize: (state) => {
        const { apiKeys, ...rest } = state;
        return rest;
      },
    }
  )
);

// Load API keys on app start
if (typeof window !== 'undefined') {
  useSettingsStore.getState().loadApiKeys();
}
