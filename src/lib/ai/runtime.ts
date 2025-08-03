import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
// Import providers that are available - others will be loaded dynamically
// import { google } from '@ai-sdk/google';
// import { mistral } from '@ai-sdk/mistral';
// import { cohere } from '@ai-sdk/cohere';
// import { groq } from '@ai-sdk/groq';
// import { perplexity } from '@ai-sdk/perplexity';
// import { deepseek } from '@ai-sdk/deepseek';
import { generateText, streamText } from 'ai';
import { getNativeMCPIntegration } from './mcpNative';
import { getAvailableTools } from './tools';
import { getProviderManager } from './providers/manager';
import { getAuthManager } from './providers/auth';
import { isModelAccessible } from './providers/subscription';
import { globalRateLimiter } from './providers/rate-limiting';
import type { ModelConfig, ProviderConfig } from './providers/types';

// Types for AI SDK compatibility
interface CoreMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type AITool = {
  description: string;
  parameters: any;
  execute: (args: unknown) => Promise<unknown>;
};

export interface AIProvider {
  id: string;
  name: string;
  models: string[];
  defaultModel: string;
}

export interface AgentConfig {
  providerId: string;
  modelId: string;
  systemPrompt: string;
  tools: string[];
  maxSteps: number;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentResult {
  text: string;
  toolCalls?: any[];
  usage?:
    | {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      }
    | undefined;
  finishReason?: string;
  rawResponse?: any;
  warnings?: any[];
  providerMetadata?: any;
}

export interface StreamingAgentResult {
  stream: AsyncIterable<string>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Enhanced AI Runtime with MCP Integration
 */

// Legacy providers object for backward compatibility - now dynamically generated
export function getProviders(): Record<string, AIProvider> {
  const manager = getProviderManager();
  const authenticatedProviders = manager.getAuthenticatedProviders();

  const legacyProviders: Record<string, AIProvider> = {};

  for (const providerInstance of authenticatedProviders) {
    const models = providerInstance.models.filter((m) => m.is_active).map((m) => m.model_id);

    const defaultModel =
      providerInstance.models.find((m) => m.is_default && m.is_active)?.model_id || models[0];

    if (models.length > 0) {
      legacyProviders[providerInstance.id] = {
        id: providerInstance.id,
        name: providerInstance.provider.display_name,
        models,
        defaultModel,
      };
    }
  }

  return legacyProviders;
}

// Backward compatibility
export const providers = getProviders();

/**
 * Enhanced AI Runtime with MCP Integration
 */
export class AIRuntime {
  private provider: string;
  private model: string;
  private tools: Record<string, AITool> = {};
  private modelConfig: ModelConfig | null = null;
  private providerManager = getProviderManager();
  private authManager = getAuthManager();

  constructor(provider?: string, model?: string) {
    // If no provider specified, try to use the first authenticated provider
    if (!provider) {
      const authenticatedProviders = this.providerManager.getAuthenticatedProviders();
      if (authenticatedProviders.length > 0) {
        const firstProvider = authenticatedProviders[0];
        this.provider = firstProvider.id;
        this.model =
          model ||
          firstProvider.models.find((m) => m.is_default)?.model_id ||
          firstProvider.models[0]?.model_id ||
          '';
      } else {
        console.warn('No authenticated providers available. Using offline mode.');
        // Set default values for offline mode
        this.provider = '';
        this.model = '';
      }
    } else {
      this.provider = provider;
      this.model = model || this.getDefaultModelForProvider(provider);
    }

    // Get model configuration
    if (this.provider && this.model) {
      this.updateModelConfig();
      this.initializeTools();
    }
  }

  /**
   * Get default model for a provider
   */
  private getDefaultModelForProvider(providerId: string): string {
    const provider = this.providerManager.getProvider(providerId);
    if (!provider || provider.auth_status !== 'authenticated') {
      throw new Error(`Provider ${providerId} is not authenticated`);
    }

    const defaultModel = provider.models.find((m) => m.is_default && m.is_active);
    const firstActiveModel = provider.models.find((m) => m.is_active);

    return defaultModel?.model_id || firstActiveModel?.model_id || '';
  }

  /**
   * Update model configuration from provider manager
   */
  private updateModelConfig(): void {
    const provider = this.providerManager.getProvider(this.provider);
    if (!provider) {
      throw new Error(`Provider ${this.provider} not found`);
    }

    this.modelConfig = provider.models.find((m) => m.model_id === this.model) || null;
    if (!this.modelConfig) {
      throw new Error(`Model ${this.model} not found for provider ${this.provider}`);
    }
  }

