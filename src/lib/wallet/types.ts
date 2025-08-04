/**
 * Wallet integration types and interfaces
 */

import type { PublicKey } from '@solana/web3.js';

export interface WalletUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
}

export interface WalletConnection {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
}

export interface WalletAuth {
  user: WalletUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  expiresAt: number | null;
}

export interface WalletState {
  // Authentication state
  auth: WalletAuth;

  // Connection state
  connection: WalletConnection;

  // Phantom embedded wallet state
  embeddedWallet: {
    initialized: boolean;
    loading: boolean;
    error: string | null;
  };

  // OAuth flow state
  oauthFlow: {
    inProgress: boolean;
    state: string | null;
    codeVerifier: string | null;
    error: string | null;
  };
}

export interface WalletActions {
  // OAuth authentication
  startGoogleAuth: () => Promise<void>;
  completeOAuthFlow: (code: string, state: string) => Promise<void>;

  // Wallet connection
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;

  // Phantom embedded wallet
  initializeEmbeddedWallet: () => Promise<void>;
  createEmbeddedWallet: (googleToken: string) => Promise<void>;

  // State management
  clearAuth: () => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export type WalletStore = WalletState & WalletActions;

export interface PhantomEmbeddedWalletConfig {
  organizationId: string;
  apiBaseUrl: string;
  environment: 'development' | 'production';
  addressTypes: string[];
}

export interface GoogleOAuthResult {
  user: WalletUser;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
}

export enum WalletError {
  OAUTH_FAILED = 'OAUTH_FAILED',
  WALLET_CONNECTION_FAILED = 'WALLET_CONNECTION_FAILED',
  EMBEDDED_WALLET_INIT_FAILED = 'EMBEDDED_WALLET_INIT_FAILED',
  PHANTOM_NOT_AVAILABLE = 'PHANTOM_NOT_AVAILABLE',
  USER_REJECTED = 'USER_REJECTED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_STATE = 'INVALID_STATE',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
}

export interface WalletErrorInfo {
  type: WalletError;
  message: string;
  details?: any;
}
