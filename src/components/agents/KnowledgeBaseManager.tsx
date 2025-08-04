import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DbKnowledgeBase, DbKnowledgeItem } from '@/lib/database';
import {
  deleteKnowledgeBase,
  deleteKnowledgeItem,
  getKnowledgeItems,
  linkAgentToKnowledgeBase,
  saveKnowledgeBase,
  saveKnowledgeItem,
  unlinkAgentFromKnowledgeBase,
} from '@/lib/database';
import { cn } from '@/lib/utils';
import { Database, FileText, Globe, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface KnowledgeBaseManagerProps {
  agentId?: string;
  knowledgeBases: DbKnowledgeBase[];
  onKnowledgeBasesChange: (kbs: DbKnowledgeBase[]) => void;
}

interface FileUploadState {
  isDragging: boolean;
  isUploading: boolean;
  progress: number;
}

export function KnowledgeBaseManager({
  agentId,
  knowledgeBases,
  onKnowledgeBasesChange,
}: KnowledgeBaseManagerProps) {
  const [selectedKB, setSelectedKB] = useState<DbKnowledgeBase | null>(null);
  const [knowledgeItems, setKnowledgeItems] = useState<DbKnowledgeItem[]>([]);
  const [showCreateKB, setShowCreateKB] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fileUpload, setFileUpload] = useState<FileUploadState>({
    isDragging: false,
    isUploading: false,
    progress: 0,
  });

  // New KB form state
  const [newKB, setNewKB] = useState({
    name: '',
    description: '',
    type: 'files' as 'files' | 'text' | 'web' | 'mixed',
  });

  // New item form state
  const [newItem, setNewItem] = useState({
    title: '',
    content: '',
    content_type: 'text',
    url: '',
  });

  useEffect(() => {
    if (selectedKB) {
      loadKnowledgeItems();
    }
  }, [selectedKB]);

  const loadKnowledgeItems = async () => {
    if (!selectedKB) return;
    try {
      const items = await getKnowledgeItems(selectedKB.id);
      setKnowledgeItems(items);
    } catch (error) {
      console.error('Failed to load knowledge items:', error);
    }
  };

  const handleCreateKB = async () => {
    if (!newKB.name) return;

    try {
      const kb = await saveKnowledgeBase({
        id: crypto.randomUUID(),
        name: newKB.name,
        description: newKB.description,
        type: newKB.type,
        settings: JSON.stringify({}),
      });

      // Link to agent if provided
      if (agentId) {
        await linkAgentToKnowledgeBase(agentId, kb.id);
      }

      onKnowledgeBasesChange([...knowledgeBases, kb]);
      setNewKB({ name: '', description: '', type: 'files' });
      setShowCreateKB(false);
    } catch (error) {
      console.error('Failed to create knowledge base:', error);
    }
  };

  const handleDeleteKB = async (kbId: string) => {
    if (!window.confirm('Are you sure? This will delete all knowledge items in this base.')) {
      return;
    }

    try {
      await deleteKnowledgeBase(kbId);

      // Unlink from agent if provided
      if (agentId) {
        await unlinkAgentFromKnowledgeBase(agentId, kbId);
      }

      onKnowledgeBasesChange(knowledgeBases.filter((kb) => kb.id !== kbId));
      if (selectedKB?.id === kbId) {
        setSelectedKB(null);
      }
    } catch (error) {
      console.error('Failed to delete knowledge base:', error);
    }
  };

  const handleAddTextItem = async () => {
    if (!selectedKB || !newItem.title || !newItem.content) return;

    try {
      const item = await saveKnowledgeItem({
        id: crypto.randomUUID(),
        knowledge_base_id: selectedKB.id,
        title: newItem.title,
        content: newItem.content,
        content_type: 'text',
        metadata: JSON.stringify({}),
      });

      setKnowledgeItems([...knowledgeItems, item]);
      setNewItem({ title: '', content: '', content_type: 'text', url: '' });
      setShowAddItem(false);
    } catch (error) {
      console.error('Failed to add knowledge item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteKnowledgeItem(itemId);
      setKnowledgeItems(knowledgeItems.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Failed to delete knowledge item:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFileUpload((prev) => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFileUpload((prev) => ({ ...prev, isDragging: false }));
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setFileUpload((prev) => ({ ...prev, isDragging: false }));

      if (!selectedKB) return;

      const files = Array.from(e.dataTransfer.files);

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          console.error(`File ${file.name} is too large (max 10MB)`);
          continue;
        }

        setFileUpload((prev) => ({ ...prev, isUploading: true, progress: 0 }));

        try {
          const content = await file.text();

          const item = await saveKnowledgeItem({
            id: crypto.randomUUID(),
            knowledge_base_id: selectedKB.id,
            title: file.name,
            content,
            content_type: 'file',
            file_path: file.name,
            file_size: file.size,
            metadata: JSON.stringify({
              originalName: file.name,
              mimeType: file.type,
              uploadedAt: new Date().toISOString(),
            }),
          });

          setKnowledgeItems((prev) => [...prev, item]);
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      setFileUpload((prev) => ({ ...prev, isUploading: false, progress: 0 }));
    },
    [selectedKB]
  );

  const filteredItems = knowledgeItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'files':
        return FileText;
      case 'web':
        return Globe;
      case 'mixed':
        return Database;
      default:
        return Database;
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'text':
        return 'bg-blue-500';
      case 'file':
        return 'bg-green-500';
      case 'url':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Knowledge Base Manager
              </CardTitle>
              <CardDescription>
                Create and manage knowledge bases to enhance your agent's capabilities
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateKB(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Knowledge Base
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Knowledge Base List */}
        <div className="space-y-4">
          <h3 className="font-semibold">Available Knowledge Bases</h3>

          {knowledgeBases.length === 0 ? (
            <Card className="p-6 text-center">
              <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No knowledge bases yet. Create one to get started.
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {knowledgeBases.map((kb) => {
                const TypeIcon = getTypeIcon(kb.type);
                return (
                  <Card
                    key={kb.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-accent',
                      selectedKB?.id === kb.id && 'ring-2 ring-primary bg-accent'
                    )}
                    onClick={() => setSelectedKB(kb)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <TypeIcon className="w-4 h-4 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{kb.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {kb.type} • {new Date(kb.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteKB(kb.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Knowledge Items */}
        <div className="lg:col-span-2 space-y-4">
          {selectedKB ? (
            <>
              {/* Knowledge Base Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedKB.name}</CardTitle>
                      <CardDescription>{selectedKB.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setShowAddItem(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* File Upload Area */}
              <Card
                className={cn(
                  'border-2 border-dashed transition-colors',
                  fileUpload.isDragging && 'border-primary bg-primary/5'
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <CardContent className="p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <div className="text-lg font-medium mb-2">
                    {fileUpload.isUploading ? 'Uploading...' : 'Drop files here'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Supports: .txt, .md, .pdf, .docx (max 10MB each)
                  </div>
                  {fileUpload.isUploading && (
                    <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${fileUpload.progress}%` }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Knowledge Items List */}
              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? 'No items match your search.'
                        : 'No knowledge items yet. Add some content to get started.'}
                    </p>
                  </Card>
                ) : (
                  filteredItems.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full mt-2',
                                getContentTypeColor(item.content_type)
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {item.content.substring(0, 150)}
                                {item.content.length > 150 && '...'}
                              </div>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="capitalize">{item.content_type}</span>
                                {item.file_size && (
                                  <span>{(item.file_size / 1024).toFixed(1)} KB</span>
                                )}
                                <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          ) : (
            <Card className="p-8 text-center">
              <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Select a Knowledge Base</h3>
              <p className="text-muted-foreground">
                Choose a knowledge base from the left to view and manage its content
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Create Knowledge Base Modal */}
      {showCreateKB && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create Knowledge Base</CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowCreateKB(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kb-name">Name</Label>
                <Input
                  id="kb-name"
                  placeholder="e.g., Company Docs, Research Papers"
                  value={newKB.name}
                  onChange={(e) => setNewKB((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kb-description">Description</Label>
                <Textarea
                  id="kb-description"
                  placeholder="Brief description of this knowledge base"
                  value={newKB.description}
                  onChange={(e) => setNewKB((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newKB.type}
                  onValueChange={(value: string) => setNewKB((prev) => ({ ...prev, type: value as 'text' | 'files' | 'web' | 'mixed' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="files">Files</SelectItem>
                    <SelectItem value="text">Text Content</SelectItem>
                    <SelectItem value="web">Web Sources</SelectItem>
                    <SelectItem value="mixed">Mixed Content</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateKB(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleCreateKB} disabled={!newKB.name} className="flex-1">
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Knowledge Item</CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowAddItem(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="item-title">Title</Label>
                <Input
                  id="item-title"
                  placeholder="e.g., API Documentation, Meeting Notes"
                  value={newItem.title}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-content">Content</Label>
                <Textarea
                  id="item-content"
                  placeholder="Enter the knowledge content here..."
                  value={newItem.content}
                  onChange={(e) => setNewItem((prev) => ({ ...prev, content: e.target.value }))}
                  rows={6}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddItem(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleAddTextItem}
                  disabled={!newItem.title || !newItem.content}
                  className="flex-1"
                >
                  Add Item
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
