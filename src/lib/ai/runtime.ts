import { type CoreMessage, type LanguageModel, type Tool, generateText, streamText } from 'ai';
import pino from 'pino';
import { getModel } from './providers';
import { agentTools } from './tools';

const logger = pino({
  level: 'info',
  browser: { asObject: true },
});

export interface AgentConfig {
  providerId: string;
  modelId?: string;
  systemPrompt?: string;
  maxSteps?: number;
  temperature?: number;
  tools?: string[] | 'all' | Record<string, Tool<any, any>>;
  enableLogging?: boolean;
}

export interface AgentResult {
  text: string;
  steps: number;
  toolCalls: Array<{
    tool: string;
    args: unknown;
    result: unknown;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamingAgentResult {
  stream: ReadableStream<string>;
  onFinish: Promise<{
    text: string;
    steps: number;
    toolCalls: Array<{ tool: string; args: unknown; result: unknown }>;
  }>;
}

export class AgentRuntime {
  private config: Required<AgentConfig>;
  private model: LanguageModel;
  private tools: Record<string, Tool<any, any>>;

  constructor(config: AgentConfig) {
    this.config = {
      providerId: config.providerId,
      modelId: config.modelId,
      systemPrompt: config.systemPrompt || 'You are a helpful AI assistant.',
      maxSteps: config.maxSteps || 10,
      temperature: config.temperature || 0.7,
      tools: config.tools || {},
      enableLogging: config.enableLogging ?? true,
    };

    this.model = getModel(this.config.providerId, this.config.modelId);
    this.tools = this.resolveTools(this.config.tools);

    if (this.config.enableLogging) {
      logger.info({
        action: 'agent_runtime_initialized',
        provider: this.config.providerId,
        model: this.config.modelId,
        toolCount: Object.keys(this.tools).length,
      });
    }
  }

  private resolveTools(
    toolsConfig: string[] | 'all' | Record<string, Tool<any, any>>
  ): Record<string, Tool<any, any>> {
    if (toolsConfig === 'all') {
      return agentTools;
    }

    if (Array.isArray(toolsConfig)) {
      return Object.fromEntries(
        toolsConfig.map((name) => [name, agentTools[name]]).filter(([, tool]) => tool)
      );
    }

    return toolsConfig;
  }

  async generateResponse(
    messages: CoreMessage[],
    options: {
      stopWhen?: (text: string, toolCalls: unknown[]) => boolean;
      onStep?: (step: number, text: string) => void;
    } = {}
  ): Promise<AgentResult> {
    const { stopWhen, onStep } = options;
    let steps = 0;
    const allToolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [];

    if (this.config.enableLogging) {
      logger.info({
        action: 'generate_response_start',
        messageCount: messages.length,
        toolsAvailable: Object.keys(this.tools),
      });
    }

    try {
      const result = await generateText({
        model: this.model,
        system: this.config.systemPrompt,
        messages,
        tools: this.tools,
        temperature: this.config.temperature,
        maxSteps: this.config.maxSteps,
        onStepFinish: (stepResult) => {
          steps++;
          const text = stepResult.text || '';
          onStep?.(steps, text);

          // Process content parts for tool calls and results
          if (stepResult.content) {
            for (const part of stepResult.content) {
              if (part.type === 'tool-call') {
                allToolCalls.push({
                  tool: part.toolName,
                  args: part.args,
                  result: undefined,
                });
              } else if (part.type === 'tool-result') {
                // Find the corresponding tool call and update its result
                const toolCall = allToolCalls.find(
                  (tc) => tc.tool === part.toolName && tc.result === undefined
                );
                if (toolCall) {
                  toolCall.result = part.result;
                }
              }
            }
          }

          if (this.config.enableLogging) {
            logger.info({
              action: 'agent_step_completed',
              step: steps,
              text: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
              toolCalls: allToolCalls.length,
            });
          }
        },
        stopWhen: stopWhen
          ? (stepResult) => {
              const toolCalls =
                stepResult.content
                  ?.filter((p) => p.type === 'tool-call')
                  .map((p: any) => ({ toolName: p.toolName, args: p.args })) || [];
              return stopWhen(stepResult.text || '', toolCalls);
            }
          : undefined,
      });

      const agentResult: AgentResult = {
        text: result.text || '',
        steps,
        toolCalls: allToolCalls,
        usage: result.usage
          ? {
              promptTokens: (result.usage as any).promptTokens || 0,
              completionTokens: (result.usage as any).completionTokens || 0,
              totalTokens: result.usage.totalTokens || 0,
            }
          : undefined,
      };

      if (this.config.enableLogging) {
        logger.info({
          action: 'generate_response_completed',
          steps,
          toolCallCount: allToolCalls.length,
          textLength: result.text.length,
          usage: agentResult.usage,
        });
      }

      return agentResult;
    } catch (error) {
      if (this.config.enableLogging) {
        logger.error({
          action: 'generate_response_error',
          error: error instanceof Error ? error.message : String(error),
          steps,
        });
      }
      throw error;
    }
  }

  async streamResponse(
    messages: CoreMessage[],
    options: {
      stopWhen?: (text: string, toolCalls: unknown[]) => boolean;
      onStep?: (step: number, text: string) => void;
    } = {}
  ): Promise<StreamingAgentResult> {
    const { stopWhen, onStep } = options;
    let steps = 0;
    const allToolCalls: Array<{ tool: string; args: unknown; result: unknown }> = [];

    if (this.config.enableLogging) {
      logger.info({
        action: 'stream_response_start',
        messageCount: messages.length,
      });
    }

    const result = streamText({
      model: this.model,
      system: this.config.systemPrompt,
      messages,
      tools: this.tools,
      temperature: this.config.temperature,
      maxSteps: this.config.maxSteps,
      onStepFinish: (stepResult) => {
        steps++;
        const text = stepResult.text || '';
        onStep?.(steps, text);

        // Process content parts for tool calls and results
        if (stepResult.content) {
          for (const part of stepResult.content) {
            if (part.type === 'tool-call') {
              allToolCalls.push({
                tool: part.toolName,
                args: part.args,
                result: undefined,
              });
            } else if (part.type === 'tool-result') {
              // Find the corresponding tool call and update its result
              const toolCall = allToolCalls.find(
                (tc) => tc.tool === part.toolName && tc.result === undefined
              );
              if (toolCall) {
                toolCall.result = part.result;
              }
            }
          }
        }
      },
      stopWhen: stopWhen
        ? (stepResult) => {
            const toolCalls =
              stepResult.content
                ?.filter((p) => p.type === 'tool-call')
                .map((p: any) => ({ toolName: p.toolName, args: p.args })) || [];
            return stopWhen(stepResult.text || '', toolCalls);
          }
        : undefined,
    });

    return {
      stream: result.textStream,
      onFinish: (async () => {
        const finishResult = await result;
        return {
          text: result.text || '',
          steps,
          toolCalls: allToolCalls,
        };
      })(),
    };
  }

  // Convenience methods for different agent patterns
  async sequential(tasks: Array<{ prompt: string; tools?: string[] }>): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    let context = '';

    for (const [index, task] of tasks.entries()) {
      const taskTools = task.tools
        ? Object.fromEntries(
            task.tools.map((name) => [name, agentTools[name]]).filter(([, tool]) => tool)
          )
        : this.tools;

      const runtime = new AgentRuntime({
        ...this.config,
        tools: taskTools,
        systemPrompt: `${this.config.systemPrompt}\n\nPrevious context: ${context}`,
      });

      const result = await runtime.generateResponse([{ role: 'user', content: task.prompt }]);

      results.push(result);
      context += `\nTask ${index + 1}: ${task.prompt}\nResult: ${result.text}`;
    }

    return results;
  }

  async parallel(tasks: Array<{ prompt: string; tools?: string[] }>): Promise<AgentResult[]> {
    const promises = tasks.map((task) => {
      const taskTools = task.tools
        ? Object.fromEntries(
            task.tools.map((name) => [name, agentTools[name]]).filter(([, tool]) => tool)
          )
        : this.tools;

      const runtime = new AgentRuntime({
        ...this.config,
        tools: taskTools,
      });

      return runtime.generateResponse([{ role: 'user', content: task.prompt }]);
    });

    return Promise.all(promises);
  }
}
