import { ChatInterface } from '@/components/ai/ChatInterface';
import { ConversationSearch } from '@/components/chat/ConversationSearch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createConversation, deleteConversation, getConversations } from '@/lib/database';
import type { DbConversation } from '@/lib/database';
import { useAgentStore } from '@/store/agentStore';
import { cn } from '@/lib/utils';
import { Bot, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ChatPortal() {
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DbConversation | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const selectedAgent = useAgentStore((state) => {
    const session = state.getActiveSession();
    return session?.agent || null;
  });

  useEffect(() => {
    loadConversations();
  }, [selectedAgent]);

  const loadConversations = async () => {
    if (!selectedAgent?.id) return;
    const convs = await getConversations(selectedAgent.id);
    setConversations(convs);

    // Select the most recent conversation or create a new one
    if (convs.length > 0 && !selectedConversation) {
      setSelectedConversation(convs[0]);
    }
  };

  const handleNewConversation = async () => {
    if (!selectedAgent?.id) return;

    const newConv = await createConversation({
      agent_id: selectedAgent.id,
      title: 'New Conversation',
    });

    await loadConversations();
    setSelectedConversation(newConv);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
    await loadConversations();

    if (selectedConversation?.id === id) {
      setSelectedConversation(conversations[0] || null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!selectedAgent) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center glass">
          <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Agent Selected</h2>
          <p className="text-muted-foreground">
            Please select an agent from the Agents page to start chatting.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4">
      {/* Conversations Sidebar */}
      <aside className="w-80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showSearch ? 'secondary' : 'ghost'}
              onClick={() => setShowSearch(!showSearch)}
              className="hover-lift"
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleNewConversation} className="hover-lift">
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>

        {showSearch && (
          <ConversationSearch
            onSelectConversation={(conv) => {
              setSelectedConversation(conv);
              setShowSearch(false);
              loadConversations();
            }}
          />
        )}

        {!showSearch && (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className={cn(
                  'p-3 cursor-pointer transition-colors hover-lift',
                  selectedConversation?.id === conv.id
                    ? 'bg-primary/10 border-primary/30'
                    : 'hover:bg-muted/50'
                )}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="font-medium truncate">{conv.title}</h3>
                    </div>
                    {conv.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {conv.summary}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(conv.updated_at)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {conv.token_count} tokens
                      </span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="ml-2 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConversation(conv.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}

            {conversations.length === 0 && (
              <Card className="p-8 text-center bg-muted/50">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No conversations yet. Start a new chat!
                </p>
              </Card>
            )}
          </div>
        )}
      </aside>

      {/* Chat Interface */}
      <main className="flex-1">
        {selectedConversation ? (
          <ChatInterface
            conversationId={selectedConversation.id}
            agentId={selectedAgent.id}
            className="h-full"
            onConversationUpdate={loadConversations}
          />
        ) : (
          <Card className="h-full flex items-center justify-center glass">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Start a New Conversation</h2>
              <p className="text-muted-foreground mb-4">
                Click "New Chat" to begin chatting with {selectedAgent.name}
              </p>
              <Button onClick={handleNewConversation} className="hover-lift">
                <Plus className="w-4 h-4 mr-2" />
                New Chat
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
