/**
 * Model Selector Component
 *
 * UI for selecting AI models from authenticated providers
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getProviderManager } from '@/lib/ai/providers/manager';
import type { ModelConfig } from '@/lib/ai/providers/types';
import { cn } from '@/lib/utils';
import {
  Brain,
  Clock,
  Database,
  DollarSign,
  Eye,
  Filter,
  Headphones,
  MessageSquare,
  Mic,
  Palette,
  Search,
  Settings,
  Star,
  Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect: (model: ModelConfig) => void;
  capabilities?: string[];
  className?: string;
}

export function ModelSelector({
  selectedModel,
  onModelSelect,
  capabilities,
  className,
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [filteredModels, setFilteredModels] = useState<ModelConfig[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedCapability, setSelectedCapability] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [detailsModel, setDetailsModel] = useState<ModelConfig | null>(null);

  const manager = getProviderManager();

  useEffect(() => {
    const availableModels = manager.getAvailableModels();
    setModels(availableModels);
    setFilteredModels(availableModels);
  }, [manager]);

  useEffect(() => {
    let filtered = models;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (model) =>
          model.display_name.toLowerCase().includes(query) ||
          model.provider.toLowerCase().includes(query) ||
          model.description?.toLowerCase().includes(query) ||
          model.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by provider
    if (selectedProvider !== 'all') {
      filtered = filtered.filter((model) => model.provider === selectedProvider);
    }

    // Filter by capability
    if (selectedCapability !== 'all') {
      filtered = filtered.filter(
        (model) => (model.capabilities as unknown as Record<string, boolean>)[selectedCapability] === true
      );
    }

    // Filter by required capabilities
    if (capabilities && capabilities.length > 0) {
      filtered = filtered.filter((model) =>
        capabilities.every((cap) => (model.capabilities as unknown as Record<string, boolean>)[cap] === true)
      );
    }

    setFilteredModels(filtered);
  }, [models, searchQuery, selectedProvider, selectedCapability, capabilities]);

  const providers = Array.from(new Set(models.map((m) => m.provider)));
  const capabilityOptions = [
    { key: 'chat_completion', label: 'Chat', icon: MessageSquare },
    { key: 'vision', label: 'Vision', icon: Eye },
    { key: 'audio_input', label: 'Audio Input', icon: Mic },
    { key: 'audio_output', label: 'Audio Output', icon: Headphones },
    { key: 'image_generation', label: 'Image Generation', icon: Palette },
    { key: 'embeddings', label: 'Embeddings', icon: Database },
    { key: 'function_calling', label: 'Function Calling', icon: Settings },
    { key: 'multimodal', label: 'Multimodal', icon: Brain },
  ];

  const openModelDetails = (model: ModelConfig) => {
    setDetailsModel(model);
    setShowDetails(true);
  };

  const getCapabilityIcon = (capability: string) => {
    const option = capabilityOptions.find((opt) => opt.key === capability);
    if (!option) return <Zap className="h-3 w-3" />;

    const Icon = option.icon;
    return <Icon className="h-3 w-3" />;
  };

  const getCapabilityLabel = (capability: string) => {
    const option = capabilityOptions.find((opt) => opt.key === capability);
    return option?.label || capability;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 3,
    }).format(amount);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Select Model</h3>
          <p className="text-sm text-muted-foreground">{filteredModels.length} models available</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {models.length} Total
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Models</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, provider, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="capability">Capability</Label>
              <Select value={selectedCapability} onValueChange={setSelectedCapability}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Capabilities</SelectItem>
                  {capabilityOptions.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredModels.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            isSelected={model.id === selectedModel}
            onSelect={() => onModelSelect(model)}
            onViewDetails={() => openModelDetails(model)}
          />
        ))}
      </div>

      {filteredModels.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Models Found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search query</p>
          </CardContent>
        </Card>
      )}

      {/* Model Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailsModel?.display_name}
              <Badge variant="outline">{detailsModel?.provider}</Badge>
            </DialogTitle>
            <DialogDescription>{detailsModel?.description}</DialogDescription>
          </DialogHeader>

          {detailsModel && (
            <div className="space-y-6">
              {/* Capabilities */}
              <div>
                <h4 className="font-semibold mb-3">Capabilities</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(detailsModel.capabilities)
                    .filter(([_, enabled]) => enabled)
                    .map(([capability, _]) => (
                      <div
                        key={capability}
                        className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                      >
                        {getCapabilityIcon(capability)}
                        <span className="text-sm">{getCapabilityLabel(capability)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Limits & Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Limits</h4>
                  <div className="space-y-2 text-sm">
                    {detailsModel.limits.max_tokens && (
                      <div className="flex justify-between">
                        <span>Max Tokens:</span>
                        <span>{detailsModel.limits.max_tokens.toLocaleString()}</span>
                      </div>
                    )}
                    {detailsModel.limits.context_window && (
                      <div className="flex justify-between">
                        <span>Context Window:</span>
                        <span>{detailsModel.limits.context_window.toLocaleString()}</span>
                      </div>
                    )}
                    {detailsModel.limits.rate_limit?.requests_per_minute && (
                      <div className="flex justify-between">
                        <span>Rate Limit:</span>
                        <span>{detailsModel.limits.rate_limit.requests_per_minute}/min</span>
                      </div>
                    )}
                  </div>
                </div>

                {detailsModel.limits.pricing && (
                  <div>
                    <h4 className="font-semibold mb-3">Pricing</h4>
                    <div className="space-y-2 text-sm">
                      {detailsModel.limits.pricing.input_tokens_per_1k && (
                        <div className="flex justify-between">
                          <span>Input (per 1K tokens):</span>
                          <span>
                            {formatCurrency(detailsModel.limits.pricing.input_tokens_per_1k)}
                          </span>
                        </div>
                      )}
                      {detailsModel.limits.pricing.output_tokens_per_1k && (
                        <div className="flex justify-between">
                          <span>Output (per 1K tokens):</span>
                          <span>
                            {formatCurrency(detailsModel.limits.pricing.output_tokens_per_1k)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {detailsModel.tags && detailsModel.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailsModel.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    onModelSelect(detailsModel);
                    setShowDetails(false);
                  }}
                >
                  Select Model
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ModelCardProps {
  model: ModelConfig;
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}

function ModelCard({ model, isSelected, onSelect, onViewDetails }: ModelCardProps) {
  const enabledCapabilities = Object.entries(model.capabilities)
    .filter(([_, enabled]) => enabled)
    .map(([capability, _]) => capability);

  const getProviderIcon = () => {
    // You could add custom icons for each provider here
    return <Brain className="h-4 w-4" />;
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover-lift',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-secondary rounded-lg">{getProviderIcon()}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{model.display_name}</h3>
                <p className="text-sm text-muted-foreground">{model.provider}</p>
              </div>
            </div>
            {model.is_default && (
              <Badge variant="default" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Default
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">{model.description}</p>

          {/* Capabilities */}
          <div className="flex flex-wrap gap-1">
            {enabledCapabilities.slice(0, 3).map((capability) => (
              <Badge key={capability} variant="outline" className="text-xs">
                {capability.replace('_', ' ')}
              </Badge>
            ))}
            {enabledCapabilities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{enabledCapabilities.length - 3} more
              </Badge>
            )}
          </div>

          {/* Pricing */}
          {model.limits.pricing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>${model.limits.pricing.input_tokens_per_1k}/1K in</span>
              <span>•</span>
              <span>${model.limits.pricing.output_tokens_per_1k}/1K out</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {model.limits.context_window
                  ? `${(model.limits.context_window / 1000).toFixed(0)}K context`
                  : 'No limit'}
              </span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails();
              }}
            >
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
