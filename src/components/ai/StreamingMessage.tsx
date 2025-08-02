import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MessageRenderer } from './MessageRenderer';

interface StreamingMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function StreamingMessage({
  role,
  content,
  isStreaming = false,
  className,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState(isStreaming ? '' : content);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    if (currentIndex < content.length) {
      const timer = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 10); // Adjust speed as needed

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [content, currentIndex, isStreaming]);

  const Icon = role === 'user' ? User : Bot;

  return (
    <div className={cn('flex gap-3 p-4 rounded-lg', className)}>
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          role === 'user'
            ? 'bg-secondary text-secondary-foreground'
            : 'bg-gradient-primary text-primary-foreground shimmer'
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{role === 'user' ? 'You' : 'Banshee AI'}</span>
          {isStreaming && currentIndex < content.length && (
            <span className="text-xs text-muted-foreground animate-pulse">Typing...</span>
          )}
        </div>
        <div className="relative">
          <MessageRenderer content={displayedContent} />
          {isStreaming && currentIndex < content.length && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
