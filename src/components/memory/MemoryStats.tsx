import type React from 'react';
import { MemoryUtils } from '../../lib/ai/memory/client';
import type { MemoryType } from '../../lib/ai/memory/types';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Progress } from '../ui/progress';

interface MemoryStatsData {
  totalMemories: number;
  typeDistribution: Record<MemoryType, number>;
  uniqueTags: string[];
  averageRelevance: number;
  mostAccessed: unknown[];
  recentLearnings: unknown[];
}

interface MemoryStatsProps {
  stats: MemoryStatsData;
  compact?: boolean;
}

export function MemoryStats({ stats, compact = false }: MemoryStatsProps) {
  const { totalMemories, typeDistribution, uniqueTags, averageRelevance } = stats;

  // Get top memory types by count
  const topTypes = Object.entries(typeDistribution)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, compact ? 3 : 8);

  const maxCount = Math.max(...Object.values(typeDistribution));

  if (compact) {
    return (
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total:</span>
          <Badge variant="secondary">{totalMemories}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Tags:</span>
          <Badge variant="secondary">{uniqueTags.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Avg Relevance:</span>
          <Badge variant="secondary">{(averageRelevance * 100).toFixed(1)}%</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Overview Stats */}
      <Card>
        <CardHeader className="pb-2">
          <h4 className="text-sm font-medium text-muted-foreground">Overview</h4>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Total Memories</span>
            <Badge variant="secondary">{totalMemories}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Unique Tags</span>
            <Badge variant="secondary">{uniqueTags.length}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Avg Relevance</span>
            <Badge variant="secondary">{(averageRelevance * 100).toFixed(1)}%</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Memory Type Distribution */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <h4 className="text-sm font-medium text-muted-foreground">Memory Types</h4>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topTypes.map(([type, count]) => {
              const memoryType = type as MemoryType;
              const percentage = totalMemories > 0 ? (count / totalMemories) * 100 : 0;
              const typeColor = MemoryUtils.getTypeColor(memoryType);
              const typeIcon = MemoryUtils.getTypeIcon(memoryType);

              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{typeIcon}</span>
                      <span>{type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{count}</span>
                      <span className="text-xs text-muted-foreground">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={percentage}
                    className="h-2"
                    style={
                      {
                        '--progress-background': `${typeColor}20`,
                        '--progress-foreground': typeColor,
                      } as React.CSSProperties
                    }
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <h4 className="text-sm font-medium text-muted-foreground">Activity</h4>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Most Accessed</span>
            <Badge variant="outline">{stats.mostAccessed.length}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Recent Learnings</span>
            <Badge variant="outline">{stats.recentLearnings.length}</Badge>
          </div>
          {stats.recentLearnings.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Last: {MemoryUtils.getRelativeTime(stats.recentLearnings[0].created_at)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