  /**
   * Initialize tools from both static and MCP sources using native AI SDK
   */
  private async initializeTools(): Promise<void> {
    try {
      // Get static tools
      const staticTools = await getAvailableTools();

      // Get MCP tools using native AI SDK integration
      const nativeMCP = getNativeMCPIntegration();
      await nativeMCP.initialize();
      const mcpTools = nativeMCP.getAllTools();

      // Combine all tools
      this.tools = { ...staticTools, ...mcpTools };
    } catch (error) {
      console.warn('Failed to initialize tools:', error);
      // Fallback to static tools only
      try {
        this.tools = await getAvailableTools();
      } catch (fallbackError) {
        console.error('Failed to load static tools:', fallbackError);
        this.tools = {};
      }
    }
  }

  /**
   * Get the AI model instance with authentication
   */
  private async getModel() {
    // Verify authentication
    const isAuthenticated = await this.authManager.isAuthenticated(this.provider);
    if (!isAuthenticated) {
      throw new Error(`Provider ${this.provider} is not authenticated`);
    }

    // Get the authentication config to check if it's OAuth
    const authConfig = await this.authManager.getAuthConfig(this.provider);
    const isOAuth = authConfig?.method === 'oauth2';

    // Check model access for subscription users
    if (authConfig && !isModelAccessible(this.model, authConfig)) {
      const planName = authConfig.subscription_info?.plan_name || 'your subscription';
      throw new Error(
        `Model ${this.model} is not accessible with ${planName}. Please upgrade your plan or select a different model.`
      );
    }

    // Get authentication headers
    const authHeaders = await this.authManager.getAuthHeaders(this.provider);

    switch (this.provider) {
      case 'anthropic':
        // Handle both API key and OAuth subscription authentication
        if (isOAuth && authConfig?.credentials?.access_token) {
          // Use OAuth token for Pro/Max subscription access
          // The token is used directly as the API key (without "Bearer " prefix)
          console.log('Using Anthropic OAuth token for Pro/Max subscription access');
          return anthropic(this.model, {
            apiKey: authConfig.credentials.access_token,
          });
        }
        // Default to API key authentication
        return anthropic(this.model);

      case 'openai':
        // OpenAI SDK uses Authorization: Bearer header by default
        if (isOAuth && authConfig?.credentials?.access_token) {
          // OpenAI doesn't actually support OAuth for API access
          console.warn('OpenAI does not support OAuth for API access');
        }
        return openai(this.model);

      case 'google':
        // Google SDK can use OAuth tokens
        if (isOAuth && authConfig?.credentials?.access_token) {
          // For Google, we'd need to pass the OAuth token
          // This would require the google SDK to be installed
          console.log('Google OAuth token available for API access');
        }
        throw new Error(
          `Provider ${this.provider} SDK not installed. Please install the corresponding @ai-sdk/${this.provider} package.`
        );

      // Other providers will be supported when their SDK packages are installed
      case 'mistral':
      case 'cohere':
      case 'groq':
      case 'perplexity':
      case 'deepseek':
        throw new Error(
          `Provider ${this.provider} SDK not installed. Please install the corresponding @ai-sdk/${this.provider} package.`
        );

      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Stream text generation with tool support and usage tracking
   */
  async streamText(
    messages: CoreMessage[],
    options: {
      onChunk?: (chunk: string) => void;
      onToolCall?: (toolCall: any) => void;
      onFinish?: (result: any) => void;
      maxTokens?: number;
      temperature?: number;
      abortSignal?: AbortSignal;
      toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string };
    } = {}
  ) {
    // Check rate limits for subscription users
    const authConfig = await this.authManager.getAuthConfig(this.provider);
    if (authConfig?.method === 'oauth2' && authConfig.subscription_info) {
      const rateLimitCheck = globalRateLimiter.canMakeRequest(
        this.provider,
        this.model,
        authConfig
      );
      
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
      }
    }

    // Ensure tools are loaded
    await this.initializeTools();

    const model = await this.getModel();
    const startTime = Date.now();

    return streamText({
      model: model as any,
      messages,
      tools: this.tools,
      maxRetries: 2,
      temperature: options.temperature || 0.7,
      maxSteps: options.maxTokens ? Math.ceil(options.maxTokens / 1000) : undefined,
      ...(options.abortSignal && { abortSignal: options.abortSignal }),
      ...(options.toolChoice && { toolChoice: options.toolChoice }),
      onChunk: (chunk) => {
        if (chunk.chunk?.type === 'text-delta') {
          options.onChunk?.(chunk.chunk.text);
        }
      },
      onStepFinish: (step) => {
        if (step.toolCalls?.length) {
          options.onToolCall?.(step.toolCalls);
        }
      },
      onFinish: (result) => {
        // Track usage
        this.trackUsage(result, startTime);
        
        // Record rate limit usage for subscription users
        if (authConfig?.method === 'oauth2' && authConfig.subscription_info) {
          globalRateLimiter.recordUsage(this.provider, this.model);
        }
        
        options.onFinish?.(result);
      },
    });
  }

