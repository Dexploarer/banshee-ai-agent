import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveSessions } from '@/hooks/useAgentSessions';
import { useMCPServers } from '@/hooks/useMCPServers';
import { useSystemStats } from '@/hooks/useSystemStats';
import { Activity, BarChart3, Bot, Zap } from 'lucide-react';

export function DashboardPortal() {
  const { data: systemStats, isLoading: statsLoading } = useSystemStats();
  const { data: activeSessions = [] } = useActiveSessions();
  const { data: mcpServers = [] } = useMCPServers();

  const activeMCPServers = mcpServers.filter((server) => server.status === 'connected').length;
  const systemHealth = systemStats
    ? Math.round((100 - systemStats.cpuUsage) * 0.8 + (100 - systemStats.memoryUsage) * 0.2)
    : 0;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your AI agents, workflows, and system performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{activeSessions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeSessions.length === 1
                    ? '1 active session'
                    : `${activeSessions.length} active sessions`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground">Total messages processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MCP Connections</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mcpServers.length}</div>
            <p className="text-xs text-muted-foreground">{activeMCPServers} servers active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth}%</div>
            <p className="text-xs text-muted-foreground">
              {systemHealth > 80 ? 'All systems operational' : 'Performance degraded'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Agent Activity</CardTitle>
            <CardDescription>Latest conversations and executions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Bot className="h-8 w-8 rounded-full bg-primary/10 p-2 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Assistant Agent</p>
                <p className="text-xs text-muted-foreground">Completed file analysis task</p>
              </div>
              <span className="text-xs text-muted-foreground">2 min ago</span>
            </div>
            <div className="flex items-center gap-4">
              <Bot className="h-8 w-8 rounded-full bg-secondary/10 p-2 text-secondary-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">File Manager</p>
                <p className="text-xs text-muted-foreground">Organized project files</p>
              </div>
              <span className="text-xs text-muted-foreground">5 min ago</span>
            </div>
            <div className="flex items-center gap-4">
              <Bot className="h-8 w-8 rounded-full bg-accent/10 p-2 text-accent-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Web Agent</p>
                <p className="text-xs text-muted-foreground">Fetched API documentation</p>
              </div>
              <span className="text-xs text-muted-foreground">8 min ago</span>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
            <CardDescription>Current usage and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CPU Usage</span>
                <span>{systemStats?.cpuUsage || 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${systemStats?.cpuUsage || 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Memory</span>
                <span>{systemStats?.memoryUsage || 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${systemStats?.memoryUsage || 0}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Disk Usage</span>
                <span>{systemStats?.diskUsage || 0}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${systemStats?.diskUsage || 0}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
