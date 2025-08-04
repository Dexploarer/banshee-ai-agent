/**
 * Wallet Status Component
 *
 * Displays current wallet connection status, user info, and wallet address
 */

import { CheckCircle, Copy, ExternalLink, LogOut, User, Wallet, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { usePhantom } from '../../lib/wallet/phantom-provider';
import { useWalletStore } from '../../lib/wallet/store';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface WalletStatusProps {
  className?: string;
  showDisconnect?: boolean;
  compact?: boolean;
}

export function WalletStatus({
  className,
  showDisconnect = true,
  compact = false,
}: WalletStatusProps) {
  const { connection, disconnectWallet } = usePhantom();
  const { auth, clearAuth } = useWalletStore();
  const { toast } = useToast();
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleCopyAddress = async () => {
    if (!connection.publicKey) return;

    try {
      await navigator.clipboard.writeText(connection.publicKey.toString());
      toast({
        title: 'Address Copied',
        description: 'Wallet address copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy address to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);

      await disconnectWallet();
      clearAuth();

      toast({
        title: 'Wallet Disconnected',
        description: 'Your wallet has been disconnected successfully',
      });
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast({
        title: 'Disconnect Failed',
        description: 'Failed to disconnect wallet. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatAddress = (address: string) => {
    if (compact) {
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  if (!connection.connected || !connection.publicKey) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Wallet className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">No Wallet Connected</p>
            <p className="text-xs text-gray-400">Connect a wallet to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-500" />
          <span className="text-xs text-gray-600 dark:text-gray-300">Connected</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyAddress}
          className="h-6 px-2 text-xs font-mono"
        >
          {formatAddress(connection.publicKey.toString())}
          <Copy className="h-3 w-3 ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          Wallet Connected
        </CardTitle>
        {showDisconnect && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="h-8 w-8 p-0"
          >
            {isDisconnecting ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {auth.user && (
          <div className="flex items-center gap-3">
            {auth.user.picture ? (
              <img src={auth.user.picture} alt={auth.user.name} className="h-8 w-8 rounded-full" />
            ) : (
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium">{auth.user.name}</p>
              <p className="text-xs text-gray-500">{auth.user.email}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Wallet Address</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleCopyAddress} className="h-6 px-2">
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                <a
                  href={`https://solscan.io/account/${connection.publicKey.toString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-2">
            <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">
              {connection.publicKey.toString()}
            </code>
          </div>
        </div>

        {showDisconnect && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="w-full"
          >
            {isDisconnecting ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2" />
            ) : (
              <LogOut className="h-3 w-3 mr-2" />
            )}
            Disconnect Wallet
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
