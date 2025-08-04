/**
 * Model Selector Dropdown Component
 *
 * Compact dropdown for selecting AI models in the chat interface
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProviderManager } from '@/lib/ai/providers/manager';
import type { ModelConfig } from '@/lib/ai/providers/types';
import { createAIRuntime } from '@/lib/ai/runtime';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Brain,
  Check,
  ChevronDown,
  DollarSign,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ModelSelectorDropdownProps {
  onModelSelect?: (model: ModelConfig) => void;
  className?: string;
}

export function ModelSelectorDropdown({ onModelSelect, className }: ModelSelectorDropdownProps) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [groupedModels, setGroupedModels] = useState<Record<string, ModelConfig[]>>({});
  const navigate = useNavigate();

  const manager = getProviderManager();

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = () => {
    const availableModels = manager.getAvailableModels();
    setModels(availableModels);

    // Group models by provider
    const grouped: Record<string, ModelConfig[]> = {};
    for (const model of availableModels) {
      if (!grouped[model.provider]) {
        grouped[model.provider] = [];
      }
      grouped[model.provider]!.push(model);
    }
    setGroupedModels(grouped);

    // Select default model
    const defaultModel = availableModels.find((m) => m.is_default) || availableModels[0];
    if (defaultModel && !selectedModel) {
      handleModelSelect(defaultModel);
    }
  };

  const handleModelSelect = (model: ModelConfig) => {
    setSelectedModel(model);

    // Update the global AI runtime
    try {
      const runtime = createAIRuntime(model.provider, model.model_id);
      runtime.setModel(model);
      onModelSelect?.(model);
    } catch (error) {
      console.error('Failed to set model:', error);
    }
  };

  const formatPrice = (model: ModelConfig) => {
    const pricing = model.limits.pricing;
    if (!pricing) return 'Free';

    const input = pricing.input_tokens_per_1k || 0;
    const output = pricing.output_tokens_per_1k || 0;

    if (input === 0 && output === 0) return 'Free';

    return `$${input}/$${output}`;
  };

  const getProviderIcon = () => {
    // You could add custom icons for each provider
    return <Brain className="h-4 w-4" />;
  };

  if (models.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/settings')}
        className={cn('flex items-center gap-2', className)}
      >
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <span>No Models Available</span>
        <Settings className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('flex items-center gap-2 min-w-[200px]', className)}
        >
          {selectedModel ? (
            <>
              {getProviderIcon()}
              <span className="flex-1 text-left truncate">{selectedModel.display_name}</span>
              {selectedModel.tags?.includes('2025') && (
                <Sparkles className="h-3 w-3 text-yellow-500" />
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              <span>Select Model</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Available Models</span>
          <Badge variant="outline" className="text-xs">
            {models.length} models
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {Object.entries(groupedModels).map(([provider, providerModels]) => (
          <DropdownMenuGroup key={provider}>
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">
              {provider}
            </DropdownMenuLabel>
            {providerModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="p-1.5 bg-secondary rounded">{getProviderIcon()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{model.display_name}</span>
                      {model.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                      {selectedModel?.id === model.id && (
                        <Check className="h-3 w-3 text-primary ml-auto" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {model.limits.context_window
                          ? `${(model.limits.context_window / 1000).toFixed(0)}K context`
                          : 'No limit'}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {formatPrice(model)}
                      </span>
                      {model.capabilities.reasoning && (
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Reasoning
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Manage Providers
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
