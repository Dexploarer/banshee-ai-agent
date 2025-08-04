import React from 'react';
import { MemoryUtils } from '../../lib/ai/memory/client';
import type { MemoryFilter as MemoryFilterType, MemoryType } from '../../lib/ai/memory/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';

interface MemoryFilterProps {
  filter: MemoryFilterType;
  onFilterChange: (filter: MemoryFilterType) => void;
  availableTags: string[];
  onClose?: () => void;
}

const MEMORY_TYPES = Object.values(MemoryType);

export function MemoryFilter({
  filter,
  onFilterChange,
  availableTags,
  onClose,
}: MemoryFilterProps) {
  const toggleType = (type: MemoryType) => {
    const newTypes = filter.types.includes(type)
      ? filter.types.filter((t) => t !== type)
      : [...filter.types, type];

    onFilterChange({ ...filter, types: newTypes });
  };

  const toggleTag = (tag: string) => {
    const newTags = filter.tags.includes(tag)
      ? filter.tags.filter((t) => t !== tag)
      : [...filter.tags, tag];

    onFilterChange({ ...filter, tags: newTags });
  };

  const clearFilters = () => {
    onFilterChange({
      types: [],
      tags: [],
      searchText: filter.searchText, // Keep search text
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Filters</h4>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Memory Types */}
        <div>
          <h5 className="text-sm font-medium mb-2">Memory Types</h5>
          <div className="flex flex-wrap gap-2">
            {MEMORY_TYPES.map((type) => {
              const isSelected = filter.types.includes(type);
              const typeColor = MemoryUtils.getTypeColor(type);
              const typeIcon = MemoryUtils.getTypeIcon(type);

              return (
                <Badge
                  key={type}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-opacity-20 text-current border-current' : 'hover:bg-opacity-10'
                  }`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `${typeColor}20`,
                          color: typeColor,
                          borderColor: typeColor,
                        }
                      : {}
                  }
                  onClick={() => toggleType(type)}
                >
                  <span className="mr-1">{typeIcon}</span>
                  {type}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        {availableTags.length > 0 && (
          <div>
            <h5 className="text-sm font-medium mb-2">Tags</h5>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {availableTags.map((tag) => {
                const isSelected = filter.tags.includes(tag);

                return (
                  <Badge
                    key={tag}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Date Range - Future Enhancement */}
        {/* 
        <div>
          <h5 className="text-sm font-medium mb-2">Date Range</h5>
          <div className="flex gap-2">
            <Input type="date" placeholder="From" />
            <Input type="date" placeholder="To" />
          </div>
        </div>
        */}

        {/* Active Filter Summary */}
        {(filter.types.length > 0 || filter.tags.length > 0) && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              {filter.types.length + filter.tags.length} filters active
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
