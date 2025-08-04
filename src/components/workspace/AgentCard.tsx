import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DbAgent } from '@/lib/database';
import { cn } from '@/lib/utils';
import {
  Bot,
  Brain,
  Code,
  Database,
  Edit,
  MoreVertical,
  Settings,
  Trash2,
  User,
} from 'lucide-react';
import { useState } from 'react';

interface AgentCardProps {
  agent: DbAgent;
  isSelected?: boolean;
  onSelect?: (agent: DbAgent) => void;
  onEdit?: (agent: DbAgent) => void;
  onDelete?: (agent: DbAgent) => void;
  className?: string;
}

const ROLE_ICONS = {
  assistant: Bot,
  analyst: Brain,
  developer: Code,
  researcher: Database,
  creative: User,
  technical: Settings,
} as const;

const ROLE_COLORS = {
  assistant: 'bg-blue-500',
  analyst: 'bg-green-500',
  developer: 'bg-orange-500',
  researcher: 'bg-purple-500',
  creative: 'bg-pink-500',
  technical: 'bg-indigo-500',
} as const;

export function AgentCard({
  agent,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  className,
}: AgentCardProps) {
  const [_showMenu, setShowMenu] = useState(false);

  const IconComponent = ROLE_ICONS[agent.character_role as keyof typeof ROLE_ICONS] || Bot;
  const roleColor = ROLE_COLORS[agent.character_role as keyof typeof ROLE_COLORS] || 'bg-gray-500';

  const handleSelect = () => {
    onSelect?.(agent);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(agent);
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(agent);
    setShowMenu(false);
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
        isSelected ? 'ring-2 ring-primary bg-primary/5 border-primary/30' : 'hover:bg-accent/50',
        className
      )}
      onClick={handleSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Agent Icon */}
            <div className={cn('p-2 rounded-lg text-white flex-shrink-0', roleColor)}>
              <IconComponent className="w-4 h-4" />
            </div>

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate mb-1">{agent.name}</h3>
              {agent.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {agent.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{agent.character_role}</span>
                <span>•</span>
                <span>{agent.provider_id}</span>
              </div>
            </div>
          </div>

          {/* Menu Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Agent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Model Info */}
        <div className="mt-2 pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{agent.model_id.split('-').slice(-1)[0]}</span>
            <span>temp: {agent.temperature}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
