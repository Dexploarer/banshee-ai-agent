import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { apiCache, computationCache, defaultCache } from '@/lib/cache';
import { 
  Activity, 
  Database, 
  Memory, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

export interface PerformanceDashboardProps {
  className?: string;
  showAlerts?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PerformanceDashboard({
  className,
  showAlerts = true,
  autoRefresh = true,
  refreshInterval = 5000,
}: PerformanceDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  
  const {
    metrics,
    alerts,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearMetrics,
    getPerformanceSummary,
  } = usePerformanceMonitor();

  const [cacheStats, setCacheStats] = useState({
    api: apiCache.getStats(),
    computation: computationCache.getStats(),
    default: defaultCache.getStats(),
  });

  // Auto-refresh cache stats
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setCacheStats({
        api: apiCache.getStats(),
        computation: computationCache.getStats(),
        default: defaultCache.getStats(),
      });
      setLastRefresh(Date.now());
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Start monitoring on mount
  useEffect(() => {
    if (!isMonitoring) {
      startMonitoring();
    }
  }, [isMonitoring, startMonitoring]);

  const performanceSummary = getPerformanceSummary();
  const totalMemoryUsage = cacheStats.api.memoryUsage + cacheStats.computation.memoryUsage + cacheStats.default.memoryUsage;
  const totalHits = cacheStats.api.hits + cacheStats.computation.hits + cacheStats.default.hits;
  const totalMisses = cacheStats.api.misses + cacheStats.computation.misses + cacheStats.default.misses;
  const overallHitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

  const getStatusColor = (value: number, threshold: number) => {
    if (value >= threshold * 0.9) return 'text-green-600';
    if (value >= threshold * 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlertIcon = (type: 'warning' | 'error' | 'info') => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Dashboard
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isMonitoring ? 'default' : 'secondary'}>
                {isMonitoring ? 'Monitoring' : 'Stopped'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Cache Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Cache Hit Rate</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {(overallHitRate * 100).toFixed(1)}%
                </div>
                <Progress value={overallHitRate * 100} className="mt-2" />
                <div className="text-xs text-gray-500 mt-1">
                  {totalHits} hits / {totalHits + totalMisses} requests
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Memory Usage</span>
                  <Memory className="h-4 w-4 text-blue-500" />
                </div>
                <div className={`text-2xl font-bold ${getStatusColor(totalMemoryUsage, 50 * 1024 * 1024)}`}>
                  {(totalMemoryUsage / 1024 / 1024).toFixed(1)} MB
                </div>
                <Progress 
                  value={(totalMemoryUsage / (50 * 1024 * 1024)) * 100} 
                  className="mt-2" 
                />
                <div className="text-xs text-gray-500 mt-1">
                  {cacheStats.api.size + cacheStats.computation.size + cacheStats.default.size} cached items
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Render Performance</span>
                  <Activity className="h-4 w-4 text-purple-500" />
                </div>
                <div className={`text-2xl font-bold ${getStatusColor(performanceSummary?.averages.renderTime || 0, 16)}`}>
                  {performanceSummary?.averages.renderTime.toFixed(1) || '0'}ms
                </div>
                <Progress 
                  value={Math.min((performanceSummary?.averages.renderTime || 0) / 16 * 100, 100)} 
                  className="mt-2" 
                />
                <div className="text-xs text-gray-500 mt-1">
                  Target: &lt;16ms (60fps)
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cache Breakdown */}
          {isExpanded && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Cache Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">API Cache</span>
                      <Database className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Hit Rate:</span>
                        <span>{(cacheStats.api.hitRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Size:</span>
                        <span>{cacheStats.api.size} items</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Memory:</span>
                        <span>{((cacheStats.api.memoryUsage || 0) / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Computation Cache</span>
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Hit Rate:</span>
                        <span>{(cacheStats.computation.hitRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Size:</span>
                        <span>{cacheStats.computation.size} items</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Memory:</span>
                        <span>{((cacheStats.computation.memoryUsage || 0) / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Default Cache</span>
                      <Database className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Hit Rate:</span>
                        <span>{(cacheStats.default.hitRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Size:</span>
                        <span>{cacheStats.default.size} items</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Memory:</span>
                        <span>{((cacheStats.default.memoryUsage || 0) / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Performance Alerts */}
          {showAlerts && alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Performance Alerts</h3>
              <div className="space-y-2">
                {alerts.slice(-5).map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border"
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="text-sm font-medium">{alert.message}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant={alert.type === 'error' ? 'destructive' : 'secondary'}>
                      {alert.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={isMonitoring ? stopMonitoring : startMonitoring}
              >
                {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearMetrics}
              >
                Clear Metrics
              </Button>
            </div>
            <div className="text-xs text-gray-500">
              Last updated: {new Date(lastRefresh).toLocaleTimeString()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 