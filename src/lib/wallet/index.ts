/**
 * Wallet Integration - Public API
 *
 * Exports all wallet functionality for use throughout the application
 */

// Types
export type * from './types';

// OAuth Configuration
export * from './oauth-config';

// Authentication Service
export { walletAuthService } from './auth-service';

// Phantom Provider
export { PhantomProvider, usePhantom } from './phantom-provider';

// State Management
export {
  useWalletStore,
  useWalletAuth,
  useWalletConnection,
  useEmbeddedWallet,
  useOAuthFlow,
  useWalletActions,
} from './store';

// OAuth Handler
export {
  initializeWalletOAuthListener,
  useWalletOAuthListener,
} from './oauth-handler';

// UI Components (re-exported from components)
export { WalletConnectButton } from '../../components/wallet/WalletConnectButton';
export { WalletStatus } from '../../components/wallet/WalletStatus';
