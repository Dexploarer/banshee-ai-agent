import { EnhancedChatInterface } from '@/components/chat/EnhancedChatInterface';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createConversation,
  deleteConversation,
  getAgents,
  getConversations,
} from '@/lib/database';
import type { DbAgent, DbConversation } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Bot, Calendar, Hash, MessageSquare, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ChatPortal() {
  const [agents, setAgents] = useState<DbAgent[]>([]);
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<DbAgent | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<DbConversation | null>(null);
  const [conversationSearchQuery, setConversationSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      loadConversations();
    }
  }, [selectedAgent]);

  const loadData = async () => {
    try {
      setLoading(true);
      const agentList = await getAgents();
      setAgents(agentList);

      // Auto-select first agent if available
      if (agentList.length > 0) {
        setSelectedAgent(agentList[0] || null);
      }
    } catch (error) {
      console.error('Failed to load chat data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    if (!selectedAgent) return;
    try {
      const conversationList = await getConversations(selectedAgent.id);
      setConversations(conversationList);

      // Auto-select first conversation for selected agent
      const agentConversations = conversationList.filter(
        (conv) => conv.agent_id === selectedAgent.id
      );
      if (agentConversations.length > 0) {
        setSelectedConversation(agentConversations[0] || null);
      } else {
        setSelectedConversation(null);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const handleAgentSelect = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      // Clear current conversation when switching agents
      setSelectedConversation(null);
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedAgent) return;

    try {
      const newConversation = await createConversation({
        agent_id: selectedAgent.id,
        title: 'New Conversation',
      });

      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversation(newConversation);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleConversationSelect = (conversation: DbConversation) => {
    setSelectedConversation(conversation);

    // Ensure the agent is selected too
    const conversationAgent = agents.find((a) => a.id === conversation.agent_id);
    if (conversationAgent && conversationAgent.id !== selectedAgent?.id) {
      setSelectedAgent(conversationAgent);
    }
  };

  const handleDeleteConversation = async (conversation: DbConversation) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await deleteConversation(conversation.id);
      setConversations((prev) => prev.filter((c) => c.id !== conversation.id));

      if (selectedConversation?.id === conversation.id) {
        const remainingConversations = conversations.filter(
          (c) => c.id !== conversation.id && c.agent_id === selectedAgent?.id
        );
        setSelectedConversation(remainingConversations[0] || null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleConversationUpdate = () => {
    loadConversations();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Filter conversations based on search and selected agent
  const filteredConversations = conversations.filter((conv) => {
    if (selectedAgent && conv.agent_id !== selectedAgent.id) return false;
    if (!conversationSearchQuery) return true;

    const query = conversationSearchQuery.toLowerCase();
    return conv.title.toLowerCase().includes(query) || conv.summary?.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8 text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No Agents Available</h2>
          <p className="text-muted-foreground mb-4">
            You need to create an agent first before you can start chatting.
          </p>
          <p className="text-sm text-muted-foreground">
            Go to the Workspace to create your first agent.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Conversations Sidebar */}
      <aside className="w-80 border-r bg-card/30 flex flex-col">
        <div className="p-4 border-b">
          {/* Agent Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Chat Agent</h2>
            </div>
            <Select value={selectedAgent?.id || ''} onValueChange={handleAgentSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent to chat with" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4" />
                      <span>{agent.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({agent.character_role})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Conversations Section */}
        {selectedAgent && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  Conversations ({filteredConversations.length})
                </h3>
                <Button size="sm" onClick={handleCreateConversation}>
                  <Plus className="w-3 h-3 mr-1" />
                  New
                </Button>
              </div>

              {/* Conversation Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={conversationSearchQuery}
                  onChange={(e) => setConversationSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <Card
                    key={conversation.id}
                    className={cn(
                      'cursor-pointer transition-colors hover:bg-accent/50 group',
                      selectedConversation?.id === conversation.id
                        ? 'ring-1 ring-primary bg-primary/5 border-primary/30'
                        : ''
                    )}
                    onClick={() => handleConversationSelect(conversation)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{conversation.title}</h4>
                            {conversation.summary && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {conversation.summary}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(conversation.updated_at)}</span>
                              <Hash className="w-3 h-3 ml-1" />
                              <span>{conversation.token_count} tokens</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conversation);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="p-6 text-center bg-muted/50">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {conversationSearchQuery ? 'No conversations found' : 'No conversations yet'}
                  </p>
                  {!conversationSearchQuery && (
                    <Button size="sm" onClick={handleCreateConversation}>
                      Start First Chat
                    </Button>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1">
        {selectedAgent && selectedConversation ? (
          <EnhancedChatInterface
            conversationId={selectedConversation.id}
            agentId={selectedAgent.id}
            className="h-full"
            onConversationUpdate={handleConversationUpdate}
          />
        ) : selectedAgent ? (
          <div className="flex items-center justify-center h-full">
            <Card className="p-8 text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground mb-4">
                Create a new conversation with {selectedAgent.name}
              </p>
              <Button onClick={handleCreateConversation}>
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </Button>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Card className="p-8 text-center">
              <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Select an Agent</h3>
              <p className="text-muted-foreground">
                Choose an agent from the sidebar to start chatting
              </p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
