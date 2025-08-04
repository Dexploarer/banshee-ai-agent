import { useMCPStore } from '@/store/mcpStore';

/**
 * MCP Elicitation Support (2025-06-18 Specification)
 *
 * Elicitation allows MCP servers to request additional information during interaction,
 * enabling more dynamic and interactive AI experiences by gathering necessary context
 * before executing tasks.
 */

export interface ElicitationRequest {
  id: string;
  type: 'question' | 'choice' | 'confirmation' | 'input';
  prompt: string;
  options?: string[];
  required?: boolean;
  context?: Record<string, unknown>;
}

export interface ElicitationResponse {
  requestId: string;
  response: string | boolean | number;
  metadata?: Record<string, unknown>;
}

export interface ElicitationCapability {
  supported: boolean;
  types: Array<'question' | 'choice' | 'confirmation' | 'input'>;
  maxConcurrent?: number;
}

export class ElicitationManager {
  private activeRequests = new Map<string, ElicitationRequest>();
  private responseCallbacks = new Map<string, (response: ElicitationResponse) => void>();
  private capabilities = new Map<string, ElicitationCapability>();

  /**
   * Register elicitation capabilities for a server
   */
  registerServerCapabilities(serverId: string, capabilities: ElicitationCapability): void {
    this.capabilities.set(serverId, capabilities);
  }

  /**
   * Check if a server supports elicitation
   */
  supportsElicitation(serverId: string): boolean {
    const capability = this.capabilities.get(serverId);
    return capability?.supported ?? false;
  }

  /**
   * Create an elicitation request
   */
  async createElicitationRequest(
    serverId: string,
    request: Omit<ElicitationRequest, 'id'>
  ): Promise<string> {
    const requestId = crypto.randomUUID();
    const fullRequest: ElicitationRequest = {
      id: requestId,
      ...request,
    };

    this.activeRequests.set(requestId, fullRequest);

    // Emit elicitation event that can be handled by UI components
    this.emitElicitationEvent('request', {
      serverId,
      request: fullRequest,
    });

    return requestId;
  }

  /**
   * Respond to an elicitation request
   */
  async respondToElicitation(response: ElicitationResponse): Promise<void> {
    const request = this.activeRequests.get(response.requestId);
    if (!request) {
      throw new Error(`Elicitation request ${response.requestId} not found`);
    }

    // Validate response based on request type
    this.validateElicitationResponse(request, response);

    // Execute callback if registered
    const callback = this.responseCallbacks.get(response.requestId);
    if (callback) {
      callback(response);
    }

    // Clean up
    this.activeRequests.delete(response.requestId);
    this.responseCallbacks.delete(response.requestId);

    // Emit completion event
    this.emitElicitationEvent('response', {
      request,
      response,
    });
  }

  /**
   * Register a callback for when an elicitation is responded to
   */
  onElicitationResponse(
    requestId: string,
    callback: (response: ElicitationResponse) => void
  ): void {
    this.responseCallbacks.set(requestId, callback);
  }

  /**
   * Get all active elicitation requests
   */
  getActiveRequests(): ElicitationRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Cancel an elicitation request
   */
  cancelElicitation(requestId: string): void {
    this.activeRequests.delete(requestId);
    this.responseCallbacks.delete(requestId);

    this.emitElicitationEvent('cancel', { requestId });
  }

  /**
   * Validate elicitation response
   */
  private validateElicitationResponse(
    request: ElicitationRequest,
    response: ElicitationResponse
  ): void {
    switch (request.type) {
      case 'question':
      case 'input':
        if (typeof response.response !== 'string') {
          throw new Error('Question/input elicitation requires string response');
        }
        break;
      case 'confirmation':
        if (typeof response.response !== 'boolean') {
          throw new Error('Confirmation elicitation requires boolean response');
        }
        break;
      case 'choice':
        if (!request.options?.includes(String(response.response))) {
          throw new Error('Choice response must be one of the provided options');
        }
        break;
    }

    if (request.required && (response.response === '' || response.response == null)) {
      throw new Error('Response is required for this elicitation');
    }
  }

