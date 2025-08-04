import { AgentBuilder } from '@/components/agents/AgentBuilder';
import { AgentTester } from '@/components/agents/AgentTester';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { WorkspaceSidebar } from '@/components/workspace/WorkspaceSidebar';
import { type WorkspaceTab, WorkspaceTabs } from '@/components/workspace/WorkspaceTabs';
import { deleteAgent, getAgents, saveAgent } from '@/lib/database';
import type { DbAgent } from '@/lib/database';
import { BarChart3, Bot, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export function WorkspacePortal() {
  // State management
  const [agents, setAgents] = useState<DbAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<DbAgent | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('build');
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const agentList = await getAgents();
      setAgents(agentList);

      // Auto-select first agent if available
      if (agentList.length > 0 && !selectedAgent) {
        setSelectedAgent(agentList[0] || null);
      }
    } catch (error) {
      console.error('Failed to load workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agent handlers
  const handleAgentCreate = () => {
    setSelectedAgent(null);
    setActiveTab('build');
  };

  const handleAgentSelect = (agent: DbAgent) => {
    setSelectedAgent(agent);
  };

  const handleAgentEdit = (agent: DbAgent) => {
    setSelectedAgent(agent);
    setActiveTab('build');
  };

  const handleAgentSave = async (agent: DbAgent) => {
    try {
      const savedAgent = await saveAgent({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        system_prompt: agent.system_prompt,
        character_role: agent.character_role,
        model_id: agent.model_id,
        provider_id: agent.provider_id,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        tools: agent.tools,
      });

      // Update agents list
      setAgents((prev) => {
        const existing = prev.find((a) => a.id === savedAgent.id);
        if (existing) {
          return prev.map((a) => (a.id === savedAgent.id ? savedAgent : a));
        }
        return [...prev, savedAgent];
      });

      setSelectedAgent(savedAgent);
    } catch (error) {
      console.error('Failed to save agent:', error);
    }
  };

  const handleAgentDelete = async (agent: DbAgent) => {
    if (!window.confirm(`Are you sure you want to delete "${agent.name}"?`)) return;

    try {
      await deleteAgent(agent.id);
      setAgents((prev) => prev.filter((a) => a.id !== agent.id));

      // Clear selections if deleted agent was selected
      if (selectedAgent?.id === agent.id) {
        setSelectedAgent(agents.find((a) => a.id !== agent.id) || null);
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  // Tab change handler
  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <WorkspaceSidebar
        agents={agents}
        selectedAgent={selectedAgent}
        onAgentSelect={handleAgentSelect}
        onAgentCreate={handleAgentCreate}
        onAgentEdit={handleAgentEdit}
        onAgentDelete={handleAgentDelete}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab Navigation */}
        <WorkspaceTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hasActiveAgent={!!selectedAgent}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} className="h-full">
            {/* Agent Builder Tab */}
            <TabsContent value="build" className="h-full m-0 p-6">
              <div className="h-full overflow-auto">
                <AgentBuilder
                  agent={selectedAgent ?? (undefined as any)}
                  onSave={handleAgentSave}
                  onCancel={() => {
                    if (agents.length > 0) {
                      setSelectedAgent(agents[0] || null);
                    }
                  }}
                  onDelete={(agentId: string) => {
                    const agent = agents.find((a) => a.id === agentId);
                    if (agent) {
                      handleAgentDelete(agent);
                    }
                  }}
                />
              </div>
            </TabsContent>

            {/* Test Lab Tab */}
            <TabsContent value="test" className="h-full m-0 p-6">
              {selectedAgent ? (
                <div className="h-full overflow-auto">
                  <AgentTester agent={selectedAgent} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Card className="p-8 text-center">
                    <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">No Agent Selected</h3>
                    <p className="text-muted-foreground">
                      Select an agent from the sidebar to test its behavior
                    </p>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="h-full m-0 p-6">
              <div className="flex items-center justify-center h-full">
                <Card className="p-8 text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground mb-4">
                    Coming soon: Usage metrics, performance insights, and conversation analytics
                  </p>
                  <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    Under Development
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
