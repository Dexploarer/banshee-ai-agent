import { ProviderManagement } from '@/components/providers/ProviderManagement';
import { UsageAnalytics } from '@/components/providers/UsageAnalytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletConnectButton, WalletStatus } from '@/components/wallet';
import { BarChart3, Database, Palette, Shield, Wallet, Zap } from 'lucide-react';
import { useState } from 'react';

export function SettingsPortal() {
  const [activeTab, setActiveTab] = useState('providers');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your AI providers, models, security settings, and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Wallet
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage
          </TabsTrigger>
        </TabsList>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <ProviderManagement />
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet" className="space-y-4">
          <div className="grid gap-6">
            {/* Wallet Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Phantom Wallet
                </CardTitle>
                <CardDescription>
                  Connect your Phantom wallet using Google authentication for secure, embedded
                  wallet functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <WalletStatus />

                <div className="pt-4 border-t">
                  <WalletConnectButton variant="default" size="default" className="w-full" />
                </div>
              </CardContent>
            </Card>

            {/* Wallet Information */}
            <Card>
              <CardHeader>
                <CardTitle>About Embedded Wallets</CardTitle>
                <CardDescription>Learn about Phantom's embedded wallet technology</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          Seedless Security
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          No seed phrases to manage. Your wallet is secured through distributed key
                          management.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900 dark:text-green-100">
                          Easy Authentication
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Sign in with your Google account to create and access your wallet.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <div className="flex items-start gap-3">
                      <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-900 dark:text-amber-100">
                          Beta Feature
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Phantom embedded wallets are currently in beta. Use with caution in
                          production environments.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full" asChild>
                    <a
                      href="https://phantom.com/learn/crypto-101/embedded-wallets"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      Learn More About Embedded Wallets
                      <Zap className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Configure rate limiting and access control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Rate Limiting</p>
                    <p className="text-xs text-muted-foreground">Prevent API abuse</p>
                  </div>
                  <span className="text-sm text-muted-foreground">60/min, 1000/hour</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Input Sanitization</p>
                    <p className="text-xs text-muted-foreground">Validate and clean user input</p>
                  </div>
                  <span className="text-sm text-green-600">Enabled</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Command Whitelist</p>
                    <p className="text-xs text-muted-foreground">Allowed system commands</p>
                  </div>
                  <span className="text-sm text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Path Validation</p>
                    <p className="text-xs text-muted-foreground">Secure file access</p>
                  </div>
                  <span className="text-sm text-green-600">Enabled</span>
                </div>
              </div>

              <Button className="w-full" variant="outline">
                Configure Security
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>Theme and UI preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Dark
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Window Controls</p>
                    <p className="text-xs text-muted-foreground">Customize title bar</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Custom
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Compact Mode</p>
                    <p className="text-xs text-muted-foreground">Reduce UI spacing</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Off
                  </Button>
                </div>
              </div>

              <Button className="w-full" variant="outline">
                Customize Appearance
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Management
              </CardTitle>
              <CardDescription>Data storage and cache management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Conversation History</p>
                    <p className="text-xs text-muted-foreground">Chat messages and metadata</p>
                  </div>
                  <span className="text-sm text-muted-foreground">2.3 MB</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Agent Configurations</p>
                    <p className="text-xs text-muted-foreground">Saved agent settings</p>
                  </div>
                  <span className="text-sm text-muted-foreground">156 KB</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">MCP Cache</p>
                    <p className="text-xs text-muted-foreground">Protocol server data</p>
                  </div>
                  <span className="text-sm text-muted-foreground">892 KB</span>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Log Files</p>
                    <p className="text-xs text-muted-foreground">System and error logs</p>
                  </div>
                  <span className="text-sm text-muted-foreground">4.7 MB</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" variant="outline">
                  Clear Cache
                </Button>
                <Button className="flex-1" variant="outline">
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-4">
          <UsageAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
