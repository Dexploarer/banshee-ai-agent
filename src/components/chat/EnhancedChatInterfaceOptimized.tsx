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
import { VirtualMessageList } from '@/components/ui/VirtualList';
import { usePerformanceMonitor, useComponentPerformance } from '@/hooks/usePerformanceMonitor';
import { apiCache } from '@/lib/cache';
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

interface EnhancedChatInterfaceOptimizedProps {
  conversationId?: string;
  agentId?: string;
  className?: string;
  onConversationUpdate?: () => void;
  height?: number;
}

export function EnhancedChatInterfaceOptimized({
  conversationId,
  agentId,
  className,
  onConversationUpdate,
  height = 600,
}: EnhancedChatInterfaceOptimizedProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamContent, setCurrentStreamContent] = useState('');
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<DbAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(agentId);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Performance monitoring
  const { measureRender, measureScroll } = usePerformanceMonitor();
  const { measureRender: measureComponentRender } = useComponentPerformance('EnhancedChatInterfaceOptimized');

  const selectedAgent = useAgentStore((state) => {
    const session = state.getActiveSession();
    return session?.agent || null;
  });

  // Measure component render performance
  useEffect(() => {
    const cleanup = measureComponentRender();
    return cleanup;
  }, [messages, isStreaming, currentStreamContent]);

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

  const loadAvailableAgents = async () => {
    try {
      // Try to get from cache first
      const cacheKey = 'available-agents';
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        setAvailableAgents(cached);
        return;
      }

      const agents = await getAgents();
      setAvailableAgents(agents);
      
      // Cache the result
      apiCache.set(cacheKey, agents, 5 * 60 * 1000); // 5 minutes TTL
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      // Try to get from cache first
      const cacheKey = `messages:${conversationId}`;
      const cached = apiCache.get(cacheKey);
      
      if (cached) {
        setMessages(cached);
        return;
      }

      const dbMessages = await getMessages(conversationId);
      const formattedMessages: Message[] = dbMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        tokens: msg.tokens,
      }));
      
      setMessages(formattedMessages);
      
      // Cache the result
      apiCache.set(cacheKey, formattedMessages, 10 * 60 * 1000); // 10 minutes TTL
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [conversationId]);

  const loadMoreMessages = useCallback(async () => {
    if (!conversationId || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      // This would be implemented based on your pagination strategy
      // For now, we'll just simulate loading more messages
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // In a real implementation, you would load more messages from the database
      // and append them to the existing messages
      
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, isLoadingMore]);

  const validateInput = (input: string): boolean => {
    const sanitized = sanitizeInput(input);
    return sanitized.length > 0 && sanitized.length <= 10000;
  };

  const handleSendMessage = async () => {
    if (!validateInput(input) || isStreaming) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setCurrentStreamContent('');

    // Clear cache for this conversation
    if (conversationId) {
      apiCache.delete(`messages:${conversationId}`);
    }

    try {
      await streamAIResponse(input);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      ]);
    }
  };

  const streamAIResponse = async (userInput: string) => {
    setIsStreaming(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      // Simulate streaming response
      const mockResponse = generateMockResponse(userInput, selectedAgent);
      const words = mockResponse.split(' ');
      
      for (let i = 0; i < words.length; i++) {
        if (abortController.signal.aborted) break;
        
        setCurrentStreamContent((prev) => prev + (i > 0 ? ' ' : '') + words[i]);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: currentStreamContent || mockResponse,
        timestamp: new Date(),
        tokens: Math.ceil((currentStreamContent || mockResponse).length / 4),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentStreamContent('');

      // Clear cache for this conversation
      if (conversationId) {
        apiCache.delete(`messages:${conversationId}`);
      }

      onConversationUpdate?.();
    } catch (error) {
      if (!abortController.signal.aborted) {
        console.error('Streaming error:', error);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const generateMockResponse = (userInput: string, _agent: DbAgent | null): string => {
    const responses = [
      `I understand you're asking about "${userInput}". Let me help you with that.`,
      `That's an interesting question about "${userInput}". Here's what I think...`,
      `Regarding "${userInput}", I can provide some insights on this topic.`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
    setCurrentStreamContent('');
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

  // Convert messages to virtual list format
  const virtualMessages = messages.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    tokens: msg.tokens,
  }));

  // Add streaming message if active
  if (isStreaming && currentStreamContent) {
    virtualMessages.push({
      id: 'streaming',
      role: 'assistant' as const,
      content: currentStreamContent,
      timestamp: new Date(),
    });
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Agent Selection */}
        <div className="p-4 border-b border-gray-200">
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an agent" />
            </SelectTrigger>
            <SelectContent>
              {availableAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    {agent.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages Area with Virtual Scrolling */}
        <div className="flex-1 relative">
          <VirtualMessageList
            messages={virtualMessages}
            height={height - 200} // Adjust for input area
            className="h-full"
            loading={isLoadingMore}
            onLoadMore={loadMoreMessages}
          />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200">
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-sm"
                >
                  <FileText className="h-3 w-3" />
                  <span className="truncate max-w-20">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Controls */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  resizeTextarea();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isStreaming}
              />
            </div>

            <div className="flex gap-1">
              <input
                type="file"
                id="file-attachment"
                className="hidden"
                onChange={handleFileAttachment}
                multiple
              />
              <label htmlFor="file-attachment">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Paperclip className="h-4 w-4" />
                  </span>
                </Button>
              </label>

              {isStreaming ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleStopGeneration}
                >
                  <StopCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!validateInput(input) || isStreaming}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Artifacts Panel */}
        {showArtifacts && (
          <div className="border-t border-gray-200">
            <ArtifactManager conversationId={conversationId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 