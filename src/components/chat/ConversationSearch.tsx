import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { exportAllData, searchConversations } from '@/lib/database';
import type { DbConversation } from '@/lib/database';
import { cn } from '@/lib/utils';
import { Download, MessageSquare, Search } from 'lucide-react';
import { useState } from 'react';

interface ConversationSearchProps {
  onSelectConversation?: (conversation: DbConversation) => void;
  className?: string;
}

export function ConversationSearch({ onSelectConversation, className }: ConversationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DbConversation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchConversations(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `banshee-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
              e.key === 'Enter' && handleSearch()
            }
            placeholder="Search conversations..."
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch} disabled={isSearching} className="hover-lift">
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
        <Button
          onClick={handleExport}
          variant="outline"
          disabled={isExporting}
          className="hover-lift"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export All'}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Found {searchResults.length} conversation{searchResults.length !== 1 ? 's' : ''}
          </p>
          {searchResults.map((conversation) => (
            <Card
              key={conversation.id}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors hover-lift"
              onClick={() => onSelectConversation?.(conversation)}
            >
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{conversation.title}</h3>
                  {conversation.summary && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {conversation.summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{formatDate(conversation.updated_at)}</span>
                    <span>{conversation.token_count} tokens</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {searchQuery && searchResults.length === 0 && !isSearching && (
        <Card className="p-8 text-center bg-muted/50">
          <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No conversations found matching "{searchQuery}"
          </p>
        </Card>
      )}
    </div>
  );
}
