/**
 * Provider Management Component
 *
 * UI for managing AI providers, authentication, and model selection
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { getAuthInstructions } from '@/lib/ai/providers/auth';
import { getProviderManager } from '@/lib/ai/providers/manager';
import { supportsOAuthForAPI } from '@/lib/ai/providers/oauth-config';
import type { AuthMethod } from '@/lib/ai/providers/types';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Shield,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { OAuthButton } from '../ai/OAuthButton';
import { OAuthStatus } from '../ai/OAuthStatus';
import { AuthInstructionLink } from '../ui/auth-instruction-link';

interface ProviderManagementProps {
  className?: string;
}

export function ProviderManagement({ className }: ProviderManagementProps) {
  const [providers, setProviders] = useState(getProviderManager().getAllProviders());
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [authDialog, setAuthDialog] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('api_key');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const manager = getProviderManager();
  const { toast } = useToast();

  useEffect(() => {
    const refreshProviders = async () => {
      await manager.refreshAuthStatus();
      setProviders(manager.getAllProviders());
    };

    refreshProviders();

    // Set up periodic refresh
    const interval = setInterval(refreshProviders, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [manager]);

  const handleAuthenticate = async () => {
    if (!selectedProvider || !apiKey.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (authMethod === 'api_key') {
        await manager.authenticateWithApiKey(selectedProvider, apiKey.trim());

        // Get the updated provider to show available models
        const updatedProvider = manager.getProvider(selectedProvider);
        const availableModels = manager.getAvailableModels();

        // Show success message with model count
        toast({
          title: `Successfully authenticated with ${selectedProvider}!`,
          description: `You now have access to ${availableModels.length} models. You can select them in the Model Selector.`,
        });

        console.log(`✅ Successfully authenticated with ${selectedProvider}!`);
        console.log(`📊 Now have access to ${availableModels.length} models`);

        if (updatedProvider) {
          console.log(`🔑 Provider: ${updatedProvider.provider.name}`);
          console.log(`📋 Available models: ${updatedProvider.models.length}`);
        }
      } else if (authMethod === 'oauth2') {
        const authUrl = await manager.startOAuthAuthentication(selectedProvider);
        window.open(authUrl, '_blank');
      }

      setProviders(manager.getAllProviders());
      setAuthDialog(false);
      setApiKey('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAuth = (providerId: string) => {
    manager.removeAuthentication(providerId);
    setProviders(manager.getAllProviders());
  };

  const handleToggleProvider = (providerId: string, enabled: boolean) => {
    manager.setProviderEnabled(providerId, enabled);
    setProviders(manager.getAllProviders());
  };

  const openAuthDialog = (providerId: string, method: AuthMethod = 'api_key') => {
    setSelectedProvider(providerId);
    setAuthMethod(method);
    setApiKey('');
    setError(null);
    setAuthDialog(true);
  };

  const getProviderStatusIcon = (authStatus: string) => {
    switch (authStatus) {
      case 'authenticated':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProviderStatusText = (authStatus: string) => {
    switch (authStatus) {
      case 'authenticated':
        return 'Authenticated';
      case 'expired':
        return 'Token Expired';
      case 'error':
        return 'Error';
      default:
        return 'Not Authenticated';
    }
  };

  const authenticatedProviders = providers.filter((p) => p.auth_status === 'authenticated');
  const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0);
  const totalRequests = providers.reduce((sum, p) => sum + (p.usage_stats?.requests_today || 0), 0);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gradient">AI Providers</h2>
          <p className="text-muted-foreground">Manage AI model providers and authentication</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {authenticatedProviders.length} Connected
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {totalModels} Models
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="text-xl font-semibold">{authenticatedProviders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Models</p>
                <p className="text-xl font-semibold">{manager.getAvailableModels().length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requests Today</p>
                <p className="text-xl font-semibold">{totalRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="core">Core Providers</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="audio">Audio & Speech</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {authenticatedProviders.slice(0, 6).map((provider) => (
              <Card key={provider.id} className="group hover-lift">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-secondary rounded-lg">
                        {provider.provider.is_community ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          <Star className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{provider.provider.display_name}</h3>
                        <div className="flex items-center gap-2">
                          {getProviderStatusIcon(provider.auth_status)}
                          <span className="text-sm text-muted-foreground">
                            {getProviderStatusText(provider.auth_status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={provider.provider.is_community ? 'outline' : 'default'}>
                      {provider.models.length} models
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {provider.provider.description}
                  </p>
                  {provider.usage_stats && (
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{provider.usage_stats.requests_today} requests</span>
                      <span>{provider.usage_stats.tokens_used_today.toLocaleString()} tokens</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="core" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {providers
              .filter((p) => !p.provider.is_community)
              .map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onAuthenticate={openAuthDialog}
                  onRemoveAuth={handleRemoveAuth}
                  onToggle={handleToggleProvider}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="community" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {providers
              .filter((p) => p.provider.is_community)
              .map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onAuthenticate={openAuthDialog}
                  onRemoveAuth={handleRemoveAuth}
                  onToggle={handleToggleProvider}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="audio" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {providers
              .filter((p) =>
                p.models.some((m) => m.capabilities.audio_input || m.capabilities.audio_output)
              )
              .map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  onAuthenticate={openAuthDialog}
                  onRemoveAuth={handleRemoveAuth}
                  onToggle={handleToggleProvider}
                />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>Monitor your AI provider usage and costs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {authenticatedProviders.map((provider) => {
                  const usage = provider.usage_stats;
                  if (!usage) return null;

                  return (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary rounded-lg">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{provider.provider.display_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {usage.requests_today} requests today
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{usage.tokens_used_today.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">tokens</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Authentication Dialog */}
      <Dialog open={authDialog} onOpenChange={setAuthDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Authenticate Provider</DialogTitle>
            <DialogDescription>
              {selectedProvider && (
                <>
                  Configure authentication for{' '}
                  {providers.find((p) => p.id === selectedProvider)?.provider.display_name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedProvider && (
              <>
                <div>
                  <Label htmlFor="auth-method">Authentication Method</Label>
                  <Select
                    value={authMethod}
                    onValueChange={(value) => setAuthMethod(value as AuthMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {providers
                        .find((p) => p.id === selectedProvider)
                        ?.provider.auth_methods.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method === 'api_key'
                              ? 'API Key'
                              : method === 'oauth2'
                                ? 'OAuth 2.0'
                                : method.replace('_', ' ').toUpperCase()}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {authMethod === 'api_key' && (
                  <div>
                    <Label htmlFor="api-key">API Key</Label>
                    <div className="relative">
                      <Input
                        id="api-key"
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <AuthInstructionLink
                        instruction={getAuthInstructions(selectedProvider, 'api_key')}
                      />
                    </p>
                  </div>
                )}

                {authMethod === 'oauth2' && (
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg bg-muted/50">
                      <p className="text-sm">
                        You will be redirected to{' '}
                        {providers.find((p) => p.id === selectedProvider)?.provider.display_name}
                        to authorize access.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <AuthInstructionLink
                        instruction={getAuthInstructions(selectedProvider, 'oauth2')}
                      />
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-3 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setAuthDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAuthenticate}
              disabled={loading || (authMethod === 'api_key' && !apiKey.trim())}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {authMethod === 'api_key' ? 'Authenticate' : 'Start OAuth Flow'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ProviderCardProps {
  provider: Record<string, unknown>;
  onAuthenticate: (providerId: string, method: AuthMethod) => void;
  onRemoveAuth: (providerId: string) => void;
  onToggle: (providerId: string, enabled: boolean) => void;
}

function ProviderCard({ provider, onAuthenticate, onRemoveAuth, onToggle }: ProviderCardProps) {
  const isAuthenticated = provider.auth_status === 'authenticated';

  return (
    <Card className="group hover-lift">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-secondary rounded-lg">
              {provider.provider.is_community ? (
                <Users className="h-6 w-6" />
              ) : (
                <Star className="h-6 w-6" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold">{provider.provider.display_name}</h3>
                <Badge variant={provider.provider.status === 'beta' ? 'secondary' : 'outline'}>
                  {provider.provider.status}
                </Badge>
                {provider.provider.is_community && <Badge variant="outline">Community</Badge>}
              </div>

              <p className="text-muted-foreground mb-3">{provider.provider.description}</p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  {getProviderStatusIcon(provider.auth_status)}
                  <span>{getProviderStatusText(provider.auth_status)}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span>{provider.models.length} models</span>
                </div>

                {provider.usage_stats && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{provider.usage_stats.requests_today} requests today</span>
                  </div>
                )}
              </div>

              {/* OAuth Status */}
              {isAuthenticated && <OAuthStatus providerId={provider.id} />}

              {provider.provider.documentation_url && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={provider.provider.documentation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Documentation
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Button variant="outline" size="sm" onClick={() => onRemoveAuth(provider.id)}>
                  Remove Auth
                </Button>
                <Button
                  variant={provider.is_enabled ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => onToggle(provider.id, !provider.is_enabled)}
                >
                  {provider.is_enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </>
            ) : (
              <div className="flex gap-1">
                {/* Show OAuth button for providers that support it */}
                {supportsOAuthForAPI(provider.id) ? (
                  <OAuthButton providerId={provider.id} className="h-8" />
                ) : null}

                {/* Always show API key option if supported */}
                {provider.provider.auth_methods.includes('api_key') && (
                  <Button size="sm" onClick={() => onAuthenticate(provider.id, 'api_key')}>
                    <Key className="h-4 w-4 mr-1" />
                    API Key
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getProviderStatusIcon(authStatus: string) {
  switch (authStatus) {
    case 'authenticated':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'expired':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Shield className="h-4 w-4 text-gray-400" />;
  }
}

function getProviderStatusText(authStatus: string) {
  switch (authStatus) {
    case 'authenticated':
      return 'Authenticated';
    case 'expired':
      return 'Token Expired';
    case 'error':
      return 'Error';
    default:
      return 'Not Authenticated';
  }
}
