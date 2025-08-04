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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { DbAgent, DbKnowledgeBase } from '@/lib/database';
import { deleteAgent, getAgentKnowledgeBases, saveAgent } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Bot, Brain, Code, Database, Settings, TestTube, Trash2, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AgentTester } from './AgentTester';
import { KnowledgeBaseManager } from './KnowledgeBaseManager';
import { SystemPromptEditor } from './SystemPromptEditor';

interface AgentBuilderProps {
  agent?: DbAgent;
  onSave?: (agent: DbAgent) => void;
  onCancel?: () => void;
  onDelete?: (agentId: string) => void;
}

const CHARACTER_ROLES = [
  {
    id: 'assistant',
    name: 'AI Assistant',
    description: 'General purpose helpful assistant',
    icon: Bot,
  },
  {
    id: 'analyst',
    name: 'Data Analyst',
    description: 'Specialized in data analysis and insights',
    icon: Brain,
  },
  {
    id: 'developer',
    name: 'Software Developer',
    description: 'Code generation and programming help',
    icon: Code,
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Information gathering and research',
    icon: Database,
  },
  {
    id: 'creative',
    name: 'Creative Writer',
    description: 'Content creation and storytelling',
    icon: User,
  },
  {
    id: 'technical',
    name: 'Technical Expert',
    description: 'Technical documentation and explanations',
    icon: Settings,
  },
];

const PROVIDER_MODELS = {
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  ],
  google: [
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
};

const AVAILABLE_TOOLS = [
  { id: 'web-search', name: 'Web Search', description: 'Search the internet for information' },
  { id: 'file-operations', name: 'File Operations', description: 'Read, write, and manage files' },
  { id: 'code-execution', name: 'Code Execution', description: 'Run Python and JavaScript code' },
  { id: 'image-analysis', name: 'Image Analysis', description: 'Analyze and describe images' },
  { id: 'data-visualization', name: 'Data Visualization', description: 'Create charts and graphs' },
];

export function AgentBuilder({ agent, onSave, onCancel, onDelete }: AgentBuilderProps) {
  const [formData, setFormData] = useState<Partial<DbAgent>>({
    name: '',
    description: '',
    system_prompt: '',
    character_role: 'assistant',
    model_id: 'claude-3-5-sonnet-20241022',
    provider_id: 'anthropic',
    temperature: 0.7,
    max_tokens: 4000,
    tools: JSON.stringify([]),
    ...agent,
  });

  const [knowledgeBases, setKnowledgeBases] = useState<DbKnowledgeBase[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('basic');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Parse tools from JSON string
    if (formData.tools) {
      try {
        const tools = JSON.parse(formData.tools);
        setSelectedTools(Array.isArray(tools) ? tools : []);
      } catch {
        setSelectedTools([]);
      }
    }

    // Load knowledge bases if editing existing agent
    if (agent?.id) {
      loadKnowledgeBases();
    }
  }, [agent?.id, formData.tools]);

  const loadKnowledgeBases = async () => {
    if (!agent?.id) return;
    try {
      const kbs = await getAgentKnowledgeBases(agent.id);
      setKnowledgeBases(kbs);
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.system_prompt) {
      return;
    }

    setIsSaving(true);
    try {
      const agentData: Omit<DbAgent, 'created_at' | 'updated_at'> = {
        id: formData.id || crypto.randomUUID(),
        name: formData.name,
        description: formData.description || '',
        system_prompt: formData.system_prompt,
        character_role: formData.character_role || 'assistant',
        model_id: formData.model_id || 'claude-3-5-sonnet-20241022',
        provider_id: formData.provider_id || 'anthropic',
        temperature: formData.temperature || 0.7,
        max_tokens: formData.max_tokens || 4000,
        tools: JSON.stringify(selectedTools),
      };

      const savedAgent = await saveAgent(agentData);
      onSave?.(savedAgent);
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!agent?.id) return;
    if (!window.confirm('Are you sure you want to delete this agent?')) return;

    try {
      await deleteAgent(agent.id);
      onDelete?.(agent.id);
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleToolToggle = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((t) => t !== toolId) : [...prev, toolId]
    );
  };

  const selectedRole = CHARACTER_ROLES.find((role) => role.id === formData.character_role);
  const IconComponent = selectedRole?.icon || Bot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <IconComponent className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{agent ? 'Edit Agent' : 'Create New Agent'}</h2>
            <p className="text-muted-foreground">
              {agent
                ? 'Modify your AI agent configuration'
                : 'Build a custom AI agent with specialized capabilities'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {agent && (
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.name || !formData.system_prompt}
          >
            {isSaving ? 'Saving...' : 'Save Agent'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="prompt" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            System Prompt
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Knowledge Base
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test Agent
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Information</CardTitle>
              <CardDescription>
                Configure the basic details and personality of your agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Research Assistant, Code Helper, Data Analyst"
                  value={formData.name || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of what this agent does and its capabilities"
                  value={formData.description || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Character Role</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CHARACTER_ROLES.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <Card
                        key={role.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-accent',
                          formData.character_role === role.id && 'ring-2 ring-primary bg-accent'
                        )}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, character_role: role.id }))
                        }
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <RoleIcon className="w-4 h-4" />
                            <span className="font-medium text-sm">{role.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Prompt Tab */}
        <TabsContent value="prompt" className="space-y-6">
          <SystemPromptEditor
            value={formData.system_prompt || ''}
            onChange={(value) => setFormData((prev) => ({ ...prev, system_prompt: value }))}
            characterRole={formData.character_role || 'assistant'}
          />
        </TabsContent>

        {/* Knowledge Base Tab */}
        <TabsContent value="knowledge" className="space-y-6">
          <KnowledgeBaseManager
            agentId={formData.id ?? ''}
            knowledgeBases={knowledgeBases}
            onKnowledgeBasesChange={setKnowledgeBases}
          />
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Model Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Model Settings</CardTitle>
                <CardDescription>Choose the AI model and provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={formData.provider_id ?? 'anthropic'}
                    onValueChange={(value) => {
                      const firstModel =
                        PROVIDER_MODELS[value as keyof typeof PROVIDER_MODELS]?.[0]?.id;
                      setFormData((prev) => ({
                        ...prev,
                        provider_id: value,
                        model_id: firstModel ?? prev.model_id ?? 'claude-3-5-sonnet-20241022',
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={formData.model_id ?? 'claude-3-5-sonnet-20241022'}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, model_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_MODELS[formData.provider_id as keyof typeof PROVIDER_MODELS]?.map(
                        (model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Temperature: {formData.temperature}</Label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature || 0.7}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        temperature: Number.parseFloat(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Focused</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-tokens">Max Tokens</Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    min="100"
                    max="32000"
                    value={formData.max_tokens || 4000}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        max_tokens: Number.parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Tools Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Available Tools</CardTitle>
                <CardDescription>Select tools your agent can use</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {AVAILABLE_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-accent w-full text-left"
                    onClick={() => handleToolToggle(tool.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => handleToolToggle(tool.id)}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{tool.name}</div>
                      <div className="text-xs text-muted-foreground">{tool.description}</div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test Agent Tab */}
        <TabsContent value="test" className="space-y-6">
          <AgentTester agent={formData as DbAgent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
