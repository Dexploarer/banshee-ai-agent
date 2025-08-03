import React from 'react';
import { Badge } from '../ui/badge';
import { CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { getAuthManager } from '../../lib/ai/providers/auth';
import { useToast } from '../../hooks/useToast';

interface OAuthStatusProps {
  providerId: string;
  onRefresh?: () => void;
}

export function OAuthStatus({ providerId, onRefresh }: OAuthStatusProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [authConfig, setAuthConfig] = React.useState<any>(null);
  const { toast } = useToast();
  const authManager = getAuthManager();

  React.useEffect(() => {
    authManager.getAuthConfig(providerId).then((config) => {
      setAuthConfig(config);
    });
  }, [providerId, authManager]);

  const isOAuth = authConfig?.method === 'oauth2';

  if (!isOAuth) {
    return null;
  }

  const isExpired = authConfig.expires_at ? authConfig.expires_at < Date.now() : false;
  const expiresIn = authConfig.expires_at
    ? Math.max(0, Math.floor((authConfig.expires_at - Date.now()) / 1000 / 60)) // minutes
    : 0;

  const handleRefresh = async () => {
    if (!authConfig.credentials?.refresh_token) {
      toast({
        title: 'Cannot Refresh',
        description: 'No refresh token available. Please re-authenticate.',
        variant: 'destructive',
      });
      return;
    }

    setIsRefreshing(true);

    try {
      const success = await authManager.refreshOAuthToken(providerId);

      if (success) {
        toast({
          title: 'Token Refreshed',
          description: 'OAuth token has been successfully refreshed.',
        });
        onRefresh?.();
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh OAuth token. Please re-authenticate.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isExpired) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          OAuth Expired
        </Badge>
        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          <span className="ml-1">Refresh</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400"
      >
        <CheckCircle2 className="w-3 h-3" />
        OAuth Active
      </Badge>
      {expiresIn < 60 && (
        <span className="text-xs text-muted-foreground">Expires in {expiresIn}m</span>
      )}
      {authConfig.credentials?.refresh_token && expiresIn < 60 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-6 px-2"
        >
          {isRefreshing ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
      )}
    </div>
  );
}
