import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DbAgent, DbArtifact } from '@/lib/database';
import { getAgents, getMessages, saveMessage } from '@/lib/database';
import { cn } from '@/lib/utils';
import { sanitizeInput } from '@/lib/validation/schemas';
import { useAgentStore } from '@/store/agentStore';
import { Bot, Code, FileText, Paperclip, Send, Sparkles, StopCircle, User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArtifactManager } from '../artifacts/ArtifactManager';
import { MessageRenderer } from './MessageRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  artifacts?: DbArtifact[];
}

interface EnhancedChatInterfaceProps {
  conversationId?: string;
  agentId?: string;
  className?: string;
  onConversationUpdate?: () => void;
}

export function EnhancedChatInterface({
  conversationId,
  agentId,
  className,
  onConversationUpdate,
}: EnhancedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState('');
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<DbAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(agentId);
  const [attachments, setAttachments] = useState<File[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedAgent = useAgentStore((state) => {
    const session = state.getActiveSession();
    return session?.agent || null;
  });

  useEffect(() => {
    loadAvailableAgents();
  }, []);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadAvailableAgents = async () => {
    try {
      const agents = await getAgents();
      setAvailableAgents(agents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      const dbMessages = await getMessages(conversationId);
      const formattedMessages: Message[] = dbMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        tokens: msg.tokens,
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [conversationId]);

  const validateInput = (input: string): boolean => {
    if (input.length > 10000) {
      console.error('Message too long');
      return false;
    }

    try {
      sanitizeInput(input);
      return true;
    } catch (error) {
      console.error('Input validation failed:', error);
      return false;
    }
  };

  const handleSendMessage = async () => {
    const content = input.trim();
    if (!content || !conversationId || isStreaming) return;

    if (!validateInput(content)) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setCurrentStreamContent('');

    // Save user message to database
    try {
      await saveMessage({
        conversation_id: conversationId,
        role: 'user',
        content,
        tokens: Math.ceil(content.length / 4),
      });
    } catch (error) {
      console.error('Failed to save user message:', error);
    }

    // Start streaming response
    abortControllerRef.current = new AbortController();

    try {
      await streamAIResponse(content);
      onConversationUpdate?.();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Failed to get AI response:', error);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      setCurrentStreamContent('');
      abortControllerRef.current = null;
    }
  };

  const streamAIResponse = async (userInput: string) => {
    // Simulate streaming response (in real implementation, would use AI service)
    const fullResponse = generateMockResponse(userInput, selectedAgent as DbAgent | null);
    const responseId = crypto.randomUUID();

    // Stream the response character by character
    for (let i = 0; i <= fullResponse.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        throw new Error('Aborted');
      }

      const chunk = fullResponse.substring(0, i);
      setCurrentStreamContent(chunk);

      // Add delay between chunks to simulate streaming
      await new Promise((resolve) => setTimeout(resolve, 20 + Math.random() * 30));
    }

    // Create final message
    const assistantMessage: Message = {
      id: responseId,
      role: 'assistant',
      content: fullResponse,
      timestamp: new Date(),
      tokens: Math.ceil(fullResponse.length / 4) || 0,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Save assistant message to database
    try {
      await saveMessage({
        conversation_id: conversationId!,
        role: 'assistant',
        content: fullResponse,
        tokens: assistantMessage.tokens || 0,
      });
    } catch (error) {
      console.error('Failed to save assistant message:', error);
    }
  };

  const generateMockResponse = (userInput: string, _agent: DbAgent | null): string => {
    const responses = [
      "I'd be happy to help you with that! Let me think through this step by step.",
      "That's an interesting question. Based on my understanding, here's what I think:",
      'I can definitely assist you with this. Let me provide you with a comprehensive answer.',
      'Great question! This is something I can help you explore in detail.',
    ];

    const baseResponse = responses[Math.floor(Math.random() * responses.length)];

    if (userInput.toLowerCase().includes('code') || userInput.toLowerCase().includes('program')) {
      return `${baseResponse}\n\nI can help you write code for that. Would you like me to create an interactive code example that you can run and modify?`;
    }

    if (userInput.toLowerCase().includes('create') || userInput.toLowerCase().includes('build')) {
      return `${baseResponse}\n\nI can help you create that! I can generate interactive content, code examples, or detailed documentation. What specific type of artifact would be most helpful?`;
    }

    return `${baseResponse}\n\nFeel free to ask me to create code examples, interactive demonstrations, or any other artifacts that might help illustrate the concepts we're discussing.`;
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={cn('flex h-full gap-4', className)}>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <Card className="flex-1 flex flex-col min-h-0">
          {/* Chat Header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <div>
                  {selectedAgent ? (
                    <>
                      <div className="font-medium">{selectedAgent.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {selectedAgent.description}
                      </div>
                    </>
                  ) : (
                    <div className="font-medium">AI Assistant</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {availableAgents.length > 0 && (
                  <Select value={selectedAgentId || ''} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Button
                  size="sm"
                  variant={showArtifacts ? 'default' : 'outline'}
                  onClick={() => setShowArtifacts(!showArtifacts)}
                >
                  <Code className="w-4 h-4 mr-2" />
                  Artifacts
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !isStreaming ? (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask questions, request code examples, or create interactive content
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      )}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </div>

                    <div className={cn('flex-1 min-w-0', message.role === 'user' && 'text-right')}>
                      <MessageRenderer
                        content={message.content}
                        role={message.role}
                        className="mb-2"
                      />

                      {message.artifacts && message.artifacts.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.artifacts.map((artifact) => (
                            <Card key={artifact.id} className="p-2 bg-muted/50">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span className="text-sm font-medium">{artifact.title}</span>
                                <span className="text-xs text-muted-foreground">
                                  {artifact.type}
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}

                      <div
                        className={cn(
                          'text-xs text-muted-foreground mt-1',
                          message.role === 'user' ? 'text-right' : 'text-left'
                        )}
                      >
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {isStreaming && currentStreamContent && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <MessageRenderer
                        content={currentStreamContent}
                        isStreaming={true}
                        className="mb-2"
                      />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          {/* Input Area */}
          <div className="p-4 border-t">
            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-4 w-4"
                      onClick={() => removeAttachment(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    resizeTextarea();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Shift+Enter for new line)"
                  className="min-h-[40px] max-h-[200px] resize-none pr-12"
                  disabled={isStreaming}
                />

                <div className="absolute right-2 bottom-2 flex gap-1">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileAttachment}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Paperclip className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {isStreaming ? (
                <Button onClick={handleStopGeneration} variant="destructive">
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button onClick={handleSendMessage} disabled={!input.trim() || !conversationId}>
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Artifacts Panel */}
      {showArtifacts && (
        <div className="w-96 flex-shrink-0">
          <ArtifactManager
            conversationId={conversationId || ''}
            onArtifactCreate={(artifact) => {
              console.log('Artifact created:', artifact);
            }}
            onArtifactUpdate={(artifact) => {
              console.log('Artifact updated:', artifact);
            }}
          />
        </div>
      )}
    </div>
  );
}