  /**
   * Emit elicitation events (can be extended for more sophisticated event handling)
   */
  private emitElicitationEvent(type: string, data: Record<string, unknown>): void {
    // Dispatch custom event for UI components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mcp-elicitation', {
          detail: { type, data, timestamp: new Date().toISOString() },
        })
      );
    }

    console.log(`Elicitation event: ${type}`, data);
  }

  /**
   * Enhanced tool execution with elicitation support
   */
  async executeToolWithElicitation(
    serverId: string,
    toolName: string,
    args: unknown,
    toolExecutor: (args: unknown) => Promise<Record<string, unknown>>
  ): Promise<Record<string, unknown>> {
    try {
      // First attempt normal execution
      const result = await toolExecutor(args);

      // Check if result contains elicitation requests
      if (result._meta?.elicitationPrompts?.length > 0) {
        return this.handleElicitationPrompts(serverId, result);
      }

      return result;
    } catch (error: unknown) {
      // Check if error indicates missing information that could be elicited
      if (this.isElicitableError(error)) {
        const requestId = await this.createElicitationRequest(serverId, {
          type: 'question',
          prompt: `Additional information needed: ${error.message}`,
          required: true,
          context: { toolName, args, error: error.message },
        });

        // Return pending status
        return {
          status: 'pending_elicitation',
          requestId,
          message: 'Waiting for additional information',
        };
      }

      throw error;
    }
  }

  /**
   * Handle elicitation prompts from tool results
   */
  private async handleElicitationPrompts(
    serverId: string,
    result: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const prompts = result._meta.elicitationPrompts;
    const responses: ElicitationResponse[] = [];

    for (const prompt of prompts) {
      const requestId = await this.createElicitationRequest(serverId, {
        type: prompt.type || 'question',
        prompt: prompt.text || prompt.prompt,
        options: prompt.options,
        required: prompt.required ?? true,
        context: prompt.context,
      });

      // For now, return pending status - UI will handle the prompts
      responses.push({
        requestId,
        response: '',
        metadata: { status: 'pending' },
      });
    }

    return {
      ...result,
      elicitationResponses: responses,
      status: 'pending_elicitation',
    };
  }

  /**
   * Check if an error indicates missing information that could be elicited
   */
  private isElicitableError(error: unknown): boolean {
    const elicitableMessages = [
      'missing required parameter',
      'insufficient context',
      'ambiguous request',
      'need more information',
      'clarification required',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return elicitableMessages.some((msg) => errorMessage.includes(msg));
  }

  /**
   * Get server elicitation capabilities
   */
  getServerCapabilities(serverId: string): ElicitationCapability | null {
    return this.capabilities.get(serverId) || null;
  }

  /**
   * Update server capabilities (called when server connects)
   */
  updateServerCapabilities(serverId: string, capabilities: ElicitationCapability): void {
    this.registerServerCapabilities(serverId, capabilities);
  }

  /**
   * Clean up capabilities when server disconnects
   */
  removeServerCapabilities(serverId: string): void {
    this.capabilities.delete(serverId);

    // Cancel any active requests for this server
    for (const [requestId, request] of this.activeRequests) {
      if (request.context?.serverId === serverId) {
        this.cancelElicitation(requestId);
      }
    }
  }
}

/**
 * Global elicitation manager instance
 */
let globalElicitationManager: ElicitationManager | null = null;

/**
 * Get the global elicitation manager
 */
export function getElicitationManager(): ElicitationManager {
  if (!globalElicitationManager) {
    globalElicitationManager = new ElicitationManager();
    setupElicitationStoreIntegration(globalElicitationManager);
  }
  return globalElicitationManager;
}

/**
 * Setup integration with MCP store for automatic capability management
 */
function setupElicitationStoreIntegration(manager: ElicitationManager): void {
  // Subscribe to MCP store changes
  useMCPStore.subscribe((state) => {
    const connectedServers = state.getConnectedServers();

    // Update capabilities for connected servers
    for (const server of connectedServers) {
      // Assume elicitation is supported for all servers with 2025-06-18 protocol
      manager.updateServerCapabilities(server.id, {
        supported: true,
        types: ['question', 'choice', 'confirmation', 'input'],
        maxConcurrent: 5,
      });
    }
  });
}

/**
 * Cleanup global elicitation manager
 */
export function cleanupElicitationManager(): void {
  globalElicitationManager = null;
}
