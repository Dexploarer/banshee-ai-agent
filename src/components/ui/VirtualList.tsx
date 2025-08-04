import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { cn } from '@/lib/utils';

export interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  overscan = 5,
  className,
  renderItem,
  keyExtractor,
  onScroll,
  onEndReached,
  onEndReachedThreshold = 0.8,
  loading = false,
  loadingComponent,
  emptyComponent,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(height);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan]);

  // Calculate total height and transform
  const totalHeight = items.length * itemHeight;
  const transform = `translateY(${visibleRange.startIndex * itemHeight}px)`;

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);

    // Check if we're near the end
    if (onEndReached && !loading) {
      const scrollPercentage = newScrollTop / (totalHeight - containerHeight);
      if (scrollPercentage >= onEndReachedThreshold) {
        onEndReached();
      }
    }
  }, [onScroll, onEndReached, onEndReachedThreshold, loading, totalHeight, containerHeight]);

  // Resize observer for dynamic height changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Memoized item component for better performance
  const MemoizedItem = memo(({ item, index, style }: { item: any; index: number; style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem(item, index)}
    </div>
  ));

  // Generate visible items with optimized rendering
  const visibleItems = useMemo(() => {
    const items: React.ReactNode[] = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (i >= 0 && i < items.length) {
        const item = items[i];
        const key = keyExtractor ? keyExtractor(item, i) : i.toString();
        
        items.push(
          <MemoizedItem
            key={key}
            item={item}
            index={i}
            style={{
              height: itemHeight,
              position: 'absolute',
              top: `${i * itemHeight}px`,
              left: 0,
              right: 0,
              willChange: 'transform', // Optimize for animations
            }}
          />
        );
      }
    }
    
    return items;
  }, [items, visibleRange, itemHeight, renderItem, keyExtractor]);

  // Show empty state
  if (items.length === 0 && emptyComponent) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        {emptyComponent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform }}>
          {visibleItems}
        </div>
      </div>
      
      {loading && loadingComponent && (
        <div className="flex justify-center p-4">
          {loadingComponent}
        </div>
      )}
    </div>
  );
}

// Specialized virtual list for conversations
export interface ConversationItem {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp: Date;
  unreadCount?: number;
}

export interface VirtualConversationListProps {
  conversations: ConversationItem[];
  height: number;
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
  className?: string;
  loading?: boolean;
  onLoadMore?: () => void;
}

export function VirtualConversationList({
  conversations,
  height,
  onSelectConversation,
  selectedConversationId,
  className,
  loading = false,
  onLoadMore,
}: VirtualConversationListProps) {
  const renderConversationItem = useCallback((conversation: ConversationItem, index: number) => (
    <div
      className={cn(
        'flex items-center p-4 border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors',
        selectedConversationId === conversation.id && 'bg-blue-50 border-blue-200'
      )}
      onClick={() => onSelectConversation(conversation.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {conversation.title}
          </h3>
          <span className="text-xs text-gray-500">
            {conversation.timestamp.toLocaleDateString()}
          </span>
        </div>
        
        {conversation.lastMessage && (
          <p className="text-sm text-gray-600 truncate mt-1">
            {conversation.lastMessage}
          </p>
        )}
      </div>
      
      {conversation.unreadCount && conversation.unreadCount > 0 && (
        <div className="ml-2 flex-shrink-0">
          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
            {conversation.unreadCount}
          </span>
        </div>
      )}
    </div>
  ), [selectedConversationId, onSelectConversation]);

  const keyExtractor = useCallback((item: ConversationItem) => item.id, []);

  const loadingComponent = loading ? (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    </div>
  ) : null;

  const emptyComponent = (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
      <div className="text-lg font-medium mb-2">No conversations</div>
      <div className="text-sm">Start a new conversation to get started</div>
    </div>
  );

  return (
    <VirtualList
      items={conversations}
      height={height}
      itemHeight={80}
      overscan={3}
      className={className}
      renderItem={renderConversationItem}
      keyExtractor={keyExtractor}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.9}
      loading={loading}
      loadingComponent={loadingComponent}
      emptyComponent={emptyComponent}
    />
  );
}

// Specialized virtual list for messages
export interface MessageItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
}

export interface VirtualMessageListProps {
  messages: MessageItem[];
  height: number;
  className?: string;
  loading?: boolean;
  onLoadMore?: () => void;
}

export function VirtualMessageList({
  messages,
  height,
  className,
  loading = false,
  onLoadMore,
}: VirtualMessageListProps) {
  const renderMessageItem = useCallback((message: MessageItem, index: number) => (
    <div
      className={cn(
        'flex p-4 border-b border-gray-100',
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] rounded-lg p-3',
          message.role === 'user'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        )}
      >
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div className="text-xs opacity-70 mt-1">
          {message.timestamp.toLocaleTimeString()}
          {message.tokens && ` • ${message.tokens} tokens`}
        </div>
      </div>
    </div>
  ), []);

  const keyExtractor = useCallback((item: MessageItem) => item.id, []);

  const loadingComponent = loading ? (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    </div>
  ) : null;

  const emptyComponent = (
    <div className="flex flex-col items-center justify-center p-8 text-gray-500">
      <div className="text-lg font-medium mb-2">No messages</div>
      <div className="text-sm">Send a message to start the conversation</div>
    </div>
  );

  return (
    <VirtualList
      items={messages}
      height={height}
      itemHeight={100}
      overscan={5}
      className={className}
      renderItem={renderMessageItem}
      keyExtractor={keyExtractor}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.8}
      loading={loading}
      loadingComponent={loadingComponent}
      emptyComponent={emptyComponent}
    />
  );
} 