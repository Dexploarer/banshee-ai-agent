import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';
import { BarChart3, Bot, MessageSquare, Settings, Zap } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import bansheeLogoTransparent from '@/assets/banshee-logo-transparent.png';
import bansheeLogoWhite from '@/assets/banshee-logo-white.png';

const navigationItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Analytics & monitoring',
  },
  {
    title: 'Chat',
    href: '/chat',
    icon: MessageSquare,
    description: 'AI conversations',
  },
  {
    title: 'Agents',
    href: '/agents',
    icon: Bot,
    description: 'Manage AI agents',
  },
  {
    title: 'MCP',
    href: '/mcp',
    icon: Zap,
    description: 'Model Context Protocol',
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Configuration',
  },
];

export function Navigation() {
  return (
    <aside className="w-64 border-r bg-card/80 glass">
      <nav className="flex h-full flex-col p-4">
        {/* Logo/Brand */}
        <div className="mb-8 flex items-center gap-3">
          <img src={bansheeLogoTransparent} alt="Banshee Logo" className="h-10 w-10 dark:hidden" />
          <img src={bansheeLogoWhite} alt="Banshee Logo" className="h-10 w-10 hidden dark:block" />
          <div>
            <h1 className="text-2xl font-bold text-gradient">Banshee</h1>
            <p className="text-sm text-muted-foreground">AI Agent Portal</p>
          </div>
        </div>

        {/* Navigation Items */}
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-300',
                      'hover:bg-accent/20 hover:text-accent-foreground hover-lift',
                      isActive
                        ? 'bg-gradient-primary text-primary-foreground glow-primary'
                        : 'text-muted-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-xs opacity-70">{item.description}</span>
                  </div>
                </NavLink>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="mt-auto pt-4 space-y-3">
          <div className="flex items-center justify-between px-3">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <div className="rounded-lg bg-gradient-secondary p-3 glass">
            <p className="text-xs text-muted-foreground">Powered by AI SDK 5 & MCP</p>
          </div>
        </div>
      </nav>
    </aside>
  );
}
