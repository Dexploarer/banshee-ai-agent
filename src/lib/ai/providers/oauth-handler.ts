/**
 * OAuth Callback Handler for Tauri
 *
 * Handles OAuth callbacks from the browser and completes the authentication flow
 */

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import React from 'react';
import { getAuthManager } from './auth';

export interface OAuthCallbackData {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

/**
 * Initialize OAuth callback listener
 */
export async function initializeOAuthListener() {
  try {
    console.log('Initializing OAuth callback listener...');

    // Listen for OAuth callbacks from the Tauri plugin
    const unlisten = await listen<OAuthCallbackData>('oauth://callback', async (event) => {
      console.log('OAuth callback received:', event.payload);

      const { code, state, error, error_description } = event.payload;

      if (error) {
        console.error('OAuth error:', error, error_description);

        // Enhanced error handling with user-friendly messages
        let userMessage = 'OAuth authentication failed';

        switch (error) {
          case 'access_denied':
            userMessage = 'Access was denied. Please grant the required permissions to continue.';
            break;
          case 'invalid_request':
            userMessage = 'Invalid OAuth request. Please try again.';
            break;
          case 'server_error':
            userMessage = 'Authentication server error. Please try again later.';
            break;
          case 'temporarily_unavailable':
            userMessage =
              'Authentication service is temporarily unavailable. Please try again later.';
            break;
          default:
            userMessage = error_description || `OAuth error: ${error}`;
        }

        // Emit error event for UI handling
        window.dispatchEvent(
          new CustomEvent('oauth-error', {
            detail: { error, description: error_description, userMessage },
          })
        );
        return;
      }

      if (!code || !state) {
        console.error('Invalid OAuth callback: missing code or state');
        return;
      }

      try {
        // Find the auth flow by state
        const authManager = getAuthManager();
        const flows = authManager.getActiveFlows();
        const flow = flows.find((f) => f.state === state);

        if (!flow) {
          console.error('No active OAuth flow found for state:', state);
          return;
        }

        // Complete the OAuth flow
        const success = await authManager.completeOAuthFlow(flow.id, code);

        if (success) {
          console.log('OAuth authentication successful for provider:', flow.provider_id);

          // Notify the UI that authentication is complete
          window.dispatchEvent(
            new CustomEvent('oauth-complete', {
              detail: {
                providerId: flow.provider_id,
                success: true,
              },
            })
          );
        } else {
          throw new Error('OAuth token exchange failed');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);

        // Notify the UI of the error
        window.dispatchEvent(
          new CustomEvent('oauth-complete', {
            detail: {
              providerId: '',
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          })
        );
      }
    });

    console.log('OAuth callback listener initialized successfully');
    return unlisten;
  } catch (error) {
    console.error('Failed to initialize OAuth callback listener:', error);
    throw new Error(`OAuth listener initialization failed: ${error}`);
  }
}

/**
 * Start OAuth flow with Tauri plugin
 */
export async function startOAuthFlow(authUrl: string): Promise<void> {
  try {
    console.log('Starting OAuth flow with URL:', authUrl);

    // The tauri-plugin-oauth will handle opening the browser and setting up the local server
    await invoke('plugin:oauth|start', {
      url: authUrl,
      port: 8901, // Default port for the OAuth plugin
    });

    console.log('OAuth flow started successfully');
  } catch (error) {
    console.error('Failed to start OAuth flow:', error);
    console.error('Auth URL was:', authUrl);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('port')) {
        throw new Error('OAuth port is already in use. Please try again in a moment.');
      }
      if (error.message.includes('plugin')) {
        throw new Error(
          'OAuth plugin is not properly initialized. Please restart the application.'
        );
      }
    }

    throw new Error(`OAuth flow failed to start: ${error}`);
  }
}

/**
 * Hook to listen for OAuth completion events
 */
export function useOAuthListener(callback: (event: CustomEvent) => void) {
  React.useEffect(() => {
    const handler = (event: Event) => {
      callback(event as CustomEvent);
    };

    window.addEventListener('oauth-complete', handler);

    return () => {
      window.removeEventListener('oauth-complete', handler);
    };
  }, [callback]);
}

/**
 * Check if OAuth is in progress
 */
export function isOAuthInProgress(): boolean {
  const authManager = getAuthManager();
  const flows = authManager.getActiveFlows();
  return flows.some((f) => f.status === 'pending' || f.status === 'in_progress');
}
