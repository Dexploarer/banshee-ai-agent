import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Database, Key, Palette, Shield } from 'lucide-react';

export function SettingsPortal() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your AI agents, API keys, and system preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>Manage your AI provider API keys</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">OpenAI</p>
                  <p className="text-xs text-muted-foreground">gpt-4o, gpt-4o-mini</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-xs text-muted-foreground">Connected</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Anthropic</p>
                  <p className="text-xs text-muted-foreground">
                    claude-3-5-sonnet, claude-3-5-haiku
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 bg-red-500 rounded-full" />
                  <span className="text-xs text-muted-foreground">Not configured</span>
                </div>
              </div>
            </div>

            <Button className="w-full" variant="outline">
              Manage API Keys
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>Rate limiting and access control</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Rate Limiting</span>
                <span className="text-xs text-muted-foreground">60/min, 1000/hour</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Input Sanitization</span>
                <span className="text-xs text-green-600">Enabled</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Command Whitelist</span>
                <span className="text-xs text-green-600">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Path Validation</span>
                <span className="text-xs text-green-600">Enabled</span>
              </div>
            </div>

            <Button className="w-full" variant="outline">
              Configure Security
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
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
              <div className="flex items-center justify-between">
                <span className="text-sm">Theme</span>
                <Button variant="outline" size="sm">
                  Dark
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Window Controls</span>
                <Button variant="outline" size="sm">
                  Custom
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Compact Mode</span>
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

        {/* Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Storage
            </CardTitle>
            <CardDescription>Data storage and cache management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Conversation History</span>
                <span className="text-xs text-muted-foreground">2.3 MB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Agent Configurations</span>
                <span className="text-xs text-muted-foreground">156 KB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">MCP Cache</span>
                <span className="text-xs text-muted-foreground">892 KB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Log Files</span>
                <span className="text-xs text-muted-foreground">4.7 MB</span>
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
      </div>
    </div>
  );
}
