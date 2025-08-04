import { AgentBuilder } from '@/components/agents/AgentBuilder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { DbAgent } from '@/lib/database';
import { deleteAgent, getAgents } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Bot, Edit, Plus, Search, Settings, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type ViewMode = 'list' | 'create' | 'edit';

export function AgentsPortal() {
  const [agents, setAgents] = useState<DbAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<DbAgent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentList = await getAgents();
      setAgents(agentList);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = () => {
    setSelectedAgent(null);
    setViewMode('create');
  };

  const handleEditAgent = (agent: DbAgent) => {
    setSelectedAgent(agent);
    setViewMode('edit');
  };

  const handleSaveAgent = (agent: DbAgent) => {
    if (selectedAgent) {
      // Update existing agent
      setAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
    } else {
      // Add new agent
      setAgents((prev) => [...prev, agent]);
    }
    setViewMode('list');
    setSelectedAgent(null);
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      await deleteAgent(agentId);
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      if (selectedAgent?.id === agentId) {
        setSelectedAgent(null);
        setViewMode('list');
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedAgent(null);
  };

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.character_role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCharacterRoleColor = (role: string) => {
    const colors = {
      assistant: 'bg-blue-500',
      analyst: 'bg-green-500',
      developer: 'bg-orange-500',
      researcher: 'bg-purple-500',
      creative: 'bg-pink-500',
      technical: 'bg-indigo-500',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-500';
  };

  const getCharacterRoleIcon = (role: string) => {
    switch (role) {
      case 'assistant':
        return Bot;
      case 'developer':
        return Settings;
      default:
        return Bot;
    }
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <AgentBuilder
        agent={selectedAgent || (undefined as any)}
        onSave={handleSaveAgent}
        onCancel={handleCancel}
        onDelete={handleDeleteAgent}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">
            Create, customize, and manage your AI agents with specialized capabilities
          </p>
        </div>
        <Button onClick={handleCreateAgent}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Agents Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredAgents.length === 0 ? (
        <Card className="p-12 text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? 'No agents found' : 'No agents created yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? "Try adjusting your search terms to find the agent you're looking for."
              : 'Create your first AI agent to get started with specialized capabilities.'}
          </p>
          {!searchQuery && (
            <Button onClick={handleCreateAgent}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Agent
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => {
            const IconComponent = getCharacterRoleIcon(agent.character_role);
            const colorClass = getCharacterRoleColor(agent.character_role);

            return (
              <Card
                key={agent.id}
                className="cursor-pointer transition-colors hover:bg-accent group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-lg text-white',
                          colorClass
                        )}
                      >
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <p className="text-xs text-muted-foreground capitalize">
                          {agent.character_role}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditAgent(agent);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Are you sure you want to delete this agent?')) {
                            handleDeleteAgent(agent.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="line-clamp-2 mb-4">
                    {agent.description || 'No description provided'}
                  </CardDescription>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{agent.provider_id}</span>
                      <span>•</span>
                      <span>{agent.model_id.split('-')[0]}</span>
                    </div>
                    <div>{new Date(agent.updated_at).toLocaleDateString()}</div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <Button size="sm" className="w-full" onClick={() => handleEditAgent(agent)}>
                      <Edit className="mr-2 h-3 w-3" />
                      Configure Agent
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      {agents.length > 0 && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{agents.length}</div>
                  <div className="text-xs text-muted-foreground">Total Agents</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {new Set(agents.map((a) => a.character_role)).size}
                  </div>
                  <div className="text-xs text-muted-foreground">Role Types</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {new Set(agents.map((a) => a.provider_id)).size}
                  </div>
                  <div className="text-xs text-muted-foreground">Providers</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {
                      agents.filter((a) => {
                        try {
                          const tools = JSON.parse(a.tools);
                          return Array.isArray(tools) && tools.length > 0;
                        } catch {
                          return false;
                        }
                      }).length
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">With Tools</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
