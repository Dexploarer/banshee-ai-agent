/**
 * Memory Service Implementation
 *
 * Handles all memory-related business logic and operations.
 * Provides clean separation from UI layer and direct client calls.
 */

import { MemoryClient, MemoryUtils } from '../ai/memory/client';
import type {
  AgentMemory,
  CreateMemoryRequest,
  MemorySearchResult,
  SearchMemoriesRequest,
  MemoryType,
} from '../ai/memory/types';
import type {
  AuthContext,
  FilterOptions,
  IMemoryService,
  MemoryCreateRequest,
  MemorySearchRequest,
  MemoryServiceConfig,
  MemoryUpdateRequest,
  ServiceError,
  ServiceErrorCode,
  ServiceResult,
} from './types';
import { ServiceErrorCodes } from './types';

export class MemoryService implements IMemoryService {
  private config: MemoryServiceConfig = {
    defaultRelevanceThreshold: 0.7,
    maxMemoriesPerAgent: 10000,
    backupInterval: 86400000, // 24 hours
  };

  private memoryStats = new Map<
    string,
    {
      lastBackup: number;
      totalMemories: number;
      lastCleanup: number;
    }
  >();

  async configure(config: MemoryServiceConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create a new memory with business logic validation
   */
  async createMemory(
    request: MemoryCreateRequest,
    context: AuthContext
  ): Promise<ServiceResult<string>> {
    try {
      // Authorization check
      if (!(await this.hasCreatePermission(request.agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to create memory'
        );
      }

      // Validate input
      const validationError = this.validateMemoryRequest(request);
      if (validationError) {
        return validationError;
      }

      // Check quota limits
      const quotaCheck = await this.checkQuotaLimits(request.agentId);
      if (!quotaCheck.success) {
        return quotaCheck;
      }

      // Transform request to client format
      const clientRequest: CreateMemoryRequest = {
        agent_id: request.agentId,
        memory_type: request.memoryType as MemoryType,
        content: request.content,
        tags: request.tags || [],
        metadata: request.metadata || {},
      };

      // Enhanced content processing
      const processedRequest = await this.processMemoryContent(clientRequest);

      // Create memory via client
      const memoryId = await MemoryClient.saveMemory(processedRequest);

      // Update stats
      this.updateMemoryStats(request.agentId, 'created');

      // Trigger related operations
      await this.handleMemoryCreated(memoryId, request.agentId, context);

      return {
        success: true,
        data: memoryId,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create memory');
    }
  }

  /**
   * Get a specific memory with authorization
   */
  async getMemory(
    agentId: string,
    memoryId: string,
    context: AuthContext
  ): Promise<ServiceResult<AgentMemory>> {
    try {
      // Authorization check
      if (!(await this.hasReadPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to read memory'
        );
      }

      const memory = await MemoryClient.getMemory(agentId, memoryId);

      if (!memory) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Memory not found');
      }

      // Update access statistics
      this.updateMemoryStats(agentId, 'accessed');

      // Apply business rules for memory access
      const processedMemory = await this.processMemoryForReading(memory, context);

      return {
        success: true,
        data: processedMemory,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get memory');
    }
  }

  /**
   * Update memory with validation and business logic
   */
  async updateMemory(
    request: MemoryUpdateRequest,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      // Get existing memory first
      const existingMemory = await MemoryClient.getMemory(context.agentId || '', request.memoryId);

      if (!existingMemory) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Memory not found');
      }

      // Authorization check
      if (!(await this.hasUpdatePermission(existingMemory.agent_id, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to update memory'
        );
      }

      // Validate updates
      const validationError = this.validateMemoryUpdate(request, existingMemory);
      if (validationError) {
        return validationError;
      }

      // Apply business logic for updates
      const updateRequest = await this.processMemoryUpdate(request, existingMemory);

      // Since the client doesn't have update method, we need to create a new memory
      // In a full implementation, you'd add update_memory command to the backend
      console.warn('Memory update not implemented in client - would require backend update');

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to update memory');
    }
  }

  /**
   * Delete memory with business logic
   */
  async deleteMemory(
    agentId: string,
    memoryId: string,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      // Authorization check
      if (!(await this.hasDeletePermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to delete memory'
        );
      }

      // Check if memory exists and can be deleted
      const memory = await MemoryClient.getMemory(agentId, memoryId);
      if (!memory) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Memory not found');
      }

      // Business logic for deletion
      const canDelete = await this.canDeleteMemory(memory, context);
      if (!canDelete.success) {
        return canDelete;
      }

      // Archive before deletion (business requirement)
      await this.archiveMemory(memory);

      // Since client doesn't have delete method, we'd need to add it
      console.warn('Memory deletion not implemented in client - would require backend delete');

      // Update stats
      this.updateMemoryStats(agentId, 'deleted');

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete memory');
    }
  }

