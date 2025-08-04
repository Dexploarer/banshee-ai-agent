/**
 * Wallet State Management with Zustand
 *
 * Centralized state management for wallet authentication and connection
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { walletAuthService } from './auth-service';
import type { WalletAuth, WalletConnection, WalletStore } from './types';

const initialWalletConnection: WalletConnection = {
  publicKey: null,
  connected: false,
  connecting: false,
  disconnecting: false,
};

const initialWalletAuth: WalletAuth = {
  user: null,
  accessToken: null,
  refreshToken: null,
  idToken: null,
  expiresAt: null,
};

export const useWalletStore = create<WalletStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        auth: initialWalletAuth,
        connection: initialWalletConnection,
        embeddedWallet: {
          initialized: false,
          loading: false,
          error: null,
        },
        oauthFlow: {
          inProgress: false,
          state: null,
          codeVerifier: null,
          error: null,
        },

        // OAuth authentication actions
        startGoogleAuth: async () => {
          try {
            set((state) => ({
              oauthFlow: {
                ...state.oauthFlow,
                inProgress: true,
                error: null,
              },
            }));

            await walletAuthService.startGoogleOAuthFlow();

            const flowStatus = walletAuthService.getActiveFlowStatus();

            set((state) => ({
              oauthFlow: {
                ...state.oauthFlow,
                state: flowStatus.state || null,
              },
            }));
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'OAuth flow failed';

            set((state) => ({
              oauthFlow: {
                ...state.oauthFlow,
                inProgress: false,
                error: errorMessage,
              },
            }));

            throw error;
          }
        },

        completeOAuthFlow: async (code: string, state: string) => {
          try {
            console.log('Completing OAuth flow in store...');

            const oauthResult = await walletAuthService.completeOAuthFlow(code, state);
            const walletAuth = walletAuthService.createWalletAuth(oauthResult);

            set((state) => ({
              auth: walletAuth,
              oauthFlow: {
                ...state.oauthFlow,
                inProgress: false,
                state: null,
                codeVerifier: null,
                error: null,
              },
            }));

            console.log('OAuth flow completed, user authenticated:', walletAuth.user?.email);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'OAuth completion failed';

            set((state) => ({
              oauthFlow: {
                ...state.oauthFlow,
                inProgress: false,
                error: errorMessage,
              },
            }));

            throw error;
          }
        },

        // Wallet connection actions
        connectWallet: async () => {
          const { auth } = get();

          if (!auth.user || !auth.accessToken) {
            throw new Error('User must be authenticated before connecting wallet');
          }

          try {
            set((state) => ({
              connection: {
                ...state.connection,
                connecting: true,
              },
            }));

            // This would integrate with the Phantom provider context
            // For now, we'll simulate successful connection
            console.log('Connecting wallet for user:', auth.user.email);

            // In real implementation, this would:
            // 1. Use the auth.accessToken to create embedded wallet
            // 2. Connect to the wallet
            // 3. Get the public key

            // Simulated connection
            setTimeout(() => {
              set((_state) => ({
                connection: {
                  publicKey: null, // Would be actual PublicKey from Solana
                  connected: true,
                  connecting: false,
                  disconnecting: false,
                },
              }));
            }, 1000);
          } catch (error) {
            set((state) => ({
              connection: {
                ...state.connection,
                connecting: false,
              },
            }));

            throw error;
          }
        },

        disconnectWallet: async () => {
          try {
            set((state) => ({
              connection: {
                ...state.connection,
                disconnecting: true,
              },
            }));

            // Disconnect wallet logic would go here
            console.log('Disconnecting wallet...');

            set((_state) => ({
              connection: initialWalletConnection,
            }));
          } catch (error) {
            set((state) => ({
              connection: {
                ...state.connection,
                disconnecting: false,
              },
            }));

            throw error;
          }
        },

        // Phantom embedded wallet actions
        initializeEmbeddedWallet: async () => {
          try {
            set((state) => ({
              embeddedWallet: {
                ...state.embeddedWallet,
                loading: true,
                error: null,
              },
            }));

            // Initialize embedded wallet
            console.log('Initializing Phantom embedded wallet...');

            // Simulate initialization
            await new Promise((resolve) => setTimeout(resolve, 1000));

            set((state) => ({
              embeddedWallet: {
                ...state.embeddedWallet,
                initialized: true,
                loading: false,
              },
            }));
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Embedded wallet initialization failed';

            set((state) => ({
              embeddedWallet: {
                ...state.embeddedWallet,
                loading: false,
                error: errorMessage,
              },
            }));

            throw error;
          }
        },

        createEmbeddedWallet: async (_googleToken: string) => {
          console.log('Creating embedded wallet with Google token...');

          // This would use the Phantom SDK to create an embedded wallet
          // using the Google OAuth token

          // For now, simulate wallet creation
          await new Promise((resolve) => setTimeout(resolve, 2000));

          console.log('Embedded wallet created successfully');
        },

        // State management actions
        clearAuth: () => {
          set(() => ({
            auth: initialWalletAuth,
            oauthFlow: {
              inProgress: false,
              state: null,
              codeVerifier: null,
              error: null,
            },
          }));

          // Clear any active OAuth flows
          walletAuthService.clearActiveFlow();
        },

        clearError: () => {
          set((state) => ({
            embeddedWallet: {
              ...state.embeddedWallet,
              error: null,
            },
            oauthFlow: {
              ...state.oauthFlow,
              error: null,
            },
          }));
        },

        setLoading: (loading: boolean) => {
          set((state) => ({
            embeddedWallet: {
              ...state.embeddedWallet,
              loading,
            },
          }));
        },
      }),
      {
        name: 'wallet-store',
        partialize: (state) => ({
          // Only persist auth data, not connection state
          auth: state.auth,
        }),
        version: 1,
      }
    )
  )
);

// Selector hooks for specific parts of the state
export const useWalletAuth = () => useWalletStore((state) => state.auth);
export const useWalletConnection = () => useWalletStore((state) => state.connection);
export const useEmbeddedWallet = () => useWalletStore((state) => state.embeddedWallet);
export const useOAuthFlow = () => useWalletStore((state) => state.oauthFlow);

// Action hooks
export const useWalletActions = () =>
  useWalletStore((state) => ({
    startGoogleAuth: state.startGoogleAuth,
    completeOAuthFlow: state.completeOAuthFlow,
    connectWallet: state.connectWallet,
    disconnectWallet: state.disconnectWallet,
    initializeEmbeddedWallet: state.initializeEmbeddedWallet,
    createEmbeddedWallet: state.createEmbeddedWallet,
    clearAuth: state.clearAuth,
    clearError: state.clearError,
    setLoading: state.setLoading,
  }));

// Initialize embedded wallet on store creation
useWalletStore.getState().initializeEmbeddedWallet();
