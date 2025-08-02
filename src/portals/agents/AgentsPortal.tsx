import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquare, Play, Plus } from 'lucide-react';
import { useState } from 'react';

const agentTypes = [
  {
    id: 'assistant',
    name: 'AI Assistant',
    description: 'General purpose conversational agent',
    icon: Bot,
    color: 'bg-blue-500',
  },
  {
    id: 'fileManager',
    name: 'File Manager',
    description: 'Manages files and directories',
    icon: Bot,
    color: 'bg-green-500',
  },
  {
    id: 'webAgent',
    name: 'Web Agent',
    description: 'Fetches and processes web content',
    icon: Bot,
    color: 'bg-purple-500',
  },
  {
    id: 'developer',
    name: 'Developer Agent',
    description: 'Code analysis and development tasks',
    icon: Bot,
    color: 'bg-orange-500',
  },
];

export function AgentsPortal() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Agents</h1>
          <p className="text-muted-foreground">Manage and interact with your AI agents</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Agent Gallery */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Agents</h2>
          <div className="grid gap-4">
            {agentTypes.map((agent) => {
              const Icon = agent.icon;
              return (
                <Card
                  key={agent.id}
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedAgent === agent.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedAgent(agent.id)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${agent.color}`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      <Play className="mr-2 h-3 w-3" />
                      Start
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Agent Chat</h2>

          {selectedAgent ? (
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {agentTypes.find((a) => a.id === selectedAgent)?.name}
                </CardTitle>
                <CardDescription>Interactive conversation with your AI agent</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                {/* Chat Messages Area */}
                <div className="flex-1 rounded-lg border bg-muted/50 p-4">
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          Hello! I'm your{' '}
                          {agentTypes.find((a) => a.id === selectedAgent)?.name.toLowerCase()}. How
                          can I help you today?
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <Button>Send</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No Agent Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Choose an agent from the left to start a conversation
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
