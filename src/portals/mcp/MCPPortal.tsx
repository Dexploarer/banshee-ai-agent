import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMCPClient, useMCPProvider } from '@/hooks/useMCP';
import { defaultMCPServers } from '@/lib/mcp';
import { CheckCircle, Globe, Monitor, Plus, Server, XCircle, Zap } from 'lucide-react';
import { useState } from 'react';

export function MCPPortal() {
  const [selectedTab, setSelectedTab] = useState<'servers' | 'provider'>('servers');
  const mcpClient = useMCPClient();
  const mcpProvider = useMCPProvider();

  // Initialize with default servers
  useState(() => {
    for (const server of defaultMCPServers) {
      mcpClient.addServer(server);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Monitor className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'http':
        return <Globe className="h-4 w-4" />;
      case 'stdio':
        return <Monitor className="h-4 w-4" />;
      case 'local':
        return <Server className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Model Context Protocol</h1>
          <p className="text-muted-foreground">
            Manage MCP servers and configure Banshee as an MCP provider
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Server
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          <button
            type="button"
            onClick={() => setSelectedTab('servers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'servers'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            MCP Servers
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('provider')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'provider'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Provider Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'servers' && (
        <div className="space-y-6">
          {/* Server Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Servers</span>
                </div>
                <div className="text-2xl font-bold mt-2">{mcpClient.servers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <div className="text-2xl font-bold mt-2">
                  {mcpClient.servers.filter((s) => s.status === 'connected').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">HTTP Servers</span>
                </div>
                <div className="text-2xl font-bold mt-2">
                  {mcpClient.servers.filter((s) => s.type === 'http').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Local Servers</span>
                </div>
                <div className="text-2xl font-bold mt-2">
                  {mcpClient.servers.filter((s) => s.type === 'local' || s.type === 'stdio').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Server List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Connected Servers</h2>
            <div className="grid gap-4">
              {mcpClient.servers.map((server) => (
                <Card key={server.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(server.type)}
                          {getStatusIcon(server.status)}
                        </div>
                        <div>
                          <h3 className="font-medium">{server.name}</h3>
                          <p className="text-sm text-muted-foreground">{server.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {server.type.toUpperCase()}:{' '}
                            {server.config.url || server.config.command || server.config.path}
                          </p>
                          {server.error && (
                            <p className="text-xs text-red-500 mt-1">Error: {server.error}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={mcpClient.connecting.includes(server.id)}
                          onClick={() => {
                            if (server.status === 'connected') {
                              mcpClient.disconnectServer(server.id);
                            } else {
                              mcpClient.connectServer(server);
                            }
                          }}
                        >
                          {mcpClient.connecting.includes(server.id)
                            ? 'Connecting...'
                            : server.status === 'connected'
                              ? 'Disconnect'
                              : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'provider' && (
        <div className="space-y-6">
          {/* Provider Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Banshee MCP Provider
              </CardTitle>
              <CardDescription>
                Configure Banshee to act as an MCP server for other applications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Provider Status</p>
                  <p className="text-sm text-muted-foreground">
                    {mcpProvider.running
                      ? `Running on port ${mcpProvider.config.port}`
                      : 'Not running'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {mcpProvider.running ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Inactive</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="http-port" className="text-sm font-medium">
                    HTTP Port
                  </label>
                  <input
                    id="http-port"
                    type="number"
                    value={mcpProvider.config.port}
                    onChange={(e) =>
                      mcpProvider.updateConfig({ port: Number.parseInt(e.target.value) })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="auth-type" className="text-sm font-medium">
                    Authentication
                  </label>
                  <select
                    id="auth-type"
                    value={mcpProvider.config.auth.type}
                    onChange={(e) =>
                      mcpProvider.updateConfig({
                        auth: {
                          ...mcpProvider.config.auth,
                          type: e.target.value as 'oauth2.1' | 'apikey' | 'none',
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="oauth2.1">OAuth 2.1</option>
                    <option value="apikey">API Key</option>
                    <option value="none">None (stdio only)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={mcpProvider.startServer}
                  disabled={mcpProvider.running || mcpProvider.starting}
                >
                  {mcpProvider.starting ? 'Starting...' : 'Start Provider'}
                </Button>
                <Button
                  variant="outline"
                  onClick={mcpProvider.stopServer}
                  disabled={!mcpProvider.running}
                >
                  Stop Provider
                </Button>
                <Button
                  variant="outline"
                  onClick={mcpProvider.restartServer}
                  disabled={mcpProvider.starting}
                >
                  Restart Provider
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Exposed Resources */}
          <Card>
            <CardHeader>
              <CardTitle>Exposed Resources</CardTitle>
              <CardDescription>Resources and tools available to MCP clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Agent Configurations</p>
                    <p className="text-xs text-muted-foreground">5 agent types available</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enabled
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">File Operations</p>
                    <p className="text-xs text-muted-foreground">Read, write, list files</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enabled
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">System Commands</p>
                    <p className="text-xs text-muted-foreground">Execute safe system commands</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Enabled
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Conversation History</p>
                    <p className="text-xs text-muted-foreground">Access to chat logs</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Disabled
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