  /**
   * Generate text with tool support and usage tracking (non-streaming)
   */
  async generateText(
    messages: CoreMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
      toolChoice?: 'auto' | 'none' | 'required' | { type: 'tool'; toolName: string };
    } = {}
  ) {
    // Check rate limits for subscription users
    const authConfig = await this.authManager.getAuthConfig(this.provider);
    if (authConfig?.method === 'oauth2' && authConfig.subscription_info) {
      const rateLimitCheck = globalRateLimiter.canMakeRequest(
        this.provider,
        this.model,
        authConfig
      );
      
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
      }
    }

    // Ensure tools are loaded
    await this.initializeTools();

    const model = await this.getModel();
    const startTime = Date.now();

    const result = await generateText({
      model: model as any,
      messages,
      tools: this.tools,
      maxRetries: 2,
      temperature: options.temperature || 0.7,
      maxSteps: options.maxTokens ? Math.ceil(options.maxTokens / 1000) : undefined,
      ...(options.toolChoice && { toolChoice: options.toolChoice }),
    });

    // Track usage
    this.trackUsage(result, startTime);

    // Record rate limit usage for subscription users
    if (authConfig?.method === 'oauth2' && authConfig.subscription_info) {
      globalRateLimiter.recordUsage(this.provider, this.model);
    }

    return result;
  }

  /**
   * Track API usage for analytics and cost monitoring
   */
  private trackUsage(result: any, startTime: number): void {
    if (!this.modelConfig || !result.usage) return;

    const inputTokens = result.usage.promptTokens || 0;
    const outputTokens = result.usage.completionTokens || 0;
    const pricing = this.modelConfig.limits.pricing;

    let cost = 0;
    if (pricing) {
      const inputCost = (inputTokens / 1000) * (pricing.input_tokens_per_1k || 0);
      const outputCost = (outputTokens / 1000) * (pricing.output_tokens_per_1k || 0);
      cost = inputCost + outputCost;
    }

    const usage = {
      provider_id: this.provider,
      model_id: this.modelConfig.id,
      requests: 1,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      date: new Date().toISOString().split('T')[0]!, // YYYY-MM-DD format
    };

    try {
      this.providerManager.recordUsage(usage);
    } catch (error) {
      console.warn('Failed to record usage:', error);
    }
  }

  /**
   * Get available tools (refreshes from MCP if needed)
   */
  async getAvailableTools(): Promise<Record<string, AITool>> {
    await this.initializeTools();
    return { ...this.tools };
  }

  /**
   * Refresh tools from MCP servers
   */
  async refreshTools(): Promise<void> {
    const nativeMCP = getNativeMCPIntegration();
    await nativeMCP.refreshAllTools();
    await this.initializeTools();
  }

  /**
   * Get tool statistics
   */
  getToolStats(): {
    totalTools: number;
    staticTools: number;
    mcpTools: number;
    toolsByServer: Record<string, number>;
  } {
    const nativeMCP = getNativeMCPIntegration();
    const mcpStats = nativeMCP.getStats();

    const totalTools = Object.keys(this.tools).length;
    const mcpTools = mcpStats.totalTools;
    const staticTools = totalTools - mcpTools;

    return {
      totalTools,
      staticTools,
      mcpTools,
      toolsByServer: mcpStats.toolsByServer,
    };
  }

  /**
   * Update provider and model
   */
  updateConfig(provider: string, model?: string): void {
    // Validate provider is authenticated
    const providerInstance = this.providerManager.getProvider(provider);
    if (!providerInstance || providerInstance.auth_status !== 'authenticated') {
      throw new Error(`Provider ${provider} is not authenticated`);
    }

    this.provider = provider;
    this.model = model || this.getDefaultModelForProvider(provider);
    this.updateModelConfig();
  }

  /**
   * Set model by ModelConfig
   */
  setModel(modelConfig: ModelConfig): void {
    this.provider = modelConfig.provider;
    this.model = modelConfig.model_id;
    this.modelConfig = modelConfig;
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return this.providerManager.getAuthenticatedProviders();
  }

  /**
   * Get available models
   */
  getAvailableModels() {
    return this.providerManager.getAvailableModels();
  }

  /**
   * Get models for a specific provider
   */
  getModelsForProvider(providerId: string) {
    const provider = this.providerManager.getProvider(providerId);
    return provider?.models.filter((m) => m.is_active) || [];
  }

  /**
   * Get current model configuration
   */
  getModelConfig(): ModelConfig | null {
    return this.modelConfig;
  }

  /**
   * Get provider usage statistics
   */
  getUsageStats(days = 30) {
    return this.providerManager.getUsageStats(this.provider, days);
  }

