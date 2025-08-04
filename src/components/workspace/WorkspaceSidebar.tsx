import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { DbAgent } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Bot, Folder, FolderOpen, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AgentCard } from './AgentCard';

interface WorkspaceSidebarProps {
  agents: DbAgent[];
  selectedAgent: DbAgent | null;
  onAgentSelect: (agent: DbAgent) => void;
  onAgentCreate: () => void;
  onAgentEdit: (agent: DbAgent) => void;
  onAgentDelete: (agent: DbAgent) => void;
  className?: string;
}

export function WorkspaceSidebar({
  agents,
  selectedAgent,
  onAgentSelect,
  onAgentCreate,
  onAgentEdit,
  onAgentDelete,
  className,
}: WorkspaceSidebarProps) {
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [showAgentSection, setShowAgentSection] = useState(true);

  // Filter agents based on search
  const filteredAgents = useMemo(() => {
    if (!agentSearchQuery) return agents;
    const query = agentSearchQuery.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query) ||
        agent.character_role.toLowerCase().includes(query)
    );
  }, [agents, agentSearchQuery]);

  return (
    <aside className={cn('w-80 border-r bg-card/30 flex flex-col', className)}>
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {/* Agents Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAgentSection(!showAgentSection)}
                className="flex items-center gap-2 p-0 h-auto font-semibold text-foreground"
              >
                {showAgentSection ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )}
                Agents ({agents.length})
              </Button>
              <Button size="sm" onClick={onAgentCreate} className="h-7 px-2">
                <Plus className="w-3 h-3 mr-1" />
                New
              </Button>
            </div>

            {showAgentSection && (
              <>
                {/* Agent Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search agents..."
                    value={agentSearchQuery}
                    onChange={(e) => setAgentSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>

                {/* Agent List */}
                <div className="space-y-2">
                  {filteredAgents.length > 0 ? (
                    filteredAgents.map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        isSelected={selectedAgent?.id === agent.id}
                        onSelect={onAgentSelect}
                        onEdit={onAgentEdit}
                        onDelete={onAgentDelete}
                        className="group"
                      />
                    ))
                  ) : (
                    <Card className="p-4 text-center bg-muted/50">
                      <Bot className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {agentSearchQuery ? 'No agents found' : 'No agents yet'}
                      </p>
                      {!agentSearchQuery && (
                        <Button size="sm" onClick={onAgentCreate} className="mt-2">
                          Create First Agent
                        </Button>
                      )}
                    </Card>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
