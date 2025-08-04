/**
 * Wallet OAuth Callback Handler
 *
 * Handles OAuth callbacks specifically for wallet authentication
 * Separate from AI provider OAuth handling
 */

import { listen } from '@tauri-apps/api/event';
import React from 'react';
import { useWalletStore } from './store';

export interface WalletOAuthCallbackData {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * Initialize wallet OAuth callback listener
 */
export async function initializeWalletOAuthListener() {
  try {
    console.log('Initializing wallet OAuth callback listener...');

    // Listen for OAuth callbacks from the Tauri plugin
    const unlisten = await listen<WalletOAuthCallbackData>('oauth://callback', async (event) => {
      console.log('Wallet OAuth callback received:', event.payload);

      const { code, state, error, error_description } = event.payload;

      if (error) {
        console.error('Wallet OAuth error:', error, error_description);

        // Enhanced error handling with user-friendly messages
        let userMessage = 'Wallet authentication failed';

        switch (error) {
          case 'access_denied':
            userMessage =
              'Access was denied. Please grant the required permissions to create a wallet.';
            break;
          case 'invalid_request':
            userMessage = 'Invalid wallet authentication request. Please try again.';
            break;
          case 'server_error':
            userMessage = 'Authentication server error. Please try again later.';
            break;
          case 'temporarily_unavailable':
            userMessage =
              'Authentication service is temporarily unavailable. Please try again later.';
            break;
          default:
            userMessage = error_description || `Wallet OAuth error: ${error}`;
        }

        // Emit error event for UI handling
        window.dispatchEvent(
          new CustomEvent('wallet-oauth-error', {
            detail: { error, description: error_description, userMessage },
          })
        );
        return;
      }

      if (!code || !state) {
        console.error('Invalid wallet OAuth callback: missing code or state');
        return;
      }

      try {
        // Complete the OAuth flow using the wallet store
        await useWalletStore.getState().completeOAuthFlow(code, state);

        // Notify the UI that wallet authentication is complete
        window.dispatchEvent(
          new CustomEvent('wallet-oauth-complete', {
            detail: {
              success: true,
            },
          })
        );
      } catch (error) {
        console.error('Wallet OAuth callback error:', error);

        // Notify the UI of the error
        window.dispatchEvent(
          new CustomEvent('wallet-oauth-complete', {
            detail: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          })
        );
      }
    });

    console.log('Wallet OAuth callback listener initialized successfully');
    return unlisten;
  } catch (error) {
    console.error('Failed to initialize wallet OAuth callback listener:', error);
    throw new Error(`Wallet OAuth listener initialization failed: ${error}`);
  }
}

/**
 * Hook to listen for wallet OAuth completion events
 */
export function useWalletOAuthListener(callback: (event: CustomEvent) => void) {
  React.useEffect(() => {
    const handler = (event: Event) => {
      callback(event as CustomEvent);
    };

    window.addEventListener('wallet-oauth-complete', handler);
    window.addEventListener('wallet-oauth-error', handler);

    return () => {
      window.removeEventListener('wallet-oauth-complete', handler);
      window.removeEventListener('wallet-oauth-error', handler);
    };
  }, [callback]);
}
