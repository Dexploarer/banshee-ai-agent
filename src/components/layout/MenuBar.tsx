/**
 * Enhanced Menu Bar Component for Banshee
 *
 * Provides comprehensive application menus with keyboard shortcuts
 */

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { useAgentStore } from '@/store/agentStore';
import {
  FileText,
  Save,
  Download,
  Upload,
  Settings,
  LogOut,
  Copy,
  Clipboard,
  Scissors,
  Search,
  Undo,
  Redo,
  Bold,
  Italic,
  Link,
  MessageSquare,
  Bot,
  Zap,
  Database,
  Brain,
  Terminal,
  Code,
  Bug,
  BookOpen,
  HelpCircle,
  Info,
  Keyboard,
  Moon,
  Sun,
  Monitor,
  Maximize2,
  Minimize2,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Home,
  History,
  Star,
  GitBranch,
  Shield,
  Activity,
  Archive,
  Trash2,
  Plus,
  FolderOpen,
  FileCode,
  Sparkles,
  Palette,
  Layout,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportConversation, clearAllData } from '@/lib/database';
import { useState } from 'react';
import { getProviderManager } from '@/lib/ai/providers/manager';

interface MenuBarProps {
  className?: string;
}

export function MenuBar({ className }: MenuBarProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const activeSession = useAgentStore((state) => state.getActiveSession());
  const [showDevTools, setShowDevTools] = useState(false);

  // Menu actions
  const handleNewChat = () => {
    // Clear current session and start new
    useAgentStore.getState().clearActiveSession();
    navigate('/chat');
  };

  const handleNewAgent = () => {
    navigate('/agents?action=new');
  };

  const handleExportChat = async () => {
    if (activeSession?.conversation?.id) {
      const data = await exportConversation(activeSession.conversation.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `banshee-chat-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportChat = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const data = JSON.parse(text);
        // TODO: Implement import logic
        console.log('Import data:', data);
      }
    };
    input.click();
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      await clearAllData();
      window.location.reload();
    }
  };

  const toggleDevTools = () => {
    setShowDevTools(!showDevTools);
    // In Tauri, you would call the actual dev tools API
    console.log('Toggle dev tools');
  };

  const handleRefreshModels = async () => {
    const manager = getProviderManager();
    await manager.refreshAuthStatus();
    window.location.reload();
  };

  return (
    <div className={cn('flex h-8 items-center gap-1 bg-card border-b px-2', className)}>
      {/* Banshee Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium">
            Banshee
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Preferences
            <span className="ml-auto text-xs opacity-60">⌘,</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Shield className="mr-2 h-4 w-4" />
            Security & Privacy
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Activity className="mr-2 h-4 w-4" />
            Usage Statistics
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleClearData}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All Data...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <LogOut className="mr-2 h-4 w-4" />
            Quit Banshee
            <span className="ml-auto text-xs opacity-60">⌘Q</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium">
            File
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={handleNewChat}>
            <Plus className="mr-2 h-4 w-4" />
            New Chat
            <span className="ml-auto text-xs opacity-60">⌘N</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleNewAgent}>
            <Bot className="mr-2 h-4 w-4" />
            New Agent
            <span className="ml-auto text-xs opacity-60">⌘⇧N</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/chat')}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open Recent
            <span className="ml-auto text-xs opacity-60">⌘O</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportChat} disabled={!activeSession}>
            <Download className="mr-2 h-4 w-4" />
            Export Chat...
            <span className="ml-auto text-xs opacity-60">⌘E</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleImportChat}>
            <Upload className="mr-2 h-4 w-4" />
            Import Chat...
            <span className="ml-auto text-xs opacity-60">⌘I</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Archive className="mr-2 h-4 w-4" />
            Archive Chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium">
            Edit
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem>
            <Undo className="mr-2 h-4 w-4" />
            Undo
            <span className="ml-auto text-xs opacity-60">⌘Z</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Redo className="mr-2 h-4 w-4" />
            Redo
            <span className="ml-auto text-xs opacity-60">⌘⇧Z</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Scissors className="mr-2 h-4 w-4" />
            Cut
            <span className="ml-auto text-xs opacity-60">⌘X</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy className="mr-2 h-4 w-4" />
            Copy
            <span className="ml-auto text-xs opacity-60">⌘C</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Clipboard className="mr-2 h-4 w-4" />
            Paste
            <span className="ml-auto text-xs opacity-60">⌘V</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Search className="mr-2 h-4 w-4" />
            Find...
            <span className="ml-auto text-xs opacity-60">⌘F</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Search className="mr-2 h-4 w-4" />
            Find and Replace...
            <span className="ml-auto text-xs opacity-60">⌘⇧F</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium">
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
            {theme === 'light' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
            {theme === 'dark' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            System
            {theme === 'system' && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Layout</DropdownMenuLabel>
          <DropdownMenuItem>
            <PanelLeft className="mr-2 h-4 w-4" />
            Show Sidebar
            <span className="ml-auto text-xs opacity-60">⌘⇧S</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Layout className="mr-2 h-4 w-4" />
            Compact Mode
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Maximize2 className="mr-2 h-4 w-4" />
            Full Screen
            <span className="ml-auto text-xs opacity-60">⌘⌃F</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reload
            <span className="ml-auto text-xs opacity-60">⌘R</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleDevTools}>
            <Terminal className="mr-2 h-4 w-4" />
            Developer Tools
            <span className="ml-auto text-xs opacity-60">⌘⌥I</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Chat Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium">
            Chat
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => navigate('/chat')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Current Chat
          </DropdownMenuItem>
          <DropdownMenuItem>
            <History className="mr-2 h-4 w-4" />
            Chat History
            <span className="ml-auto text-xs opacity-60">⌘H</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Star className="mr-2 h-4 w-4" />
            Starred Messages
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Bold className="mr-2 h-4 w-4" />
            Format as Bold
            <span className="ml-auto text-xs opacity-60">⌘B</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Italic className="mr-2 h-4 w-4" />
            Format as Italic
            <span className="ml-auto text-xs opacity-60">⌘I</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Code className="mr-2 h-4 w-4" />
            Format as Code
            <span className="ml-auto text-xs opacity-60">⌘`</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <FileCode className="mr-2 h-4 w-4" />
            Insert Code Block
            <span className="ml-auto text-xs opacity-60">⌘⇧C</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link className="mr-2 h-4 w-4" />
            Insert Link
            <span className="ml-auto text-xs opacity-60">⌘K</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* AI Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium">
            AI
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem onClick={() => navigate('/agents')}>
            <Bot className="mr-2 h-4 w-4" />
            Manage Agents
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Brain className="mr-2 h-4 w-4" />
            Model Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleRefreshModels}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Models
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/mcp')}>
            <Zap className="mr-2 h-4 w-4" />
            MCP Servers
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Suggestions
            <span className="ml-auto text-xs opacity-60">⌘⇧A</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Command className="mr-2 h-4 w-4" />
            Command Palette
            <span className="ml-auto text-xs opacity-60">⌘P</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Database className="mr-2 h-4 w-4" />
            Knowledge Base
          </DropdownMenuItem>
          <DropdownMenuItem>
            <GitBranch className="mr-2 h-4 w-4" />
            Version Control
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Window Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium">
            Window
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem>
            <Minimize2 className="mr-2 h-4 w-4" />
            Minimize
            <span className="ml-auto text-xs opacity-60">⌘M</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Maximize2 className="mr-2 h-4 w-4" />
            Zoom
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/dashboard')}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
            <span className="ml-auto text-xs opacity-60">⌘1</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/chat')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Chat
            <span className="ml-auto text-xs opacity-60">⌘2</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/agents')}>
            <Bot className="mr-2 h-4 w-4" />
            Agents
            <span className="ml-auto text-xs opacity-60">⌘3</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/mcp')}>
            <Zap className="mr-2 h-4 w-4" />
            MCP
            <span className="ml-auto text-xs opacity-60">⌘4</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
            <span className="ml-auto text-xs opacity-60">⌘5</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <PanelRight className="mr-2 h-4 w-4" />
            Show All Tabs
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs font-medium">
            Help
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem>
            <BookOpen className="mr-2 h-4 w-4" />
            Documentation
          </DropdownMenuItem>
          <DropdownMenuItem>
            <HelpCircle className="mr-2 h-4 w-4" />
            Getting Started
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Keyboard className="mr-2 h-4 w-4" />
            Keyboard Shortcuts
            <span className="ml-auto text-xs opacity-60">⌘?</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Bug className="mr-2 h-4 w-4" />
            Report a Bug
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MessageSquare className="mr-2 h-4 w-4" />
            Send Feedback
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Info className="mr-2 h-4 w-4" />
            About Banshee
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Palette className="mr-2 h-4 w-4" />
            Theme Gallery
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status indicators */}
      {activeSession && (
        <div className="flex items-center gap-2 mr-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Connected</span>
          </div>
        </div>
      )}
    </div>
  );
}