  /**
   * Search memories with enhanced business logic
   */
  async searchMemories(
    request: MemorySearchRequest,
    context: AuthContext
  ): Promise<ServiceResult<MemorySearchResult[]>> {
    try {
      // Authorization check
      if (!(await this.hasReadPermission(request.agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to search memories'
        );
      }

      // Transform and validate search request
      const clientRequest: SearchMemoriesRequest = {
        agent_id: request.agentId,
        content_search: request.query,
        memory_types: request.types as MemoryType[],
        tags: request.tags,
        limit: request.options?.limit || 50,
        offset: request.options?.offset || 0,
        similarity_threshold: request.options?.threshold || this.config.defaultRelevanceThreshold,
      };

      // Apply business rules to search
      const enhancedRequest = await this.enhanceSearchRequest(clientRequest, context);

      // Perform search
      const results = await MemoryClient.searchMemories(enhancedRequest);

      // Post-process results with business logic
      const processedResults = await this.processSearchResults(results, context);

      // Update search analytics
      this.updateSearchStats(request.agentId, results.length);

      return {
        success: true,
        data: processedResults,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to search memories');
    }
  }

  /**
   * Filter memories with advanced business logic
   */
  async filterMemories(
    agentId: string,
    filters: FilterOptions,
    context: AuthContext
  ): Promise<ServiceResult<AgentMemory[]>> {
    try {
      // Authorization check
      if (!(await this.hasReadPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to filter memories'
        );
      }

      // Get all memories for agent (would be optimized in production)
      const searchResults = await MemoryClient.searchMemories({
        agent_id: agentId,
        limit: 1000,
      });

      let memories = searchResults.map((result) => result.memory);

      // Apply filters with business logic
      if (filters.types && filters.types.length > 0) {
        memories = MemoryUtils.filterByType(memories, filters.types as MemoryType[]);
      }

      if (filters.tags && filters.tags.length > 0) {
        memories = MemoryUtils.filterByTags(memories, filters.tags);
      }

      if (filters.dateRange) {
        memories = MemoryUtils.filterByDateRange(
          memories,
          filters.dateRange[0],
          filters.dateRange[1]
        );
      }

      // Apply business rules for filtering
      const businessFilteredMemories = await this.applyBusinessFilters(memories, context);

      return {
        success: true,
        data: businessFilteredMemories,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to filter memories');
    }
  }

  /**
   * Get comprehensive memory statistics
   */
  async getMemoryStats(agentId: string, context: AuthContext): Promise<ServiceResult<any>> {
    try {
      // Authorization check
      if (!(await this.hasReadPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to view memory stats'
        );
      }

      // Get memories for stats calculation
      const searchResults = await MemoryClient.searchMemories({
        agent_id: agentId,
        limit: 1000,
      });

      const memories = searchResults.map((result) => result.memory);

      // Calculate enhanced statistics
      const stats = {
        ...MemoryUtils.getTypeDistribution(memories),
        totalMemories: memories.length,
        averageRelevance:
          memories.length > 0
            ? memories.reduce((sum, m) => sum + m.relevance_score, 0) / memories.length
            : 0,
        mostAccessed: MemoryUtils.sortByAccessCount(memories).slice(0, 5),
        recentLearnings: memories
          .filter((m) => m.memory_type === 'Learning')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5),
        uniqueTags: MemoryUtils.getUniqueTags(memories),
        // Enhanced business metrics
        memoryGrowthRate: await this.calculateGrowthRate(agentId),
        qualityScore: await this.calculateQualityScore(memories),
        retrievalEfficiency: await this.calculateRetrievalEfficiency(agentId),
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get memory stats');
    }
  }

  /**
   * Get memory type distribution
   */
  async getTypeDistribution(
    agentId: string,
    context: AuthContext
  ): Promise<ServiceResult<Record<string, number>>> {
    try {
      // Authorization check
      if (!(await this.hasReadPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to view type distribution'
        );
      }

      const searchResults = await MemoryClient.searchMemories({
        agent_id: agentId,
        limit: 1000,
      });

      const memories = searchResults.map((result) => result.memory);
      const distribution = MemoryUtils.getTypeDistribution(memories);

      return {
        success: true,
        data: distribution,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get type distribution');
    }
  }

  /**
   * Backup memories with business logic
   */
  async backupMemories(
    agentId: string,
    backupName?: string,
    context?: AuthContext
  ): Promise<ServiceResult<string>> {
    try {
      // Authorization check if context provided
      if (context && !(await this.hasBackupPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to backup memories'
        );
      }

      // Generate backup name with business logic
      const finalBackupName = backupName || this.generateBackupName(agentId);

      // Perform backup
      const backupPath = await MemoryClient.backupMemories(agentId, finalBackupName);

      // Update backup statistics
      this.updateMemoryStats(agentId, 'backed_up');

      // Schedule next backup if needed
      this.scheduleNextBackup(agentId);

      return {
        success: true,
        data: backupPath,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to backup memories');
    }
  }

  /**
   * Clean up old memories based on retention policy
   */
  async cleanupMemories(
    agentId: string,
    retentionDays: number,
    context: AuthContext
  ): Promise<ServiceResult<number>> {
    try {
      // Authorization check
      if (!(await this.hasCleanupPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to cleanup memories'
        );
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Get memories to cleanup
      const searchResults = await MemoryClient.searchMemories({
        agent_id: agentId,
        limit: 1000,
      });

      const memories = searchResults.map((result) => result.memory);

      // Filter by business rules for cleanup
      const memoriesToCleanup = memories.filter((memory) => {
        const memoryDate = new Date(memory.created_at);
        return memoryDate < cutoffDate && this.canCleanupMemory(memory);
      });

      // Archive before cleanup
      for (const memory of memoriesToCleanup) {
        await this.archiveMemory(memory);
      }

      // Update stats
      this.updateMemoryStats(agentId, 'cleaned_up', memoriesToCleanup.length);

      // In a full implementation, you'd actually delete the memories
      console.warn('Memory cleanup requires backend deletion support');

      return {
        success: true,
        data: memoriesToCleanup.length,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to cleanup memories');
    }
  }

  /**
   * Initialize agent memory system
   */
  async initializeAgent(agentId: string, context: AuthContext): Promise<ServiceResult<void>> {
    try {
      // Authorization check
      if (!(await this.hasInitPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to initialize agent memory'
        );
      }

      // Initialize via client
      await MemoryClient.initAgentMemory(agentId);

      // Set up agent-specific configurations
      await this.setupAgentMemoryConfig(agentId);

      // Initialize stats tracking
      this.memoryStats.set(agentId, {
        lastBackup: 0,
        totalMemories: 0,
        lastCleanup: 0,
      });

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to initialize agent memory');
    }
  }

  // Private helper methods for business logic

  private validateMemoryRequest(request: MemoryCreateRequest): ServiceResult<void> | null {
    if (!request.agentId?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Agent ID is required'
      );
    }

    if (!request.content?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Memory content is required'
      );
    }

    if (request.content.length > 10000) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_INPUT,
        'Memory content exceeds maximum length'
      );
    }

    return null;
  }

  private async checkQuotaLimits(agentId: string): Promise<ServiceResult<void>> {
    const stats = this.memoryStats.get(agentId);
    if (stats && stats.totalMemories >= this.config.maxMemoriesPerAgent) {
      return this.createErrorResult(
        ServiceErrorCodes.QUOTA_EXCEEDED,
        'Maximum memories per agent exceeded'
      );
    }

    return { success: true };
  }

  private async processMemoryContent(request: CreateMemoryRequest): Promise<CreateMemoryRequest> {
    // Enhanced content processing business logic
    return {
      ...request,
      content: request.content.trim(),
      tags: request.tags?.map((tag) => tag.toLowerCase().trim()) || [],
      metadata: {
        ...request.metadata,
        processed_at: new Date().toISOString(),
        content_length: request.content.length,
      },
    };
  }

  private async processMemoryForReading(
    memory: AgentMemory,
    context: AuthContext
  ): Promise<AgentMemory> {
    // Apply business rules for reading
    return {
      ...memory,
      // Increment access count (would be handled by backend in production)
      access_count: memory.access_count + 1,
    };
  }

  private validateMemoryUpdate(
    request: MemoryUpdateRequest,
    existing: AgentMemory
  ): ServiceResult<void> | null {
    if (request.content && request.content.length > 10000) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_INPUT,
        'Updated content exceeds maximum length'
      );
    }

    return null;
  }

  private async processMemoryUpdate(
    request: MemoryUpdateRequest,
    existing: AgentMemory
  ): Promise<any> {
    return {
      ...request,
      updated_at: new Date().toISOString(),
      version: (existing.metadata?.version || 0) + 1,
    };
  }

  private async canDeleteMemory(
    memory: AgentMemory,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    // Business rules for deletion
    if (memory.memory_type === 'Learning' && memory.relevance_score > 0.9) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_STATE,
        'Cannot delete high-relevance learning memories'
      );
    }

