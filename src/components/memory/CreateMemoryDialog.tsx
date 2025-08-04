import type React from 'react';
import { useState } from 'react';
import { MemoryUtils } from '../../lib/ai/memory/client';
import { MemoryType } from '../../lib/ai/memory/types';
import type { CreateMemoryRequest } from '../../lib/ai/memory/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Select } from '../ui/select';
import { Textarea } from '../ui/textarea';

interface CreateMemoryDialogProps {
  agentId: string;
  onCreateMemory: (request: CreateMemoryRequest) => Promise<string>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MEMORY_TYPES = Object.values(MemoryType);

export function CreateMemoryDialog({
  agentId,
  onCreateMemory,
  trigger,
  open,
  onOpenChange,
}: CreateMemoryDialogProps) {
  const [formData, setFormData] = useState<Partial<CreateMemoryRequest>>({
    agent_id: agentId,
    memory_type: MemoryType.Context,
    content: '',
    tags: [],
    metadata: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [newMetadataKey, setNewMetadataKey] = useState('');
  const [newMetadataValue, setNewMetadataValue] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content?.trim()) {
      setError('Content is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onCreateMemory({
        agent_id: agentId,
        memory_type: formData.memory_type!,
        content: formData.content.trim(),
        tags: formData.tags || [],
        metadata: formData.metadata || {},
      });

      // Reset form
      setFormData({
        agent_id: agentId,
        memory_type: MemoryType.Context,
        content: '',
        tags: [],
        metadata: {},
      });
      setNewTag('');
      setNewMetadataKey('');
      setNewMetadataValue('');

      onOpenChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create memory');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  const addMetadata = () => {
    if (newMetadataKey.trim() && newMetadataValue.trim()) {
      setFormData((prev) => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          [newMetadataKey.trim()]: newMetadataValue.trim(),
        },
      }));
      setNewMetadataKey('');
      setNewMetadataValue('');
    }
  };

  const removeMetadata = (keyToRemove: string) => {
    setFormData((prev) => {
      const newMetadata = { ...prev.metadata };
      delete newMetadata[keyToRemove];
      return { ...prev, metadata: newMetadata };
    });
  };

  const dialogContent = (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Create New Memory</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Memory Type */}
        <div className="space-y-2">
          <Label htmlFor="memory-type">Memory Type</Label>
          <Select
            value={formData.memory_type || ''}
            onValueChange={(value: string) =>
              setFormData((prev) => ({ ...prev, memory_type: value as MemoryType }))
            }
          >
            {MEMORY_TYPES.map((type) => (
              <option key={type} value={type}>
                {MemoryUtils.getTypeIcon(type)} {type}
              </option>
            ))}
          </Select>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="memory-content">Content *</Label>
          <Textarea
            id="memory-content"
            placeholder="Enter the memory content..."
            value={formData.content}
            onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
            rows={4}
            required
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Add a tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" onClick={addTag} variant="outline">
              Add
            </Button>
          </div>
          {formData.tags && formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeTag(tag)}
                >
                  #{tag} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <Label>Metadata</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Key"
              value={newMetadataKey}
              onChange={(e) => setNewMetadataKey(e.target.value)}
            />
            <div className="flex gap-2">
              <Input
                placeholder="Value"
                value={newMetadataValue}
                onChange={(e) => setNewMetadataValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addMetadata();
                  }
                }}
              />
              <Button type="button" onClick={addMetadata} variant="outline">
                Add
              </Button>
            </div>
          </div>
          {formData.metadata && Object.keys(formData.metadata).length > 0 && (
            <div className="space-y-1">
              {Object.entries(formData.metadata).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span className="text-sm">
                    <strong>{key}:</strong> {value}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMetadata(key)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.content?.trim()}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating...
              </>
            ) : (
              'Create Memory'
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open || false} onOpenChange={onOpenChange || (() => {})}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open || false} onOpenChange={onOpenChange || (() => {})}>
      {dialogContent}
    </Dialog>
  );
}
