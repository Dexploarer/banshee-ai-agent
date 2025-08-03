/**
 * OAuth Callback Handler for Tauri
 *
 * Handles OAuth callbacks from the browser and completes the authentication flow
 */

import React from 'react';
import { getAuthManager } from './auth';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

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
  // Listen for OAuth callbacks from the Tauri plugin
  const unlisten = await listen<OAuthCallbackData>('oauth://callback', async (event) => {
    console.log('OAuth callback received:', event.payload);

    const { code, state, error, error_description } = event.payload;

    if (error) {
      console.error('OAuth error:', error, error_description);
      // TODO: Show error to user
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

  return unlisten;
}

/**
 * Start OAuth flow with Tauri plugin
 */
export async function startOAuthFlow(authUrl: string): Promise<void> {
  try {
    // The tauri-plugin-oauth will handle opening the browser and setting up the local server
    await invoke('plugin:oauth|start', {
      url: authUrl,
      port: 8901, // Default port for the OAuth plugin
    });
  } catch (error) {
    console.error('Failed to start OAuth flow:', error);
    throw error;
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
