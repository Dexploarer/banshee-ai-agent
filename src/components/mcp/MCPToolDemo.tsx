import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNativeMCP } from '@/hooks/useNativeMCP';
import type { MCPResource } from '@/lib/mcp/types';
import { useMCPStore } from '@/store/mcpStore';
import { FileText, Link, Play, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ToolResult {
  success: boolean;
  content: string;
  _meta?: Record<string, unknown> | undefined;
  linkedResources?: unknown[];
  elicitationPrompts?: unknown[];
  resourceIndicators?: unknown[];
  timestamp: string;
}

interface MCPToolWithExecute {
  name: string;
  description?: string;
  execute?: (args: Record<string, unknown>) => Promise<unknown>;
}

export function MCPToolDemo() {
  const nativeMCP = useNativeMCP();
  const connectedServers = useMCPStore((state) => state.getConnectedServers());
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [availableTools, setAvailableTools] = useState<Record<string, MCPToolWithExecute>>({});
  const [availableResources, setAvailableResources] = useState<MCPResource[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolArgs, setToolArgs] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ToolResult | null>(null);

  useEffect(() => {
    if (nativeMCP.isReady && connectedServers.length > 0 && !selectedServer) {
      setSelectedServer(connectedServers[0]?.id || '');
    }
  }, [nativeMCP.isReady, connectedServers, selectedServer]);

  useEffect(() => {
    const loadData = async () => {
      if (!nativeMCP.isReady) return;

      try {
        // Load tools from native MCP integration
        const tools = nativeMCP.getAllTools();
        setAvailableTools(tools as Record<string, MCPToolWithExecute>);

        // Note: Resources are not directly supported by native AI SDK MCP client
        // This would need to be implemented separately if needed
        setAvailableResources([]);
      } catch (error) {
        console.error('Failed to load MCP data:', error);
      }
    };

    loadData();
  }, [nativeMCP.isReady, nativeMCP.getAllTools]);

  const handleExecuteTool = async () => {
    if (!selectedTool || !nativeMCP.isReady) return;

    setIsExecuting(true);
    try {
      let args: Record<string, unknown> = {};
      if (toolArgs.trim()) {
        args = JSON.parse(toolArgs);
      }

      // Execute the tool using native AI SDK tools
      const tool = availableTools[selectedTool];
      if (tool && typeof tool.execute === 'function') {
        const result = await tool.execute(args);
        setLastResult({
          success: true,
          content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      setLastResult({
        success: false,
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReadResource = async (_resourceUri: string) => {
    // Resources not supported by native AI SDK MCP client yet
    setLastResult({
      success: false,
      content: 'Resource reading not supported by native AI SDK MCP client',
      timestamp: new Date().toISOString(),
    });
  };

  if (!nativeMCP.isReady) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Native MCP integration not ready. Please ensure MCP servers are connected.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">MCP Tool & Resource Explorer</h2>
          <p className="text-muted-foreground">
            Explore and test MCP tools with enhanced 2025 features
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">{nativeMCP.stats.totalTools} Total Tools</Badge>
          <Badge variant="outline">{nativeMCP.stats.connectedServers} Connected Servers</Badge>
          <Badge variant="outline">{Object.keys(availableTools).length} Available Tools</Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tools Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Available Tools
            </CardTitle>
            <CardDescription>
              Tools from connected MCP servers with resource linking support
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Server Selection */}
            <div className="space-y-2">
              <label htmlFor="server-filter" className="text-sm font-medium">
                Server Filter
              </label>
              <select
                id="server-filter"
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Servers</option>
                {connectedServers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name} ({server.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Tool Selection */}
            <div className="space-y-2">
              <label htmlFor="tool-select" className="text-sm font-medium">
                Select Tool
              </label>
              <select
                id="tool-select"
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Choose a tool...</option>
                {Object.entries(availableTools).map(([name, tool]) => (
                  <option key={name} value={name}>
                    {name} -{' '}
                    {tool.description ? tool.description.substring(0, 50) : 'No description'}...
                  </option>
                ))}
              </select>
            </div>

            {/* Tool Arguments */}
            <div className="space-y-2">
              <label htmlFor="tool-args" className="text-sm font-medium">
                Arguments (JSON)
              </label>
              <textarea
                id="tool-args"
                value={toolArgs}
                onChange={(e) => setToolArgs(e.target.value)}
                placeholder='{"param": "value"}'
                className="w-full px-3 py-2 border rounded-lg h-20 font-mono text-sm"
              />
            </div>

            <Button
              onClick={handleExecuteTool}
              disabled={!selectedTool || isExecuting}
              className="w-full"
            >
              <Play className="mr-2 h-4 w-4" />
              {isExecuting ? 'Executing...' : 'Execute Tool'}
            </Button>
          </CardContent>
        </Card>

        {/* Resources Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Available Resources
            </CardTitle>
            <CardDescription>
              Resources exposed by MCP servers with metadata support
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {availableResources.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No resources available</div>
              ) : (
                availableResources.map((resource, index) => (
                  <div
                    key={`${resource.uri}-${index}`}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{resource.name || resource.uri}</div>
                      <div className="text-xs text-muted-foreground">
                        {resource.description || resource.uri}
                      </div>
                      {resource.mimeType && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {resource.mimeType}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReadResource(resource.uri)}
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <div className="h-2 w-2 bg-green-500 rounded-full" />
              ) : (
                <div className="h-2 w-2 bg-red-500 rounded-full" />
              )}
              Execution Result
            </CardTitle>
            <CardDescription>
              {lastResult.timestamp} - {lastResult.success ? 'Success' : 'Error'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Main Content */}
            <div className="space-y-2">
              <label htmlFor="content-display" className="text-sm font-medium">
                Content
              </label>
              <div
                id="content-display"
                className="p-3 bg-muted rounded-lg font-mono text-sm max-h-40 overflow-auto"
              >
                {lastResult.content}
              </div>
            </div>

            {/* Enhanced Features */}
            {lastResult._meta && (
              <div className="space-y-2">
                <label htmlFor="metadata-display" className="text-sm font-medium">
                  Metadata
                </label>
                <div
                  id="metadata-display"
                  className="p-3 bg-muted rounded-lg font-mono text-xs max-h-32 overflow-auto"
                >
                  {JSON.stringify(lastResult._meta, null, 2)}
                </div>
              </div>
            )}

            {/* Resource Links */}
            {lastResult.linkedResources && lastResult.linkedResources.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="linked-resources" className="text-sm font-medium">
                  Linked Resources
                </label>
                <div id="linked-resources" className="space-y-1">
                  {lastResult.linkedResources.map((resource, index) => {
                    const resourceObj = resource as { name?: string; uri?: string };
                    return (
                      <Badge
                        key={`${resourceObj.name || resourceObj.uri || 'unknown'}-${index}`}
                        variant="outline"
                        className="mr-2"
                      >
                        <Link className="h-3 w-3 mr-1" />
                        {resourceObj.name || resourceObj.uri || 'Unknown Resource'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Elicitation Prompts */}
            {lastResult.elicitationPrompts && lastResult.elicitationPrompts.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="elicitation-prompts" className="text-sm font-medium">
                  AI Elicitation Prompts
                </label>
                <div className="space-y-1">
                  {lastResult.elicitationPrompts?.map((prompt) => (
                    <div
                      key={`prompt-${String(prompt).slice(0, 10)}`}
                      className="p-2 bg-blue-50 rounded border-l-4 border-blue-400 text-sm"
                    >
                      {typeof prompt === 'object' && prompt !== null && 'text' in prompt
                        ? (prompt as { text: string }).text
                        : String(prompt)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
