import { AlertCircle, CheckCircle2, Clock, Crown, RefreshCw } from 'lucide-react';
import React from 'react';
import { useToast } from '../../hooks/useToast';
import { getAuthManager } from '../../lib/ai/providers/auth';
import { globalRateLimiter } from '../../lib/ai/providers/rate-limiting';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface OAuthStatusProps {
  providerId: string;
  onRefresh?: () => void;
}

export function OAuthStatus({ providerId, onRefresh }: OAuthStatusProps) {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [authConfig, setAuthConfig] = React.useState<{
    method: string;
    expires_at?: number;
    credentials?: {
      refresh_token?: string;
    };
    subscription_info?: {
      plan_type: 'pro' | 'max_5x' | 'max_20x';
      plan_name: string;
      usage_limits: {
        five_hour_limit: number;
        weekly_limit: number;
        model_access: string[];
      };
    };
  } | null>(null);
  const [rateLimitStatus, setRateLimitStatus] = React.useState<{
    remaining: number;
    reset: number;
    limit: number;
    status: 'safe' | 'warning' | 'critical' | 'exceeded';
  } | null>(null);
  const { toast } = useToast();
  const authManager = getAuthManager();

  React.useEffect(() => {
    authManager.getAuthConfig(providerId).then((config) => {
      setAuthConfig(config);

      // Get rate limit status for subscription users
      if (config?.method === 'oauth2' && config.subscription_info) {
        const status = globalRateLimiter.getRateLimitStatus(
          providerId,
          'claude-3-5-sonnet-20241022',
          config
        );
        setRateLimitStatus({
          remaining: status.fiveHour.limit - status.fiveHour.used,
          reset: status.fiveHour.resetTime,
          limit: status.fiveHour.limit,
          status: status.status
        });
      }
    });
  }, [providerId, authManager]);

  const isOAuth = authConfig?.method === 'oauth2';
  const isSubscription = authConfig?.subscription_info;

  if (!isOAuth) {
    return null;
  }

  const isExpired = authConfig.expires_at ? authConfig.expires_at < Date.now() : false;
  const expiresIn = authConfig.expires_at
    ? Math.max(0, Math.floor((authConfig.expires_at - Date.now()) / 1000 / 60)) // minutes
    : 0;

  // Get plan icon and color
  const getPlanIcon = (planType: string) => {
    switch (planType) {
      case 'pro':
        return <Crown className="w-3 h-3" />;
      case 'max_5x':
        return <Crown className="w-3 h-3" />;
      case 'max_20x':
        return <Crown className="w-3 h-3" />;
      default:
        return <CheckCircle2 className="w-3 h-3" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'pro':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'max_5x':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'max_20x':
        return 'bg-gold-500/10 text-amber-600 dark:text-amber-400';
      default:
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
    }
  };

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
    <div className="flex items-center gap-2 flex-wrap">
      {/* Subscription Plan Badge */}
      {isSubscription ? (
        <Badge
          variant="secondary"
          className={`gap-1 ${getPlanColor(authConfig.subscription_info!.plan_type)}`}
        >
          {getPlanIcon(authConfig.subscription_info!.plan_type)}
          {authConfig.subscription_info!.plan_name}
        </Badge>
      ) : (
        <Badge
          variant="secondary"
          className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400"
        >
          <CheckCircle2 className="w-3 h-3" />
          OAuth Active
        </Badge>
      )}

      {/* Rate Limit Status */}
      {rateLimitStatus && (
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className={`gap-1 text-xs ${
              rateLimitStatus.status === 'critical'
                ? 'border-red-200 text-red-600'
                : rateLimitStatus.status === 'warning'
                  ? 'border-yellow-200 text-yellow-600'
                  : 'border-green-200 text-green-600'
            }`}
          >
            <Clock className="w-2 h-2" />
            {Math.round((rateLimitStatus.remaining / rateLimitStatus.limit) * 100)}% used
          </Badge>
          {rateLimitStatus.status === 'critical' && (
            <span className="text-xs text-red-500">Limit approaching</span>
          )}
        </div>
      )}

      {/* Token Expiry */}
      {expiresIn < 60 && (
        <span className="text-xs text-muted-foreground">Expires in {expiresIn}m</span>
      )}

      {/* Refresh Button */}
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
