
import { MemoryUtils } from '../../lib/ai/memory/client';
import type { AgentMemory } from '../../lib/ai/memory/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';

interface MemoryCardProps {
  memory: AgentMemory;
  onSelect: ((memory: AgentMemory) => void) | undefined;
  onEdit: ((memory: AgentMemory) => void) | undefined;
  onDelete: ((memory: AgentMemory) => void) | undefined;
  compact?: boolean;
}

export function MemoryCard({
  memory,
  onSelect,
  onEdit,
  onDelete,
  compact = false,
}: MemoryCardProps) {
  const typeColor = MemoryUtils.getTypeColor(memory.memory_type);
  const typeIcon = MemoryUtils.getTypeIcon(memory.memory_type);
  const relativeTime = MemoryUtils.getRelativeTime(memory.created_at);
  const truncatedContent = compact
    ? MemoryUtils.truncateContent(memory.content, 150)
    : memory.content;

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
        compact ? 'p-3' : 'p-4'
      }`}
      onClick={() => onSelect?.(memory)}
    >
      <CardHeader className={`${compact ? 'pb-2' : 'pb-3'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{typeIcon}</span>
            <Badge
              variant="secondary"
              style={{ backgroundColor: `${typeColor}20`, color: typeColor }}
              className="text-xs font-medium"
            >
              {memory.memory_type}
            </Badge>
            <span className="text-xs text-muted-foreground">{relativeTime}</span>
          </div>

          <div className="flex items-center gap-1">
            {memory.access_count > 0 && (
              <Badge variant="outline" className="text-xs">
                {memory.access_count} views
              </Badge>
            )}
            {memory.relevance_score !== 1.0 && (
              <Badge variant="outline" className="text-xs">
                {(memory.relevance_score * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={`${compact ? 'pt-0' : 'pt-1'}`}>
        <div className="space-y-3">
          {/* Content */}
          <p className={`text-sm ${compact ? 'line-clamp-3' : ''}`}>{truncatedContent}</p>

          {/* Tags */}
          {memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {memory.tags.slice(0, compact ? 3 : undefined).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {compact && memory.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{memory.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Metadata */}
          {!compact && Object.keys(memory.metadata).length > 0 && (
            <div className="text-xs text-muted-foreground">
              <details className="cursor-pointer">
                <summary>Metadata ({Object.keys(memory.metadata).length} items)</summary>
                <div className="mt-2 space-y-1">
                  {Object.entries(memory.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {/* Actions */}
          {(onEdit || onDelete) && (
            <div className="flex justify-end gap-2 pt-2 border-t">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(memory);
                  }}
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(memory);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
