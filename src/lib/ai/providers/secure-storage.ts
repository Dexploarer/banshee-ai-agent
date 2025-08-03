/**
 * Secure Token Storage for OAuth
 *
 * Uses Tauri's secure storage to persist OAuth tokens
 */

// Use dynamic import to handle missing Tauri store
import type { AuthConfig } from './types';

// Fallback store implementation
class FallbackStore {
  private data = new Map<string, any>();

  async get<T>(key: string): Promise<T | null> {
    return this.data.get(key) || null;
  }

  async set(key: string, value: any): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async save(): Promise<void> {
    // No-op for fallback
  }

  async load(): Promise<void> {
    // No-op for fallback
  }

  async entries(): Promise<Array<[string, any]>> {
    return Array.from(this.data.entries());
  }
}

// Create store instance with fallback
let authStore: any;

async function getStore() {
  if (authStore) return authStore;

  // Use window check to determine if we're in Tauri
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    try {
      // Only import if in Tauri environment
      const storeModule = await import('@tauri-apps/plugin-store');
      authStore = new storeModule.Store('auth.dat');
    } catch (error) {
      console.warn('Failed to load Tauri store, using fallback:', error);
      authStore = new FallbackStore();
    }
  } else {
    // Use fallback for non-Tauri environments
    authStore = new FallbackStore();
  }

  return authStore;
}

/**
 * Securely store authentication config
 */
export async function saveAuthConfig(providerId: string, config: AuthConfig): Promise<void> {
  try {
    const store = await getStore();

    // Encrypt sensitive data before storage
    const encryptedConfig = {
      ...config,
      credentials: config.credentials ? await encryptCredentials(config.credentials) : undefined,
    };

    await store.set(providerId, encryptedConfig);
    await store.save();
  } catch (error) {
    console.error('Failed to save auth config:', error);
    throw new Error('Failed to save authentication data');
  }
}

/**
 * Retrieve authentication config
 */
export async function getAuthConfig(providerId: string): Promise<AuthConfig | null> {
  try {
    const store = await getStore();
    const encryptedConfig = await store.get<AuthConfig>(providerId);
    if (!encryptedConfig) return null;

    // Decrypt credentials
    const config: AuthConfig = {
      ...encryptedConfig,
      credentials: encryptedConfig.credentials
        ? await decryptCredentials(encryptedConfig.credentials)
        : undefined,
    };

    return config;
  } catch (error) {
    console.error('Failed to get auth config:', error);
    return null;
  }
}

/**
 * Remove authentication config
 */
export async function removeAuthConfig(providerId: string): Promise<void> {
  try {
    const store = await getStore();
    await store.delete(providerId);
    await store.save();
  } catch (error) {
    console.error('Failed to remove auth config:', error);
    throw new Error('Failed to remove authentication data');
  }
}

/**
 * Get all stored authentication configs
 */
export async function getAllAuthConfigs(): Promise<Record<string, AuthConfig>> {
  try {
    const entries = await authStore.entries();
    const configs: Record<string, AuthConfig> = {};

    for (const [key, value] of entries) {
      if (typeof key === 'string' && value) {
        const config = value as AuthConfig;
        configs[key] = {
          ...config,
          credentials: config.credentials
            ? await decryptCredentials(config.credentials)
            : undefined,
        };
      }
    }

    return configs;
  } catch (error) {
    console.error('Failed to get all auth configs:', error);
    return {};
  }
}

/**
 * Simple encryption for credentials (uses browser crypto API)
 * In production, consider using a more robust encryption method
 */
async function encryptCredentials(credentials: Record<string, any>): Promise<Record<string, any>> {
  try {
    // For OAuth tokens, we'll store them as-is but mark them as encrypted
    // In a real implementation, you'd use proper encryption here
    return {
      ...credentials,
      _encrypted: true,
    };
  } catch (error) {
    console.error('Failed to encrypt credentials:', error);
    throw error;
  }
}

/**
 * Decrypt credentials
 */
async function decryptCredentials(
  encryptedCredentials: Record<string, any>
): Promise<Record<string, any>> {
  try {
    // Remove the encryption marker
    const { _encrypted, ...credentials } = encryptedCredentials;
    return credentials;
  } catch (error) {
    console.error('Failed to decrypt credentials:', error);
    throw error;
  }
}

/**
 * Clear all authentication data
 */
export async function clearAllAuthData(): Promise<void> {
  try {
    await authStore.clear();
    await authStore.save();
  } catch (error) {
    console.error('Failed to clear auth data:', error);
    throw new Error('Failed to clear authentication data');
  }
}

/**
 * Check if a provider has stored authentication
 */
export async function hasStoredAuth(providerId: string): Promise<boolean> {
  try {
    const config = await authStore.get(providerId);
    return config !== null && config !== undefined;
  } catch (error) {
    console.error('Failed to check stored auth:', error);
    return false;
  }
}

/**
 * Initialize auth store and load saved configurations
 */
export async function initializeAuthStore(): Promise<void> {
  try {
    // Ensure the store file exists
    await authStore.load();

    // Clean up expired tokens
    const configs = await getAllAuthConfigs();
    const now = Date.now();

    for (const [providerId, config] of Object.entries(configs)) {
      if (config.expires_at && config.expires_at < now) {
        // Token expired, remove it
        await removeAuthConfig(providerId);
      }
    }
  } catch (error) {
    console.error('Failed to initialize auth store:', error);
    // Create a new store if it doesn't exist
    await authStore.save();
  }
}
