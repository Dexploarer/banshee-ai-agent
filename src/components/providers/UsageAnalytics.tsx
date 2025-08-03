/**
 * Usage Analytics Component
 *
 * Displays usage statistics and cost tracking for AI providers
 */

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getProviderManager } from '@/lib/ai/providers/manager';
import { cn } from '@/lib/utils';
import { BarChart3, DollarSign, Zap, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UsageAnalyticsProps {
  className?: string;
}

interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<
    string,
    {
      requests: number;
      inputTokens: number;
      outputTokens: number;
      cost: number;
    }
  >;
  dailyUsage: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
}

export function UsageAnalytics({ className }: UsageAnalyticsProps) {
  const [timeRange, setTimeRange] = useState('7');
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const manager = getProviderManager();

  useEffect(() => {
    loadUsageStats();
  }, [timeRange]);

  const loadUsageStats = () => {
    setLoading(true);
    const days = parseInt(timeRange);
    const usage = manager.getTotalUsage(days);

    // Calculate statistics
    const stats: UsageStats = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byProvider: {},
      dailyUsage: [],
    };

    // Group by provider
    usage.forEach((u) => {
      stats.totalRequests += u.requests;
      stats.totalTokens += u.input_tokens + u.output_tokens;
      stats.totalCost += u.cost_usd;

      if (!stats.byProvider[u.provider_id]) {
        stats.byProvider[u.provider_id] = {
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
        };
      }

      stats.byProvider[u.provider_id]!.requests += u.requests;
      stats.byProvider[u.provider_id]!.inputTokens += u.input_tokens;
      stats.byProvider[u.provider_id]!.outputTokens += u.output_tokens;
      stats.byProvider[u.provider_id]!.cost += u.cost_usd;
    });

    // Group by date for daily usage
    const dailyMap = new Map<string, { requests: number; tokens: number; cost: number }>();
    usage.forEach((u) => {
      const existing = dailyMap.get(u.date) || { requests: 0, tokens: 0, cost: 0 };
      existing.requests += u.requests;
      existing.tokens += u.input_tokens + u.output_tokens;
      existing.cost += u.cost_usd;
      dailyMap.set(u.date, existing);
    });

    stats.dailyUsage = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setUsageStats(stats);
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-muted-foreground">Loading usage analytics...</p>
      </div>
    );
  }

  if (!usageStats) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <p className="text-muted-foreground">No usage data available</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Usage Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Monitor your AI usage and costs across all providers
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 days</SelectItem>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{formatNumber(usageStats.totalRequests)}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">{formatNumber(usageStats.totalTokens)}</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(usageStats.totalCost)}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Provider</CardTitle>
          <CardDescription>Breakdown of requests, tokens, and costs by AI provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(usageStats.byProvider).map(([providerId, stats]) => {
            const percentOfTotal = (stats.cost / usageStats.totalCost) * 100;
            return (
              <div key={providerId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{providerId}</span>
                    <Badge variant="outline" className="text-xs">
                      {stats.requests} requests
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(stats.cost)}</span>
                </div>
                <Progress value={percentOfTotal} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatNumber(stats.inputTokens + stats.outputTokens)} tokens</span>
                  <span>{percentOfTotal.toFixed(1)}% of total cost</span>
                </div>
              </div>
            );
          })}

          {Object.keys(usageStats.byProvider).length === 0 && (
            <p className="text-center text-muted-foreground py-4">
              No usage data for this time period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Daily Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Usage Trend</CardTitle>
          <CardDescription>Requests and costs over the selected time period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {usageStats.dailyUsage.map((day) => {
              const maxRequests = Math.max(...usageStats.dailyUsage.map((d) => d.requests));
              const barWidth = maxRequests > 0 ? (day.requests / maxRequests) * 100 : 0;

              return (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="flex items-center gap-4">
                      <span>{day.requests} requests</span>
                      <span className="font-medium">{formatCurrency(day.cost)}</span>
                    </div>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {usageStats.dailyUsage.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No daily usage data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
