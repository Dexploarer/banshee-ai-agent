/**
 * Keyboard Shortcuts Hook
 *
 * Handles all application keyboard shortcuts
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeStore } from '@/store/themeStore';
import { useAgentStore } from '@/store/agentStore';

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for command/control key
      const isCmd = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;
      const isAlt = event.altKey;
      const key = event.key.toLowerCase();

      // Prevent default for handled shortcuts
      const preventDefault = () => {
        event.preventDefault();
        event.stopPropagation();
      };

      // Global shortcuts
      if (isCmd && !isShift && !isAlt) {
        switch (key) {
          case 'n': // New chat
            preventDefault();
            useAgentStore.getState().clearActiveSession();
            navigate('/chat');
            break;
          case 'o': // Open recent
            preventDefault();
            navigate('/chat');
            break;
          case ',': // Preferences
            preventDefault();
            navigate('/settings');
            break;
          case 'q': // Quit (handled by Tauri)
            preventDefault();
            break;
          case '1': // Dashboard
            preventDefault();
            navigate('/dashboard');
            break;
          case '2': // Chat
            preventDefault();
            navigate('/chat');
            break;
          case '3': // Agents
            preventDefault();
            navigate('/agents');
            break;
          case '4': // MCP
            preventDefault();
            navigate('/mcp');
            break;
          case '5': // Settings
            preventDefault();
            navigate('/settings');
            break;
          case 'r': // Reload
            preventDefault();
            window.location.reload();
            break;
          case 'h': // History
            preventDefault();
            navigate('/chat?view=history');
            break;
          case 'k': // Insert link (in chat)
            // This would be handled by the chat component
            break;
          case 'p': // Command palette
            preventDefault();
            // TODO: Open command palette
            break;
          case '?': // Help/Keyboard shortcuts
            preventDefault();
            // TODO: Show keyboard shortcuts dialog
            break;
        }
      }

      // Cmd+Shift shortcuts
      if (isCmd && isShift && !isAlt) {
        switch (key) {
          case 'n': // New agent
            preventDefault();
            navigate('/agents?action=new');
            break;
          case 's': // Toggle sidebar
            preventDefault();
            // TODO: Toggle sidebar visibility
            break;
          case 'a': // AI suggestions
            preventDefault();
            // TODO: Toggle AI suggestions
            break;
          case 'c': // Insert code block
            // This would be handled by the chat component
            break;
          case 'f': // Find and replace
            preventDefault();
            // TODO: Open find and replace
            break;
        }
      }

      // Cmd+Alt shortcuts
      if (isCmd && isAlt && !isShift) {
        switch (key) {
          case 'i': // Developer tools
            preventDefault();
            // TODO: Toggle dev tools
            break;
        }
      }

      // Cmd+Ctrl shortcuts (macOS specific)
      if (isCmd && event.ctrlKey && !isShift) {
        switch (key) {
          case 'f': // Full screen
            preventDefault();
            // TODO: Toggle full screen
            break;
        }
      }

      // Theme shortcuts (no modifiers)
      if (!isCmd && !isShift && !isAlt) {
        // Dark/Light mode toggle with D/L keys when not in input
        const target = event.target as HTMLElement;
        const isInput = ['INPUT', 'TEXTAREA'].includes(target.tagName);

        if (!isInput) {
          switch (key) {
            case 'd':
              if (theme !== 'dark') {
                setTheme('dark');
              }
              break;
            case 'l':
              if (theme !== 'light') {
                setTheme('light');
              }
              break;
          }
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, theme, setTheme]);
}
