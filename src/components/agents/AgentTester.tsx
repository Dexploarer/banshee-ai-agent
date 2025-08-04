import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import type { DbAgent } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Bot, Play, RotateCcw, Send, TestTube, User } from 'lucide-react';
import { useState } from 'react';

interface AgentTesterProps {
  agent: DbAgent;
}

interface TestMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const TEST_SCENARIOS = [
  {
    id: 'greeting',
    name: 'Greeting & Introduction',
    description: 'Test how the agent introduces itself',
    prompts: [
      'Hello! Who are you?',
      'What can you help me with?',
      'Tell me about your capabilities',
    ],
  },
  {
    id: 'expertise',
    name: 'Domain Expertise',
    description: "Test agent's specialized knowledge",
    prompts: [
      'What is your area of expertise?',
      'Can you help me with [domain-specific task]?',
      'Explain [complex topic] in simple terms',
    ],
  },
  {
    id: 'problem-solving',
    name: 'Problem Solving',
    description: 'Test reasoning and analytical skills',
    prompts: [
      'I have a problem: [describe complex issue]',
      'What steps would you take to solve this?',
      'Can you break this down step by step?',
    ],
  },
  {
    id: 'edge-cases',
    name: 'Edge Cases',
    description: 'Test handling of unusual requests',
    prompts: [
      "I don't know what I need help with",
      "Can you do something you're not designed for?",
      'What are your limitations?',
    ],
  },
];

export function AgentTester({ agent }: AgentTesterProps) {
  // Validate agent object has required properties
  if (!agent || !agent.name || !agent.character_role || !agent.description) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p>
          Invalid agent configuration. Please ensure the agent has a name, character role, and
          description.
        </p>
      </div>
    );
  }

  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: TestMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI response (in real implementation, this would call the AI service)
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

      const assistantMessage: TestMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: generateMockResponse(content, agent),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get response:', error);
      const errorMessage: TestMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockResponse = (userInput: string, agent: DbAgent): string => {
    // This is a mock response generator for testing purposes
    // In real implementation, this would use the actual AI service
    const responses = {
      greeting: [
        `Hello! I'm ${agent.name}, ${agent.description}. I'm here to help you with ${agent.character_role}-related tasks.`,
        `Hi there! I'm your ${agent.character_role} assistant. What can I help you with today?`,
      ],
      capabilities: [
        `I specialize in ${agent.character_role} tasks. My key capabilities include helping with analysis, problem-solving, and providing expert guidance in my domain.`,
        `I can help you with a variety of ${agent.character_role} related tasks. Feel free to ask me anything within my expertise!`,
      ],
      default: [
        `As a ${agent.character_role}, I'd be happy to help with that. Let me think about this step by step...`,
        `That's an interesting question. Based on my ${agent.character_role} expertise, here's what I think...`,
        `I understand you're asking about this topic. From my perspective as a ${agent.character_role}, I would approach this by...`,
      ],
    };

    const lowerInput = userInput.toLowerCase();

    if (
      lowerInput.includes('hello') ||
      lowerInput.includes('hi') ||
      lowerInput.includes('who are you')
    ) {
      const index = Math.floor(Math.random() * responses.greeting.length);
      return responses.greeting[index]!;
    }
    if (
      lowerInput.includes('what can you') ||
      lowerInput.includes('capabilities') ||
      lowerInput.includes('help me with')
    ) {
      const index = Math.floor(Math.random() * responses.capabilities.length);
      return responses.capabilities[index]!;
    }
    const index = Math.floor(Math.random() * responses.default.length);
    return responses.default[index]!;
  };

  const runScenario = (scenario: (typeof TEST_SCENARIOS)[0]) => {
    setSelectedScenario(scenario.id);

    // Add system message explaining the test
    const systemMessage: TestMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `Testing scenario: ${scenario.name} - ${scenario.description}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, systemMessage]);

    // Send the first prompt
    if (scenario.prompts.length > 0) {
      const firstPrompt = scenario.prompts[0];
      if (firstPrompt && typeof firstPrompt === 'string' && firstPrompt.trim().length > 0) {
        sendMessage(firstPrompt);
      }
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setSelectedScenario(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Agent Testing Sandbox
          </CardTitle>
          <CardDescription>
            Test your agent's responses and behavior in a safe environment
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Test Scenarios */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Test Scenarios</h3>
            <Button size="sm" variant="outline" onClick={clearConversation}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </div>

          <div className="space-y-2">
            {TEST_SCENARIOS.map((scenario) => (
              <Card
                key={scenario.id}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-accent',
                  selectedScenario === scenario.id && 'ring-2 ring-primary bg-accent'
                )}
                onClick={() => runScenario(scenario)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="w-4 h-4" />
                    <span className="font-medium text-sm">{scenario.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{scenario.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Agent Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Agent Info</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground">Name</div>
                <div className="text-sm">{agent.name}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Role</div>
                <div className="text-sm capitalize">{agent.character_role}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Model</div>
                <div className="text-sm">{agent.model_id}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">Temperature</div>
                <div className="text-sm">{agent.temperature}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Test Conversation
              </CardTitle>
              <CardDescription>
                {agent.name} • {agent.character_role}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <Bot className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <h3 className="font-medium mb-2">Start Testing</h3>
                      <p className="text-sm text-muted-foreground">
                        Choose a test scenario or send a custom message to begin
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : message.role === 'system'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-secondary text-secondary-foreground'
                        )}
                      >
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : message.role === 'system' ? (
                          <TestTube className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>

                      <div
                        className={cn('flex-1 min-w-0', message.role === 'user' && 'text-right')}
                      >
                        <div
                          className={cn(
                            'inline-block max-w-[80%] p-3 rounded-lg text-sm',
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : message.role === 'system'
                                ? 'bg-muted text-muted-foreground border'
                                : 'bg-secondary text-secondary-foreground'
                          )}
                        >
                          {message.content}
                        </div>
                        <div
                          className={cn(
                            'text-xs text-muted-foreground mt-1',
                            message.role === 'user' ? 'text-right' : 'text-left'
                          )}
                        >
                          {formatTime(message.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-secondary p-3 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-100" />
                          <div className="w-2 h-2 bg-current rounded-full animate-pulse delay-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2 pt-4 border-t">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your test message..."
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                />
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
