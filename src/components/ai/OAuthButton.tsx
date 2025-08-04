import { ExternalLink, LogIn } from 'lucide-react';
import React from 'react';
import { useToast } from '../../hooks/useToast';
import { getAuthManager } from '../../lib/ai/providers/auth';
import { getProviderManager } from '../../lib/ai/providers/manager';
import { supportsOAuthForAPI } from '../../lib/ai/providers/oauth-config';
import { startOAuthFlow, useOAuthListener } from '../../lib/ai/providers/oauth-handler';
import { Button } from '../ui/button';

interface OAuthButtonProps {
  providerId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

export function OAuthButton({ providerId, onSuccess, onError, className }: OAuthButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const { toast } = useToast();
  const authManager = getAuthManager();
  const providerManager = getProviderManager();

  // Check if OAuth is ready on mount
  React.useEffect(() => {
    const checkOAuthReady = async () => {
      try {
        // Simple check to see if OAuth plugin is available
        setIsReady(true);
      } catch (error) {
        console.error('OAuth plugin not ready:', error);
        setIsReady(false);
      }
    };

    checkOAuthReady();
  }, []);

  // Listen for OAuth completion events
  useOAuthListener((event) => {
    const detail = event.detail as { providerId: string; success: boolean; error?: string };

    if (detail.providerId === providerId) {
      setIsLoading(false);

      if (detail.success) {
        toast({
          title: 'Authentication Successful',
          description: `Successfully authenticated with ${provider?.provider.display_name}`,
        });
        onSuccess?.();
      } else {
        toast({
          title: 'Authentication Failed',
          description: detail.error || 'OAuth authentication failed',
          variant: 'destructive',
        });
        onError?.(new Error(detail.error || 'OAuth authentication failed'));
      }
    }
  });

  // Check if provider supports OAuth for API access
  if (!supportsOAuthForAPI(providerId)) {
    return null;
  }

  const provider = providerManager.getProvider(providerId);
  if (!provider) {
    return null;
  }

  const handleOAuthClick = async () => {
    if (!isReady) {
      toast({
        title: 'OAuth Not Ready',
        description: 'OAuth plugin is not ready. Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log(`Starting OAuth flow for provider: ${providerId}`);

      // Start OAuth flow
      const authUrl = await authManager.startOAuthFlow(providerId, provider.provider);
      console.log('Generated auth URL:', authUrl);

      // Use Tauri OAuth plugin to handle the flow
      await startOAuthFlow(authUrl);

      toast({
        title: 'OAuth Authentication',
        description:
          "Please complete the authentication in your browser. The app will detect when you're done.",
      });

      // The OAuth callback will be handled by the listener we set up above
    } catch (error) {
      console.error('OAuth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'OAuth authentication failed';

      // More specific error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('plugin')) {
        userMessage = 'OAuth plugin error. Please restart the application and try again.';
      } else if (errorMessage.includes('port')) {
        userMessage = 'OAuth service is busy. Please wait a moment and try again.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage = 'Network error. Please check your internet connection and try again.';
      }

      toast({
        title: 'Authentication Error',
        description: userMessage,
        variant: 'destructive',
      });

      onError?.(error instanceof Error ? error : new Error(errorMessage));
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    switch (providerId) {
      case 'google':
        return 'Sign in with Google';
      case 'openrouter':
        return 'Connect OpenRouter';
      default:
        return `Sign in with ${provider.provider.display_name}`;
    }
  };

  const getButtonIcon = () => {
    switch (providerId) {
      case 'google':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" role="img" aria-label="Google">
            <title>Google</title>
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
      default:
        return <LogIn className="w-4 h-4" />;
    }
  };

  return (
    <Button
      onClick={handleOAuthClick}
      disabled={isLoading || !isReady}
      variant="outline"
      className={className}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
      ) : (
        getButtonIcon()
      )}
      <span className="ml-2">{!isReady ? 'OAuth Loading...' : getButtonText()}</span>
      {isReady && <ExternalLink className="w-3 h-3 ml-2 opacity-50" />}
    </Button>
  );
}
