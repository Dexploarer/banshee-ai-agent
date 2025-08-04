import { useState } from 'react';
import { useAgentMemory, useMemoryBackup } from '../../lib/ai/memory/hooks';
import type { AgentMemory, CreateMemoryRequest } from '../../lib/ai/memory/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CreateMemoryDialog } from './CreateMemoryDialog';
import { MemoryCard } from './MemoryCard';
import { MemoryList } from './MemoryList';

interface MemoryDashboardProps {
  agentId: string;
  agentName?: string;
}

export function MemoryDashboard({ agentId, agentName }: MemoryDashboardProps) {
  const { memories, loading, error, createMemory, refreshMemories } = useAgentMemory(agentId);

  const { backupMemories, loading: backupLoading, error: backupError } = useMemoryBackup();

  const [selectedMemory, setSelectedMemory] = useState<AgentMemory | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleCreateMemory = async (request: CreateMemoryRequest) => {
    const memoryId = await createMemory(request);
    return memoryId;
  };

  const handleBackupMemories = async () => {
    try {
      const backupPath = await backupMemories(agentId, `${agentName || agentId}_backup`);
      // Show success message or notification
      console.log('Backup created:', backupPath);
    } catch (err) {
      console.error('Backup failed:', err);
    }
  };

  const handleMemorySelect = (memory: AgentMemory) => {
    setSelectedMemory(memory);
    setActiveTab('detail');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Agent Memory</h2>
          <p className="text-muted-foreground">
            {agentName ? `Managing memories for ${agentName}` : `Agent ID: ${agentId}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleBackupMemories}
            disabled={backupLoading || memories.length === 0}
          >
            {backupLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Backing up...
              </>
            ) : (
              'Backup Memories'
            )}
          </Button>

          <CreateMemoryDialog
            agentId={agentId}
            onCreateMemory={handleCreateMemory}
            trigger={<Button>+ New Memory</Button>}
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
          />
        </div>
      </div>

      {/* Error Messages */}
      {(error || backupError) && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
          {error || backupError}
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            All Memories
            {memories.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {memories.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="important">Important</TabsTrigger>
          {selectedMemory && <TabsTrigger value="detail">Memory Detail</TabsTrigger>}
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <MemoryList
            memories={memories}
            loading={loading}
            error={error}
            onMemorySelect={handleMemorySelect}
            onRefresh={refreshMemories}
            showFilters={true}
            showStats={true}
          />
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          <MemoryList
            memories={memories
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 20)}
            loading={loading}
            error={error}
            onMemorySelect={handleMemorySelect}
            onRefresh={refreshMemories}
            showFilters={false}
            showStats={false}
            compact={true}
          />
        </TabsContent>

        <TabsContent value="important" className="mt-6">
          <MemoryList
            memories={memories
              .filter((memory) => memory.relevance_score > 0.8 || memory.access_count > 5)
              .sort((a, b) => b.relevance_score - a.relevance_score)}
            loading={loading}
            error={error}
            onMemorySelect={handleMemorySelect}
            onRefresh={refreshMemories}
            showFilters={false}
            showStats={false}
          />
        </TabsContent>

        {selectedMemory && (
          <TabsContent value="detail" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Memory Details */}
              <div>
                <MemoryCard 
                  memory={selectedMemory} 
                  compact={false}
                  onSelect={handleMemorySelect}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </div>

              {/* Related Memories */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Memories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {memories
                      .filter(
                        (m) =>
                          m.id !== selectedMemory.id &&
                          (m.memory_type === selectedMemory.memory_type ||
                            m.tags.some((tag) => selectedMemory.tags.includes(tag)))
                      )
                      .slice(0, 5)
                      .map((memory) => (
                        <div
                          key={memory.id}
                          className="p-3 border rounded cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedMemory(memory)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setSelectedMemory(memory);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {memory.memory_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(memory.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2">{memory.content}</p>
                        </div>
                      ))}
                    {memories.filter(
                      (m) =>
                        m.id !== selectedMemory.id &&
                        (m.memory_type === selectedMemory.memory_type ||
                          m.tags.some((tag) => selectedMemory.tags.includes(tag)))
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No related memories found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