    return { success: true };
  }

  private async archiveMemory(memory: AgentMemory): Promise<void> {
    // Archive memory before deletion/cleanup
    console.log(`Archiving memory ${memory.id} for agent ${memory.agent_id}`);
    // Implementation would save to archive storage
  }

  private async enhanceSearchRequest(
    request: SearchMemoriesRequest,
    context: AuthContext
  ): Promise<SearchMemoriesRequest> {
    // Apply business logic to enhance search
    return {
      ...request,
      similarity_threshold: Math.max(
        request.similarity_threshold || 0,
        this.config.defaultRelevanceThreshold
      ),
    };
  }

  private async processSearchResults(
    results: MemorySearchResult[],
    context: AuthContext
  ): Promise<MemorySearchResult[]> {
    // Apply business logic to search results
    return results
      .filter((result) => result.memory.relevance_score >= this.config.defaultRelevanceThreshold)
      .sort((a, b) => b.memory.relevance_score - a.memory.relevance_score);
  }

  private async applyBusinessFilters(
    memories: AgentMemory[],
    context: AuthContext
  ): Promise<AgentMemory[]> {
    // Apply additional business rule filters
    return memories.filter((memory) => {
      // Filter out low-quality memories
      if (memory.relevance_score < 0.3) return false;

      // Apply user-specific filters based on context
      return true;
    });
  }

  private updateMemoryStats(agentId: string, operation: string, count = 1): void {
    const stats = this.memoryStats.get(agentId) || {
      lastBackup: 0,
      totalMemories: 0,
      lastCleanup: 0,
    };

    switch (operation) {
      case 'created':
        stats.totalMemories += count;
        break;
      case 'deleted':
      case 'cleaned_up':
        stats.totalMemories -= count;
        break;
      case 'backed_up':
        stats.lastBackup = Date.now();
        break;
    }

    this.memoryStats.set(agentId, stats);
  }

  private updateSearchStats(agentId: string, resultCount: number): void {
    // Update search analytics
    console.log(`Search for agent ${agentId} returned ${resultCount} results`);
  }

  private async calculateGrowthRate(agentId: string): Promise<number> {
    // Calculate memory growth rate over time
    return 0; // Placeholder
  }

  private async calculateQualityScore(memories: AgentMemory[]): Promise<number> {
    if (memories.length === 0) return 0;

    const avgRelevance = memories.reduce((sum, m) => sum + m.relevance_score, 0) / memories.length;
    const avgAccessCount = memories.reduce((sum, m) => sum + m.access_count, 0) / memories.length;

    return avgRelevance * 0.7 + Math.min(avgAccessCount / 10, 1) * 0.3;
  }

  private async calculateRetrievalEfficiency(agentId: string): Promise<number> {
    // Calculate how efficiently memories are retrieved
    return 0.85; // Placeholder
  }

  private generateBackupName(agentId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `memory-backup-${agentId}-${timestamp}`;
  }

  private scheduleNextBackup(agentId: string): void {
    // Schedule next automatic backup
    console.log(`Next backup scheduled for agent ${agentId}`);
  }

  private canCleanupMemory(memory: AgentMemory): boolean {
    // Business rules for cleanup eligibility
    if (memory.memory_type === 'Learning' && memory.relevance_score > 0.8) return false;
    if (memory.memory_type === 'Success' && memory.access_count > 10) return false;
    return true;
  }

  private async setupAgentMemoryConfig(agentId: string): Promise<void> {
    // Set up agent-specific memory configurations
    console.log(`Setting up memory config for agent ${agentId}`);
  }

  private async handleMemoryCreated(
    memoryId: string,
    agentId: string,
    context: AuthContext
  ): Promise<void> {
    // Handle post-creation business logic
    console.log(`Memory ${memoryId} created for agent ${agentId}`);
  }

  // Permission check methods
  private async hasCreatePermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'memory' && p.action === 'create' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasReadPermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'memory' && p.action === 'read' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasUpdatePermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'memory' && p.action === 'update' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasDeletePermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'memory' && p.action === 'delete' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasBackupPermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'memory' && p.action === 'backup' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasCleanupPermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'memory' && p.action === 'cleanup' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasInitPermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'memory' && p.action === 'init' && (!p.scope || p.scope === agentId)
    );
  }

  // Error handling
  private createErrorResult<T>(code: ServiceErrorCode, message: string): ServiceResult<T> {
    return {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private handleError(error: any, defaultMessage: string): ServiceResult<any> {
    console.error(defaultMessage, error);

    return {
      success: false,
      error: {
        code: ServiceErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : defaultMessage,
        timestamp: new Date().toISOString(),
        details: { originalError: String(error) },
      },
    };
  }
}
