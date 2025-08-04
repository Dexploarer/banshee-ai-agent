import React, { useState } from 'react';
import { MemoryUtils } from '../../lib/ai/memory/client';
import { useFilteredMemories, useMemoryStats } from '../../lib/ai/memory/hooks';
import type {
  AgentMemory,
  MemoryFilter as MemoryFilterType,
} from '../../lib/ai/memory/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Select } from '../ui/select';
import { MemoryCard } from './MemoryCard';
import { MemoryFilter } from './MemoryFilter';
import { MemoryStats } from './MemoryStats';

interface MemoryListProps {
  memories: AgentMemory[];
  loading?: boolean;
  error?: string | null;
  onMemorySelect?: (memory: AgentMemory) => void;
  onMemoryEdit?: (memory: AgentMemory) => void;
  onMemoryDelete?: (memory: AgentMemory) => void;
  onRefresh?: () => void;
  showFilters?: boolean;
  showStats?: boolean;
  compact?: boolean;
}

type SortOption = 'relevance' | 'date-desc' | 'date-asc' | 'access';

export function MemoryList({
  memories,
  loading = false,
  error = null,
  onMemorySelect,
  onMemoryEdit,
  onMemoryDelete,
  onRefresh,
  showFilters = true,
  showStats = true,
  compact = false,
}: MemoryListProps) {
  const [filter, setFilter] = useState<MemoryFilterType>({
    types: [],
    tags: [],
    searchText: '',
  });
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const filteredMemories = useFilteredMemories(memories, filter);
  const stats = useMemoryStats(memories);

  // Apply sorting
  const sortedMemories = React.useMemo(() => {
    switch (sortBy) {
      case 'relevance':
        return MemoryUtils.sortByRelevance(filteredMemories);
      case 'date-asc':
        return MemoryUtils.sortByDate(filteredMemories, true);
      case 'date-desc':
        return MemoryUtils.sortByDate(filteredMemories, false);
      case 'access':
        return MemoryUtils.sortByAccessCount(filteredMemories);
      default:
        return filteredMemories;
    }
  }, [filteredMemories, sortBy]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-destructive mb-2">⚠️ Error loading memories</div>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Memories ({filteredMemories.length})</h3>
          {loading && <LoadingSpinner size="sm" />}
        </div>

        <div className="flex items-center gap-2">
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            >
              Filters{' '}
              {filter.types.length + filter.tags.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filter.types.length + filter.tags.length}
                </Badge>
              )}
            </Button>
          )}

          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {showStats && !compact && <MemoryStats stats={stats} />}

      {/* Filters Panel */}
      {showFiltersPanel && showFilters && (
        <MemoryFilter
          filter={filter}
          onFilterChange={setFilter}
          availableTags={stats.uniqueTags}
          onClose={() => setShowFiltersPanel(false)}
        />
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="flex-1">
          <Input
            placeholder="Search memories..."
            value={filter.searchText}
            onChange={(e) => setFilter((prev) => ({ ...prev, searchText: e.target.value }))}
            className="w-full"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(value: string) => setSortBy(value as SortOption)}>
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="relevance">Most Relevant</option>
          <option value="access">Most Accessed</option>
        </Select>
      </div>

      {/* Active Filters */}
      {(filter.types.length > 0 || filter.tags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {filter.types.map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="cursor-pointer"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  types: prev.types.filter((t) => t !== type),
                }))
              }
            >
              {MemoryUtils.getTypeIcon(type)} {type} ×
            </Badge>
          ))}
          {filter.tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer"
              onClick={() =>
                setFilter((prev) => ({
                  ...prev,
                  tags: prev.tags.filter((t) => t !== tag),
                }))
              }
            >
              #{tag} ×
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilter({ types: [], tags: [], searchText: filter.searchText })}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Memory List */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {sortedMemories.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-center">
            <div className="text-4xl mb-2">🧠</div>
            <h4 className="text-lg font-semibold mb-2">No memories found</h4>
            <p className="text-sm text-muted-foreground">
              {memories.length === 0
                ? 'No memories have been created yet.'
                : 'Try adjusting your filters or search terms.'}
            </p>
          </div>
        ) : (
          sortedMemories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              onSelect={onMemorySelect}
              onEdit={onMemoryEdit}
              onDelete={onMemoryDelete}
              compact={compact}
            />
          ))
        )}
      </div>

      {/* Load More */}
      {loading && sortedMemories.length > 0 && (
        <div className="flex justify-center p-4">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
}
