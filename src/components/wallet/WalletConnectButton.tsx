/**
 * Wallet Connect Button Component
 *
 * Primary button for initiating Google OAuth → Phantom Wallet creation flow
 */

import { ExternalLink, Loader2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { walletAuthService } from '../../lib/wallet/auth-service';
import { usePhantom } from '../../lib/wallet/phantom-provider';
import { Button } from '../ui/button';

interface WalletConnectButtonProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export function WalletConnectButton({
  onSuccess,
  onError,
  className,
  variant = 'default',
  size = 'default',
  showIcon = true,
}: WalletConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { connection, initialized, error, clearError } = usePhantom();

  const handleConnectWallet = async () => {
    if (!initialized) {
      toast({
        title: 'Wallet Not Ready',
        description: 'Phantom embedded wallet is still initializing. Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }

    if (error) {
      clearError();
    }

    setIsLoading(true);

    try {
      console.log('Starting wallet connection flow...');

      // Start Google OAuth flow
      await walletAuthService.startGoogleOAuthFlow();

      toast({
        title: 'Authentication Started',
        description: 'Please complete the Google sign-in process in your browser.',
      });

      // Note: The OAuth callback will be handled by the OAuth listener
      // and will complete the wallet creation process

      onSuccess?.();
    } catch (err) {
      console.error('Wallet connection failed:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to start wallet connection';

      let userMessage = errorMessage;
      if (errorMessage.includes('OAuth')) {
        userMessage = 'Failed to start Google authentication. Please try again.';
      } else if (errorMessage.includes('plugin')) {
        userMessage = 'Authentication service is not available. Please restart the app.';
      }

      toast({
        title: 'Connection Failed',
        description: userMessage,
        variant: 'destructive',
      });

      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (connection.connected) {
      return 'Wallet Connected';
    }
    if (connection.connecting) {
      return 'Connecting...';
    }
    if (isLoading) {
      return 'Starting Authentication...';
    }
    return 'Connect with Google';
  };

  const getButtonIcon = () => {
    if (isLoading || connection.connecting) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (connection.connected) {
      return <Wallet className="h-4 w-4 text-green-500" />;
    }
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" role="img" aria-label="Wallet">
        <title>Wallet</title>
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    );
  };

  return (
    <Button
      onClick={handleConnectWallet}
      disabled={isLoading || connection.connecting || connection.connected || !initialized}
      variant={connection.connected ? 'secondary' : variant}
      size={size}
      className={className}
    >
      {showIcon && getButtonIcon()}
      <span className={showIcon ? 'ml-2' : ''}>{getButtonText()}</span>
      {!connection.connected && <ExternalLink className="w-3 h-3 ml-2 opacity-50" />}
    </Button>
  );
}
