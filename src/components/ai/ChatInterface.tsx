import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { saveConversation, saveMessage } from '@/lib/database';
import { getMessages } from '@/lib/database';
import { cn } from '@/lib/utils';
import { sanitizeInput } from '@/lib/validation/schemas';
import { useAgentStore } from '@/store/agentStore';
import { Send, StopCircle, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
import { StreamProgress } from './StreamProgress';
import { StreamingMessage } from './StreamingMessage';
import { TokenCounter } from './TokenCounter';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
}

interface ChatInterfaceProps {
  conversationId?: string;
  agentId: string;
  className?: string;
  onConversationUpdate?: () => void;
}

export function ChatInterface({
  conversationId,
  agentId,
  className,
  onConversationUpdate,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<
    'idle' | 'connecting' | 'streaming' | 'completed' | 'error'
  >('idle');
  const [currentStreamContent, setCurrentStreamContent] = useState('');
  const [totalTokens, setTotalTokens] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedAgent = useAgentStore((state) => {
    const session = state.getActiveSession();
    return session?.agent || null;
  });

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

      // Calculate total tokens
      const total = dbMessages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);
      setTotalTokens(total);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [conversationId]);

  // Load conversation messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    } else {
      setMessages([]);
      setTotalTokens(0);
    }
  }, [conversationId, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Auto-resize textarea
  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const validateInput = (input: string): boolean => {
    if (input.length > 10000) {
      console.error('Message too long');
      return false;
    }
    return true;
  };

  const createUserMessage = (content: string): Message => ({
    id: crypto.randomUUID(),
    role: 'user',
    content,
    timestamp: new Date(),
    tokens: Math.ceil(content.length / 4),
  });

  const saveUserMessage = async (message: Message) => {
    if (!conversationId) return;
    await saveMessage({
      conversation_id: conversationId,
      role: 'user',
      content: message.content,
      tokens: message.tokens || 0,
    });
  };

  const simulateStreaming = async (): Promise<string> => {
    const simulatedResponse =
      "I understand you're looking for help with your Banshee AI assistant. The ethereal theme you've implemented creates a beautiful, otherworldly aesthetic that perfectly captures the essence of a 'Banshee' - mysterious and elegant.\n\nThe color scheme with dark emerald greens and shimmering gradients in light mode, contrasted with the pale greens and blood red accents in dark mode, creates a unique visual identity that sets this application apart.\n\nIs there something specific you'd like to enhance or modify about the current implementation?";

    let accumulatedContent = '';
    for (let i = 0; i < simulatedResponse.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;
      accumulatedContent += simulatedResponse[i];
      setCurrentStreamContent(accumulatedContent);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return accumulatedContent;
  };

  const saveAssistantResponse = async (userMessage: Message, assistantMessage: Message) => {
    if (!conversationId) return;

    await saveMessage({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantMessage.content,
      tokens: assistantMessage.tokens || 0,
    });

    const originalMessages = await getMessages(conversationId);
    const title = originalMessages.length === 0 ? userMessage.content.slice(0, 50) : 'Conversation';

    await saveConversation({
      id: conversationId,
      agent_id: agentId,
      title,
      token_count: totalTokens + (userMessage.tokens || 0) + (assistantMessage.tokens || 0),
    });

    onConversationUpdate?.();
  };

  const handleSend = async () => {
    const sanitizedInput = sanitizeInput(input);
    if (!sanitizedInput || isStreaming || !conversationId) return;
    if (!validateInput(sanitizedInput)) return;

    const userMessage = createUserMessage(sanitizedInput);
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    setStreamStatus('connecting');
    setCurrentStreamContent('');

    await saveUserMessage(userMessage);

    try {
      abortControllerRef.current = new AbortController();
      setStreamStatus('streaming');

      const content = await simulateStreaming();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        tokens: Math.ceil(content.length / 4),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamStatus('completed');
      setTotalTokens((prev) => prev + (userMessage.tokens || 0) + (assistantMessage.tokens || 0));

      await saveAssistantResponse(userMessage, assistantMessage);
    } catch (error) {
      console.error('Error during streaming:', error);
      setStreamStatus('error');
    } finally {
      setIsStreaming(false);
      setCurrentStreamContent('');
      setTimeout(() => setStreamStatus('idle'), 3000);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setTotalTokens(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className={cn('flex flex-col h-full glass', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gradient">
              {selectedAgent?.name || 'Banshee AI'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {messages.length} messages • {totalTokens.toLocaleString()} tokens
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ModelSelectorDropdown
              onModelSelect={(model) => {
                console.log('Selected model:', model);
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={messages.length === 0}
              className="hover-lift"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <TokenCounter current={totalTokens} max={128000} showCost className="text-xs" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <StreamingMessage
            key={message.id}
            role={message.role}
            content={message.content}
            className={cn(
              message.role === 'user' ? 'bg-secondary/50' : 'bg-card/50 border border-border/50'
            )}
          />
        ))}

        {isStreaming && currentStreamContent && (
          <div className={cn('bg-card/50 border border-border/50 rounded-lg')}>
            <StreamingMessage content={currentStreamContent} isStreaming={true} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Stream Progress */}
      {streamStatus !== 'idle' && (
        <div className="px-4 pb-2">
          <StreamProgress status={streamStatus} />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isStreaming}
            aria-label="Message input"
            aria-describedby="message-help"
            className={cn(
              'flex-1 resize-none rounded-lg border bg-background px-3 py-2',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
              'min-h-[44px] max-h-[200px]',
              'placeholder:text-muted-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            rows={1}
          />
          <span id="message-help" className="sr-only">
            Press Enter to send, Shift+Enter for new line
          </span>
          <Button
            onClick={isStreaming ? handleStop : handleSend}
            disabled={!input.trim() && !isStreaming}
            className={cn(
              'self-end hover-lift',
              isStreaming && 'bg-destructive hover:bg-destructive/90'
            )}
          >
            {isStreaming ? (
              <>
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
