/**
 * Phantom Wallet Provider Setup and Configuration
 *
 * Integrates Phantom's embedded wallet with Google OAuth authentication
 */

import type { PublicKey } from '@solana/web3.js';
import type React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import type { PhantomEmbeddedWalletConfig, WalletConnection, WalletErrorInfo } from './types';

// Note: These imports are for the new Phantom SDK (not the deprecated @phantom/wallet-sdk)
// The actual imports may need to be adjusted based on the final SDK structure
interface PhantomProvider {
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  signTransaction(transaction: any): Promise<any>;
  isConnected: boolean;
  publicKey: PublicKey | null;
}

interface PhantomEmbeddedWallet {
  createWallet(options: {
    socialToken: string;
    provider: 'google' | 'apple';
  }): Promise<PhantomProvider>;

  connectExistingWallet(): Promise<PhantomProvider>;

  isEmbeddedWalletAvailable(): boolean;
}

// Context for Phantom wallet functionality
interface PhantomContextValue {
  provider: PhantomProvider | null;
  embeddedWallet: PhantomEmbeddedWallet | null;
  connection: WalletConnection;
  error: WalletErrorInfo | null;
  initialized: boolean;

  // Actions
  initializeEmbedded: () => Promise<void>;
  createWalletWithGoogle: (googleToken: string) => Promise<void>;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  clearError: () => void;
}

const PhantomContext = createContext<PhantomContextValue | null>(null);

export const usePhantom = () => {
  const context = useContext(PhantomContext);
  if (!context) {
    throw new Error('usePhantom must be used within a PhantomProvider');
  }
  return context;
};

interface PhantomProviderProps {
  children: React.ReactNode;
  config: PhantomEmbeddedWalletConfig;
}

export function PhantomProvider({ children, config }: PhantomProviderProps) {
  const [provider, setProvider] = useState<PhantomProvider | null>(null);
  const [embeddedWallet, setEmbeddedWallet] = useState<PhantomEmbeddedWallet | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<WalletErrorInfo | null>(null);
  const [connection, setConnection] = useState<WalletConnection>({
    publicKey: null,
    connected: false,
    connecting: false,
    disconnecting: false,
  });

  // Initialize Phantom embedded wallet on mount
  useEffect(() => {
    initializeEmbedded();
  }, []);

  const initializeEmbedded = async () => {
    try {
      setError(null);

      // Note: This is a placeholder implementation
      // The actual Phantom SDK initialization will depend on their final API structure
      console.log('Initializing Phantom embedded wallet with config:', config);

      // Check if Phantom embedded wallet is available
      // This would be replaced with actual Phantom SDK calls
      const isAvailable =
        typeof window !== 'undefined' &&
        // @ts-ignore - Phantom SDK may add global objects
        window.phantom?.embedded?.isAvailable();

      if (!isAvailable) {
        throw new Error('Phantom embedded wallet is not available');
      }

      // Initialize the embedded wallet SDK
      // This is a placeholder - actual implementation would use Phantom SDK
      const embeddedWalletInstance = {
        createWallet: async (options: { socialToken: string; provider: 'google' | 'apple' }) => {
          console.log('Creating embedded wallet with options:', options);

          // This would call the actual Phantom SDK to create an embedded wallet
          // For now, we'll simulate the response
          return {
            connect: async () => {
              // Simulate wallet connection
              const mockPublicKey = {} as PublicKey; // Would be actual PublicKey from Solana
              setConnection((prev) => ({
                ...prev,
                publicKey: mockPublicKey,
                connected: true,
                connecting: false,
              }));
              return { publicKey: mockPublicKey };
            },
            disconnect: async () => {
              setConnection((prev) => ({
                ...prev,
                publicKey: null,
                connected: false,
                disconnecting: false,
              }));
            },
            signMessage: async (_message: Uint8Array) => {
              // Would call actual Phantom signing
              return { signature: new Uint8Array() };
            },
            signTransaction: async (transaction: any) => {
              // Would call actual Phantom transaction signing
              return transaction;
            },
            isConnected: true,
            publicKey: {} as PublicKey,
          } as PhantomProvider;
        },

        connectExistingWallet: async () => {
          // Would connect to existing Phantom wallet
          return {} as PhantomProvider;
        },

        isEmbeddedWalletAvailable: () => true,
      } as PhantomEmbeddedWallet;

      setEmbeddedWallet(embeddedWalletInstance);
      setInitialized(true);

      console.log('Phantom embedded wallet initialized successfully');
    } catch (err) {
      const errorInfo: WalletErrorInfo = {
        type: 'EMBEDDED_WALLET_INIT_FAILED' as any,
        message: err instanceof Error ? err.message : 'Failed to initialize embedded wallet',
        details: err,
      };
      setError(errorInfo);
      console.error('Failed to initialize Phantom embedded wallet:', err);
    }
  };

  const createWalletWithGoogle = async (googleToken: string) => {
    if (!embeddedWallet) {
      throw new Error('Embedded wallet not initialized');
    }

    try {
      setError(null);
      setConnection((prev) => ({ ...prev, connecting: true }));

      console.log('Creating wallet with Google token...');

      const walletProvider = await embeddedWallet.createWallet({
        socialToken: googleToken,
        provider: 'google',
      });

      setProvider(walletProvider);

      // Connect the newly created wallet
      await walletProvider.connect();

      console.log('Wallet created and connected successfully');
    } catch (err) {
      const errorInfo: WalletErrorInfo = {
        type: 'WALLET_CONNECTION_FAILED' as any,
        message: err instanceof Error ? err.message : 'Failed to create wallet with Google',
        details: err,
      };
      setError(errorInfo);
      setConnection((prev) => ({ ...prev, connecting: false }));
      throw err;
    }
  };

  const connectWallet = async () => {
    if (!provider) {
      throw new Error('No wallet provider available');
    }

    try {
      setError(null);
      setConnection((prev) => ({ ...prev, connecting: true }));

      const result = await provider.connect();

      setConnection((prev) => ({
        ...prev,
        publicKey: result.publicKey,
        connected: true,
        connecting: false,
      }));

      console.log('Wallet connected:', result.publicKey.toString());
    } catch (err) {
      const errorInfo: WalletErrorInfo = {
        type: 'WALLET_CONNECTION_FAILED' as any,
        message: err instanceof Error ? err.message : 'Failed to connect wallet',
        details: err,
      };
      setError(errorInfo);
      setConnection((prev) => ({ ...prev, connecting: false }));
      throw err;
    }
  };

  const disconnectWallet = async () => {
    if (!provider) {
      return;
    }

    try {
      setError(null);
      setConnection((prev) => ({ ...prev, disconnecting: true }));

      await provider.disconnect();

      setConnection({
        publicKey: null,
        connected: false,
        connecting: false,
        disconnecting: false,
      });

      setProvider(null);

      console.log('Wallet disconnected');
    } catch (err) {
      const errorInfo: WalletErrorInfo = {
        type: 'WALLET_CONNECTION_FAILED' as any,
        message: err instanceof Error ? err.message : 'Failed to disconnect wallet',
        details: err,
      };
      setError(errorInfo);
      setConnection((prev) => ({ ...prev, disconnecting: false }));
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const contextValue: PhantomContextValue = {
    provider,
    embeddedWallet,
    connection,
    error,
    initialized,
    initializeEmbedded,
    createWalletWithGoogle,
    connectWallet,
    disconnectWallet,
    clearError,
  };

  return <PhantomContext.Provider value={contextValue}>{children}</PhantomContext.Provider>;
}