  /**
   * Get total usage across all providers
   */
  getTotalUsage(days = 30) {
    return this.providerManager.getTotalUsage(days);
  }

  /**
   * Get rate limit status for subscription users
   */
  async getRateLimitStatus() {
    const authConfig = await this.authManager.getAuthConfig(this.provider);
    if (authConfig?.method === 'oauth2' && authConfig.subscription_info) {
      return globalRateLimiter.getRateLimitStatus(this.provider, this.model, authConfig);
    }
    return null;
  }

  /**
   * Get usage summary for subscription users
   */
  async getUsageSummary(): Promise<string | null> {
    const authConfig = await this.authManager.getAuthConfig(this.provider);
    if (authConfig?.method === 'oauth2' && authConfig.subscription_info) {
      return globalRateLimiter.getUsageSummary(this.provider, this.model, authConfig);
    }
    return null;
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<{
    provider: string;
    model: string;
    toolCount: number;
    modelConfig: ModelConfig | null;
    isAuthenticated: boolean;
    capabilities: string[];
  }> {
    const capabilities = this.modelConfig
      ? Object.entries(this.modelConfig.capabilities)
          .filter(([_, enabled]) => enabled)
          .map(([capability, _]) => capability)
      : [];

    return {
      provider: this.provider,
      model: this.model,
      toolCount: Object.keys(this.tools).length,
      modelConfig: this.modelConfig,
      isAuthenticated: await this.authManager.isAuthenticated(this.provider),
      capabilities,
    };
  }

  /**
   * Generate response (compatibility method for agents)
   */
  async generateResponse(
    messages: CoreMessage[],
    options: {
      maxTokens?: number;
      temperature?: number;
      stopWhen?: (text: string, toolCalls: unknown[]) => boolean;
    } = {}
  ): Promise<AgentResult> {
    const result = await this.generateText(messages, options);
    return {
      text: result.text,
      toolCalls: result.toolCalls,
      usage: result.usage
        ? {
            promptTokens: (result.usage as any).promptTokens || 0,
            completionTokens: (result.usage as any).completionTokens || 0,
            totalTokens: result.usage.totalTokens || 0,
          }
        : undefined,
      finishReason: result.finishReason,
      rawResponse: (result as any).rawResponse,
      warnings: (result as any).warnings,
      providerMetadata: (result as any).providerMetadata,
    };
  }

  /**
   * Stream response (compatibility method for agents)
   */
  async streamResponse(messages: CoreMessage[]): Promise<{
    stream: ReadableStream<string>;
    onFinish: Promise<AgentResult>;
  }> {
    let finalResult: AgentResult | null = null;

    const result = await this.streamText(messages, {
      onFinish: (result) => {
        finalResult = {
          text: result.text,
          toolCalls: result.toolCalls,
          usage: result.usage,
          finishReason: result.finishReason,
        };
      },
    });

    const stream = new ReadableStream<string>({
      async start(controller) {
        for await (const chunk of result.textStream) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    return {
      stream,
      onFinish: new Promise((resolve) => {
        const checkResult = () => {
          if (finalResult) {
            resolve(finalResult);
          } else {
            setTimeout(checkResult, 10);
          }
        };
        checkResult();
      }),
    };
  }

  /**
   * Sequential task execution (compatibility method for agents)
   */
  async sequential(tasks: Array<{ prompt: string }>): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    for (const task of tasks) {
      const result = await this.generateResponse([{ role: 'user', content: task.prompt }]);
      results.push(result);
    }
    return results;
  }

  /**
   * Parallel task execution (compatibility method for agents)
   */
  async parallel(tasks: Array<{ prompt: string }>): Promise<AgentResult[]> {
    const promises = tasks.map((task) =>
      this.generateResponse([{ role: 'user', content: task.prompt }])
    );
    return Promise.all(promises);
  }
}

// Alias for backward compatibility
export class AgentRuntime extends AIRuntime {
  constructor(config?: AgentConfig | string, model?: string) {
    if (typeof config === 'string') {
      super(config, model);
    } else if (config) {
      super(config.providerId, config.modelId);
    } else {
      super();
    }
  }
}

/**
 * Default AI runtime instance
 */
let _defaultAIRuntime: AIRuntime | null = null;

try {
  _defaultAIRuntime = new AIRuntime();
} catch (error) {
  console.warn('Failed to initialize default AI runtime:', error);
  // Will be initialized later when providers are available
}

export const defaultAIRuntime = _defaultAIRuntime || ({} as AIRuntime);

/**
 * Create a new AI runtime instance
 */
export function createAIRuntime(provider?: string, model?: string): AIRuntime {
  return new AIRuntime(provider, model);
}
