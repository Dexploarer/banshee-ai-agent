import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { BarChart3, Bot, TestTube } from 'lucide-react';

export type WorkspaceTab = 'build' | 'test' | 'analytics';

interface WorkspaceTabsProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  hasActiveAgent?: boolean;
  className?: string;
}

const TABS = [
  {
    id: 'build' as const,
    label: 'Agent Builder',
    icon: Bot,
    description: 'Create and customize agents',
    requiresAgent: false,
  },
  {
    id: 'test' as const,
    label: 'Test Lab',
    icon: TestTube,
    description: 'Test agent behavior',
    requiresAgent: true,
  },
  {
    id: 'analytics' as const,
    label: 'Analytics',
    icon: BarChart3,
    description: 'Usage metrics and insights',
    requiresAgent: true,
  },
] as const;

export function WorkspaceTabs({
  activeTab,
  onTabChange,
  hasActiveAgent = false,
  className,
}: WorkspaceTabsProps) {
  return (
    <div className={cn('border-b bg-card/50', className)}>
      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as WorkspaceTab)}>
        <TabsList className="h-12 bg-transparent border-0 rounded-none w-full justify-start px-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isDisabled = tab.requiresAgent && !hasActiveAgent;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                disabled={isDisabled}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 h-10',
                  'data-[state=active]:bg-background data-[state=active]:shadow-sm',
                  'data-[state=active]:border data-[state=active]:border-border',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'hover:bg-accent/50 transition-colors'
                )}
              >
                <Icon className="w-4 h-4" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Tab Description */}
      <div className="px-6 pb-3">
        <p className="text-xs text-muted-foreground">
          {TABS.find((tab) => tab.id === activeTab)?.description}
          {!hasActiveAgent && activeTab !== 'build' && (
            <span className="text-amber-600 ml-2">• Select or create an agent to continue</span>
          )}
        </p>
      </div>
    </div>
  );
}
