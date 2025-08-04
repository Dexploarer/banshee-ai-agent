/**
 * Command Palette Component
 *
 * Quick command execution and navigation
 */

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/store/agentStore';
import { useThemeStore } from '@/store/themeStore';
import {
  Archive,
  Bot,
  Brain,
  ChevronRight,
  Command,
  Database,
  History,
  Home,
  MessageSquare,
  Monitor,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Sun,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { setTheme } = useThemeStore();

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      title: 'Go to Dashboard',
      description: 'View your dashboard',
      icon: <Home className="h-4 w-4" />,
      category: 'Navigation',
      action: () => {
        navigate('/dashboard');
        onOpenChange(false);
      },
      keywords: ['home', 'main', 'overview'],
    },
    {
      id: 'nav-chat',
      title: 'Go to Chat',
      description: 'Open chat interface',
      icon: <MessageSquare className="h-4 w-4" />,
      category: 'Navigation',
      action: () => {
        navigate('/chat');
        onOpenChange(false);
      },
      keywords: ['conversation', 'message'],
    },
    {
      id: 'nav-agents',
      title: 'Go to Agents',
      description: 'Manage AI agents',
      icon: <Bot className="h-4 w-4" />,
      category: 'Navigation',
      action: () => {
        navigate('/agents');
        onOpenChange(false);
      },
      keywords: ['ai', 'assistant'],
    },
    {
      id: 'nav-mcp',
      title: 'Go to MCP',
      description: 'Model Context Protocol',
      icon: <Zap className="h-4 w-4" />,
      category: 'Navigation',
      action: () => {
        navigate('/mcp');
        onOpenChange(false);
      },
      keywords: ['protocol', 'server'],
    },
    {
      id: 'nav-settings',
      title: 'Go to Settings',
      description: 'Application settings',
      icon: <Settings className="h-4 w-4" />,
      category: 'Navigation',
      action: () => {
        navigate('/settings');
        onOpenChange(false);
      },
      keywords: ['preferences', 'config'],
    },
    // Actions
    {
      id: 'action-new-chat',
      title: 'New Chat',
      description: 'Start a new conversation',
      icon: <Plus className="h-4 w-4" />,
      category: 'Actions',
      action: () => {
        useAgentStore.getState().clearActiveSession();
        navigate('/chat');
        onOpenChange(false);
      },
      keywords: ['create', 'start'],
    },
    {
      id: 'action-new-agent',
      title: 'New Agent',
      description: 'Create a new AI agent',
      icon: <Bot className="h-4 w-4" />,
      category: 'Actions',
      action: () => {
        navigate('/agents?action=new');
        onOpenChange(false);
      },
      keywords: ['create', 'add'],
    },
    {
      id: 'action-search',
      title: 'Search Everything',
      description: 'Search chats, agents, and more',
      icon: <Search className="h-4 w-4" />,
      category: 'Actions',
      action: () => {
        // TODO: Implement global search
        onOpenChange(false);
      },
      keywords: ['find', 'look'],
    },
    {
      id: 'action-history',
      title: 'Chat History',
      description: 'View past conversations',
      icon: <History className="h-4 w-4" />,
      category: 'Actions',
      action: () => {
        navigate('/chat?view=history');
        onOpenChange(false);
      },
      keywords: ['past', 'previous'],
    },
    {
      id: 'action-starred',
      title: 'Starred Messages',
      description: 'View starred messages',
      icon: <Star className="h-4 w-4" />,
      category: 'Actions',
      action: () => {
        navigate('/chat?view=starred');
        onOpenChange(false);
      },
      keywords: ['favorite', 'bookmark'],
    },
    // Theme
    {
      id: 'theme-light',
      title: 'Light Theme',
      description: 'Switch to light mode',
      icon: <Sun className="h-4 w-4" />,
      category: 'Theme',
      action: () => {
        setTheme('light');
        onOpenChange(false);
      },
      keywords: ['bright', 'day'],
    },
    {
      id: 'theme-dark',
      title: 'Dark Theme',
      description: 'Switch to dark mode',
      icon: <Moon className="h-4 w-4" />,
      category: 'Theme',
      action: () => {
        setTheme('dark');
        onOpenChange(false);
      },
      keywords: ['night', 'dim'],
    },
    {
      id: 'theme-system',
      title: 'System Theme',
      description: 'Use system preference',
      icon: <Monitor className="h-4 w-4" />,
      category: 'Theme',
      action: () => {
        setTheme('system');
        onOpenChange(false);
      },
      keywords: ['auto', 'default'],
    },
    // AI
    {
      id: 'ai-models',
      title: 'AI Models',
      description: 'Configure AI models',
      icon: <Brain className="h-4 w-4" />,
      category: 'AI',
      action: () => {
        navigate('/settings');
        onOpenChange(false);
      },
      keywords: ['llm', 'gpt', 'claude'],
    },
    {
      id: 'ai-knowledge',
      title: 'Knowledge Base',
      description: 'Manage knowledge base',
      icon: <Database className="h-4 w-4" />,
      category: 'AI',
      action: () => {
        // TODO: Navigate to knowledge base
        onOpenChange(false);
      },
      keywords: ['data', 'information'],
    },
    // System
    {
      id: 'system-reload',
      title: 'Reload',
      description: 'Reload the application',
      icon: <RefreshCw className="h-4 w-4" />,
      category: 'System',
      action: () => {
        window.location.reload();
      },
      keywords: ['refresh', 'restart'],
    },
    {
      id: 'system-archive',
      title: 'Archive Chat',
      description: 'Archive current chat',
      icon: <Archive className="h-4 w-4" />,
      category: 'System',
      action: () => {
        // TODO: Implement archive
        onOpenChange(false);
      },
      keywords: ['save', 'store'],
    },
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter((cmd) => {
    const searchLower = search.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.category.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower))
    );
  });

  // Group by category
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category]?.push(cmd);
      return acc;
    },
    {} as Record<string, CommandItem[]>
  );

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredCommands, onOpenChange]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

  let currentIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl">
        <div className="flex items-center px-3 border-b">
          <Command className="h-4 w-4 mr-2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 h-12 border-0 focus:ring-0"
          />
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {Object.entries(groupedCommands).length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No commands found</div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => (
              <div key={category} className="mb-2">
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  {category}
                </div>
                {items.map((cmd) => {
                  currentIndex++;
                  const isSelected = currentIndex === selectedIndex;

                  return (
                    <button
                      type="button"
                      key={cmd.id}
                      onClick={cmd.action}
                      className={cn(
                        'w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors',
                        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      )}
                    >
                      <div className="p-1 bg-secondary rounded">{cmd.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{cmd.title}</div>
                        {cmd.description && (
                          <div className="text-xs text-muted-foreground">{cmd.description}</div>
                        )}
                      </div>
                      {isSelected && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="border-t p-2">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">⏎</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd> Close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
