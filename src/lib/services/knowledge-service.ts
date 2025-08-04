/**
 * Knowledge Service Implementation
 *
 * Handles shared knowledge management, collaboration, and discovery.
 * Implements business logic for knowledge sharing between agents.
 */

import { MemoryClient } from '../ai/memory/client';
import type {
  CreateKnowledgeRequest as ClientKnowledgeRequest,
  SharedKnowledge,
  KnowledgeType,
} from '../ai/memory/types';
import type {
  AuthContext,
  IKnowledgeService,
  KnowledgeCreateRequest,
  KnowledgeSearchRequest,
  KnowledgeServiceConfig,
  ServiceError,
  ServiceErrorCode,
  ServiceResult,
} from './types';
import { ServiceErrorCodes } from './types';

export class KnowledgeService implements IKnowledgeService {
  private config: KnowledgeServiceConfig = {
    confidenceThreshold: 0.8,
    maxKnowledgeItems: 5000,
    syncInterval: 3600000, // 1 hour
  };

  private knowledgeStats = new Map<
    string,
    {
      totalKnowledge: number;
      lastSync: number;
      sharedCount: number;
    }
  >();

  private knowledgeCache = new Map<string, SharedKnowledge>();
  private popularityScores = new Map<string, number>();

  async configure(config: KnowledgeServiceConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create shared knowledge with business validation
   */
  async createKnowledge(
    request: KnowledgeCreateRequest,
    context: AuthContext
  ): Promise<ServiceResult<string>> {
    try {
      // Authorization check
      if (!(await this.hasCreateKnowledgePermission(context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to create knowledge'
        );
      }

      // Validate input
      const validationError = this.validateKnowledgeRequest(request);
      if (validationError) {
        return validationError;
      }

      // Check for duplicates
      const duplicateCheck = await this.checkForDuplicates(request);
      if (!duplicateCheck.success) {
        return duplicateCheck;
      }

      // Check quota limits
      const quotaCheck = await this.checkKnowledgeQuota();
      if (!quotaCheck.success) {
        return quotaCheck;
      }

      // Transform request to client format
      const clientRequest: ClientKnowledgeRequest = {
        knowledge_type: request.knowledgeType as KnowledgeType,
        title: request.title,
        content: request.content,
        source_agent: request.sourceAgent,
        tags: request.tags || [],
      };

      // Enhanced knowledge processing
      const processedRequest = await this.processKnowledgeContent(clientRequest, context);

      // Create knowledge via client
      const knowledgeId = await MemoryClient.saveKnowledge(processedRequest);

      // Update cache and stats
      await this.updateKnowledgeCache(knowledgeId, processedRequest);
      this.updateKnowledgeStats('created');

      // Handle post-creation business logic
      await this.handleKnowledgeCreated(knowledgeId, request, context);

      return {
        success: true,
        data: knowledgeId,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create knowledge');
    }
  }

  /**
   * Get shared knowledge by ID
   */
  async getKnowledge(
    knowledgeId: string,
    context: AuthContext
  ): Promise<ServiceResult<SharedKnowledge>> {
    try {
      // Authorization check
      if (!(await this.hasReadKnowledgePermission(context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to read knowledge'
        );
      }

      // Check cache first
      let knowledge = this.knowledgeCache.get(knowledgeId);

      if (!knowledge) {
        // In a full implementation, you'd have a get_knowledge command
        console.warn('Get knowledge not implemented in client - would require backend support');
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Knowledge not found');
      }

      // Apply business rules for knowledge access
      const processedKnowledge = await this.processKnowledgeForReading(knowledge, context);

      // Update popularity metrics
      this.updatePopularityScore(knowledgeId);

      return {
        success: true,
        data: processedKnowledge,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get knowledge');
    }
  }

  /**
   * Update shared knowledge
   */
  async updateKnowledge(
    knowledgeId: string,
    updates: Partial<KnowledgeCreateRequest>,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      // Get existing knowledge
      const existingKnowledge = this.knowledgeCache.get(knowledgeId);
      if (!existingKnowledge) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Knowledge not found');
      }

      // Authorization check - must be source agent or have special permissions
      if (!(await this.hasUpdateKnowledgePermission(existingKnowledge, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to update knowledge'
        );
      }

      // Validate updates
      const validationError = this.validateKnowledgeUpdate(updates, existingKnowledge);
      if (validationError) {
        return validationError;
      }

      // Apply business logic for versioning
      const versionedUpdate = await this.createVersionedUpdate(existingKnowledge, updates, context);

      // In a full implementation, you'd have update_knowledge command
      console.warn('Update knowledge not implemented in client - would require backend support');

      // Update cache
      const updatedKnowledge = { ...existingKnowledge, ...versionedUpdate };
      this.knowledgeCache.set(knowledgeId, updatedKnowledge);

      // Handle post-update business logic
      await this.handleKnowledgeUpdated(knowledgeId, updates, context);

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to update knowledge');
    }
  }

  /**
   * Delete shared knowledge
   */
  async deleteKnowledge(knowledgeId: string, context: AuthContext): Promise<ServiceResult<void>> {
    try {
      const knowledge = this.knowledgeCache.get(knowledgeId);
      if (!knowledge) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Knowledge not found');
      }

      // Authorization check
      if (!(await this.hasDeleteKnowledgePermission(knowledge, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to delete knowledge'
        );
      }

      // Business logic for deletion
      const canDelete = await this.canDeleteKnowledge(knowledge, context);
      if (!canDelete.success) {
        return canDelete;
      }

      // Archive before deletion
      await this.archiveKnowledge(knowledge);

      // Remove from cache
      this.knowledgeCache.delete(knowledgeId);
      this.popularityScores.delete(knowledgeId);

      // In a full implementation, you'd have delete_knowledge command
      console.warn('Delete knowledge not implemented in client - would require backend support');

      this.updateKnowledgeStats('deleted');

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete knowledge');
    }
  }

  /**
   * Search shared knowledge with advanced filtering
   */
  async searchKnowledge(
    request: KnowledgeSearchRequest,
    context: AuthContext
  ): Promise<ServiceResult<SharedKnowledge[]>> {
    try {
      // Authorization check
      if (!(await this.hasSearchKnowledgePermission(context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to search knowledge'
        );
      }

      // Validate search request
      const validationError = this.validateSearchRequest(request);
      if (validationError) {
        return validationError;
      }

      // In a full implementation, you'd have search_knowledge command
      // For now, search through cache
      let results = Array.from(this.knowledgeCache.values());

      // Apply search filters
      if (request.query) {
        results = this.filterByContent(results, request.query);
      }

      if (request.types && request.types.length > 0) {
        results = results.filter((k) => request.types!.includes(k.knowledge_type));
      }

      if (request.confidence !== undefined) {
        results = results.filter((k) => k.confidence_score >= request.confidence!);
      }

      // Apply business logic sorting
      results = await this.applySortingLogic(results, request, context);

      // Apply pagination
      const limit = request.options?.limit || 20;
      const offset = request.options?.offset || 0;
      const paginatedResults = results.slice(offset, offset + limit);

      // Update search analytics
      this.updateSearchAnalytics(request, paginatedResults.length);

      return {
        success: true,
        data: paginatedResults,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to search knowledge');
    }
  }

  /**
   * Get knowledge related to a specific item
   */
  async getRelatedKnowledge(
    knowledgeId: string,
    limit?: number,
    context?: AuthContext
  ): Promise<ServiceResult<SharedKnowledge[]>> {
    try {
      // Authorization check
      if (context && !(await this.hasReadKnowledgePermission(context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to read knowledge'
        );
      }

      const knowledge = this.knowledgeCache.get(knowledgeId);
      if (!knowledge) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Knowledge not found');
      }

      // Find related knowledge using business logic
      const relatedKnowledge = await this.findRelatedKnowledge(knowledge, limit || 10);

      return {
        success: true,
        data: relatedKnowledge,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get related knowledge');
    }
  }

  /**
   * Share knowledge with specific agents
   */
  async shareKnowledge(
    knowledgeId: string,
    targetAgents: string[],
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      const knowledge = this.knowledgeCache.get(knowledgeId);
      if (!knowledge) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Knowledge not found');
      }

      // Authorization check
      if (!(await this.hasShareKnowledgePermission(knowledge, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to share knowledge'
        );
      }

      // Validate target agents
      const validationError = await this.validateTargetAgents(targetAgents);
      if (validationError) {
        return validationError;
      }

      // Apply business rules for sharing
      const shareableAgents = await this.filterShareableAgents(targetAgents, knowledge, context);

      // Create sharing records
      await this.createSharingRecords(knowledgeId, shareableAgents, context);

      // Update knowledge with new sharing info
      const updatedKnowledge = {
        ...knowledge,
        source_agents: [...new Set([...knowledge.source_agents, ...shareableAgents])],
      };
      this.knowledgeCache.set(knowledgeId, updatedKnowledge);

      // Handle post-sharing business logic
      await this.handleKnowledgeShared(knowledgeId, shareableAgents, context);

      this.updateKnowledgeStats('shared', shareableAgents.length);

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to share knowledge');
    }
  }

  /**
   * Merge multiple knowledge items into one
   */
  async mergeKnowledge(
    sourceIds: string[],
    targetTitle: string,
    context: AuthContext
  ): Promise<ServiceResult<string>> {
    try {
      // Authorization check
      if (!(await this.hasMergeKnowledgePermission(context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to merge knowledge'
        );
      }

      // Validate merge request
      const validationError = await this.validateMergeRequest(sourceIds, targetTitle);
      if (validationError) {
        return validationError;
      }

      // Get source knowledge items
      const sourceKnowledge = sourceIds
        .map((id) => this.knowledgeCache.get(id))
        .filter((k) => k !== undefined) as SharedKnowledge[];

      if (sourceKnowledge.length !== sourceIds.length) {
        return this.createErrorResult(
          ServiceErrorCodes.NOT_FOUND,
          'One or more source knowledge items not found'
        );
      }

      // Apply business logic for merging
      const mergedKnowledge = await this.performKnowledgeMerge(
        sourceKnowledge,
        targetTitle,
        context
      );

      // Create new merged knowledge
      const mergeResult = await this.createKnowledge(mergedKnowledge, context);
      if (!mergeResult.success) {
        return mergeResult;
      }

      // Archive source knowledge items
      for (const knowledge of sourceKnowledge) {
        await this.archiveKnowledge(knowledge);
        this.knowledgeCache.delete(knowledge.id);
      }

      // Handle post-merge business logic
      await this.handleKnowledgeMerged(mergeResult.data!, sourceIds, context);

      return mergeResult;
    } catch (error) {
      return this.handleError(error, 'Failed to merge knowledge');
    }
  }

  /**
   * Get knowledge statistics
   */
  async getKnowledgeStats(context: AuthContext): Promise<ServiceResult<any>> {
    try {
      // Authorization check
      if (!(await this.hasStatsPermission(context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to view knowledge stats'
        );
      }

      const allKnowledge = Array.from(this.knowledgeCache.values());

      const stats = {
        totalKnowledge: allKnowledge.length,
        byType: this.getKnowledgeByType(allKnowledge),
        averageConfidence: this.calculateAverageConfidence(allKnowledge),
        topTags: this.getTopTags(allKnowledge),
        mostShared: await this.getMostShared(allKnowledge),
        recentActivity: await this.getRecentActivity(),
        qualityMetrics: await this.calculateQualityMetrics(allKnowledge),
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get knowledge stats');
    }
  }

  /**
   * Get popular knowledge items
   */
  async getPopularKnowledge(
    limit?: number,
    context?: AuthContext
  ): Promise<ServiceResult<SharedKnowledge[]>> {
    try {
      // Authorization check
      if (context && !(await this.hasReadKnowledgePermission(context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to read knowledge'
        );
      }

      const allKnowledge = Array.from(this.knowledgeCache.values());

      // Sort by popularity score (combination of access count, confidence, sharing)
      const popularKnowledge = allKnowledge
        .map((knowledge) => ({
          knowledge,
          popularity: this.calculatePopularityScore(knowledge),
        }))
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, limit || 10)
        .map((item) => item.knowledge);

      return {
        success: true,
        data: popularKnowledge,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get popular knowledge');
    }
  }

  // Private helper methods

  private validateKnowledgeRequest(request: KnowledgeCreateRequest): ServiceResult<void> | null {
    if (!request.title?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Knowledge title is required'
      );
    }

    if (!request.content?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Knowledge content is required'
      );
    }

    if (!request.sourceAgent?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Source agent is required'
      );
    }

    if (request.content.length > 50000) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_INPUT,
        'Knowledge content exceeds maximum length'
      );
    }

    return null;
  }

  private async checkForDuplicates(request: KnowledgeCreateRequest): Promise<ServiceResult<void>> {
    // Check for similar existing knowledge
    const similar = Array.from(this.knowledgeCache.values()).find(
      (k) =>
        k.title.toLowerCase() === request.title.toLowerCase() &&
        k.knowledge_type === request.knowledgeType
    );

    if (similar) {
      return this.createErrorResult(
        ServiceErrorCodes.ALREADY_EXISTS,
        'Similar knowledge already exists'
      );
    }

    return { success: true };
  }

  private async checkKnowledgeQuota(): Promise<ServiceResult<void>> {
    if (this.knowledgeCache.size >= this.config.maxKnowledgeItems) {
      return this.createErrorResult(
        ServiceErrorCodes.QUOTA_EXCEEDED,
        'Maximum knowledge items exceeded'
      );
    }

    return { success: true };
  }

  private async processKnowledgeContent(
    request: ClientKnowledgeRequest,
    context: AuthContext
  ): Promise<ClientKnowledgeRequest> {
    return {
      ...request,
      title: request.title.trim(),
      content: request.content.trim(),
      tags: request.tags?.map((tag) => tag.toLowerCase().trim()) || [],
    };
  }

  private async updateKnowledgeCache(
    knowledgeId: string,
    request: ClientKnowledgeRequest
  ): Promise<void> {
    const knowledge: SharedKnowledge = {
      id: knowledgeId,
      knowledge_type: request.knowledge_type,
      title: request.title,
      content: request.content,
      source_agents: [request.source_agent],
      confidence_score: 1.0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      tags: request.tags || [],
    };

    this.knowledgeCache.set(knowledgeId, knowledge);
  }

  private updateKnowledgeStats(operation: string, count = 1): void {
    // Update global knowledge statistics
    console.log(`Knowledge operation: ${operation}, count: ${count}`);
  }

  private async handleKnowledgeCreated(
    knowledgeId: string,
    request: KnowledgeCreateRequest,
    context: AuthContext
  ): Promise<void> {
    // Post-creation business logic
    console.log(`Knowledge ${knowledgeId} created by ${context.userId}`);
  }

  private async processKnowledgeForReading(
    knowledge: SharedKnowledge,
    context: AuthContext
  ): Promise<SharedKnowledge> {
    // Apply business rules for reading
    return knowledge;
  }

  private updatePopularityScore(knowledgeId: string): void {
    const current = this.popularityScores.get(knowledgeId) || 0;
    this.popularityScores.set(knowledgeId, current + 1);
  }

  private validateKnowledgeUpdate(
    updates: Partial<KnowledgeCreateRequest>,
    existing: SharedKnowledge
  ): ServiceResult<void> | null {
    if (updates.content && updates.content.length > 50000) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_INPUT,
        'Updated content exceeds maximum length'
      );
    }

    return null;
  }

  private async createVersionedUpdate(
    existing: SharedKnowledge,
    updates: Partial<KnowledgeCreateRequest>,
    context: AuthContext
  ): Promise<Partial<SharedKnowledge>> {
    return {
      ...updates,
      updated_at: new Date().toISOString(),
      version: existing.version + 1,
    };
  }

  private async handleKnowledgeUpdated(
    knowledgeId: string,
    updates: Partial<KnowledgeCreateRequest>,
    context: AuthContext
  ): Promise<void> {
    console.log(`Knowledge ${knowledgeId} updated by ${context.userId}`);
  }

  private async canDeleteKnowledge(
    knowledge: SharedKnowledge,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    // Business rules for deletion
    if (knowledge.source_agents.length > 1) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_STATE,
        'Cannot delete knowledge shared by multiple agents'
      );
    }

    return { success: true };
  }

  private async archiveKnowledge(knowledge: SharedKnowledge): Promise<void> {
    console.log(`Archiving knowledge ${knowledge.id}`);
  }

  private validateSearchRequest(request: KnowledgeSearchRequest): ServiceResult<void> | null {
    if (!request.query?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Search query is required'
      );
    }

    return null;
  }

  private filterByContent(knowledge: SharedKnowledge[], query: string): SharedKnowledge[] {
    const searchTerms = query.toLowerCase().split(' ');

    return knowledge.filter((k) => {
      const searchText = `${k.title} ${k.content}`.toLowerCase();
      return searchTerms.some((term) => searchText.includes(term));
    });
  }

  private async applySortingLogic(
    results: SharedKnowledge[],
    request: KnowledgeSearchRequest,
    context: AuthContext
  ): Promise<SharedKnowledge[]> {
    // Sort by relevance, confidence, and popularity
    return results.sort((a, b) => {
      const aScore = a.confidence_score + (this.popularityScores.get(a.id) || 0) * 0.1;
      const bScore = b.confidence_score + (this.popularityScores.get(b.id) || 0) * 0.1;
      return bScore - aScore;
    });
  }

  private updateSearchAnalytics(request: KnowledgeSearchRequest, resultCount: number): void {
    console.log(`Knowledge search for "${request.query}" returned ${resultCount} results`);
  }

  private async findRelatedKnowledge(
    knowledge: SharedKnowledge,
    limit: number
  ): Promise<SharedKnowledge[]> {
    const allKnowledge = Array.from(this.knowledgeCache.values());

    // Find related knowledge by tags and type
    const related = allKnowledge
      .filter((k) => k.id !== knowledge.id)
      .filter(
        (k) =>
          k.knowledge_type === knowledge.knowledge_type ||
          k.tags.some((tag) => knowledge.tags.includes(tag))
      )
      .slice(0, limit);

    return related;
  }

  private async validateTargetAgents(targetAgents: string[]): Promise<ServiceResult<void> | null> {
    if (targetAgents.length === 0) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_INPUT,
        'At least one target agent is required'
      );
    }

    return null;
  }

  private async filterShareableAgents(
    targetAgents: string[],
    knowledge: SharedKnowledge,
    context: AuthContext
  ): Promise<string[]> {
    // Apply business rules for sharing
    return targetAgents.filter((agent) => !knowledge.source_agents.includes(agent));
  }

  private async createSharingRecords(
    knowledgeId: string,
    agents: string[],
    context: AuthContext
  ): Promise<void> {
    console.log(`Creating sharing records for knowledge ${knowledgeId} with agents:`, agents);
  }

  private async handleKnowledgeShared(
    knowledgeId: string,
    agents: string[],
    context: AuthContext
  ): Promise<void> {
    console.log(`Knowledge ${knowledgeId} shared with ${agents.length} agents`);
  }

  private async validateMergeRequest(
    sourceIds: string[],
    targetTitle: string
  ): Promise<ServiceResult<void> | null> {
    if (sourceIds.length < 2) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_INPUT,
        'At least two source knowledge items required for merge'
      );
    }

    if (!targetTitle?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Target title is required for merge'
      );
    }

    return null;
  }

  private async performKnowledgeMerge(
    sourceKnowledge: SharedKnowledge[],
    targetTitle: string,
    context: AuthContext
  ): Promise<KnowledgeCreateRequest> {
    // Merge business logic
    const mergedContent = sourceKnowledge.map((k) => k.content).join('\n\n---\n\n');

    const allTags = [...new Set(sourceKnowledge.flatMap((k) => k.tags))];
    const allAgents = [...new Set(sourceKnowledge.flatMap((k) => k.source_agents))];

    return {
      knowledgeType: sourceKnowledge[0].knowledge_type,
      title: targetTitle,
      content: mergedContent,
      sourceAgent: context.userId,
      tags: allTags,
    };
  }

  private async handleKnowledgeMerged(
    mergedId: string,
    sourceIds: string[],
    context: AuthContext
  ): Promise<void> {
    console.log(`Knowledge items ${sourceIds.join(', ')} merged into ${mergedId}`);
  }

  private getKnowledgeByType(knowledge: SharedKnowledge[]): Record<string, number> {
    const byType: Record<string, number> = {};

    knowledge.forEach((k) => {
      byType[k.knowledge_type] = (byType[k.knowledge_type] || 0) + 1;
    });

    return byType;
  }

  private calculateAverageConfidence(knowledge: SharedKnowledge[]): number {
    if (knowledge.length === 0) return 0;

    const total = knowledge.reduce((sum, k) => sum + k.confidence_score, 0);
    return total / knowledge.length;
  }

  private getTopTags(knowledge: SharedKnowledge[]): Array<{ tag: string; count: number }> {
    const tagCounts = new Map<string, number>();

    knowledge.forEach((k) => {
      k.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async getMostShared(knowledge: SharedKnowledge[]): Promise<SharedKnowledge[]> {
    return knowledge.sort((a, b) => b.source_agents.length - a.source_agents.length).slice(0, 5);
  }

  private async getRecentActivity(): Promise<any> {
    // Get recent knowledge activity
    return {
      recentCreations: 5,
      recentUpdates: 3,
      recentShares: 8,
    };
  }

  private async calculateQualityMetrics(knowledge: SharedKnowledge[]): Promise<any> {
    return {
      averageContentLength:
        knowledge.reduce((sum, k) => sum + k.content.length, 0) / knowledge.length,
      averageTagCount: knowledge.reduce((sum, k) => sum + k.tags.length, 0) / knowledge.length,
      versionDistribution: this.getVersionDistribution(knowledge),
    };
  }

  private getVersionDistribution(knowledge: SharedKnowledge[]): Record<number, number> {
    const distribution: Record<number, number> = {};

    knowledge.forEach((k) => {
      distribution[k.version] = (distribution[k.version] || 0) + 1;
    });

    return distribution;
  }

  private calculatePopularityScore(knowledge: SharedKnowledge): number {
    const accessScore = this.popularityScores.get(knowledge.id) || 0;
    const confidenceScore = knowledge.confidence_score;
    const sharingScore = knowledge.source_agents.length;

    return accessScore * 0.4 + confidenceScore * 0.4 + sharingScore * 0.2;
  }

  // Permission check methods
  private async hasCreateKnowledgePermission(context: AuthContext): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'knowledge' && p.action === 'create');
  }

  private async hasReadKnowledgePermission(context: AuthContext): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'knowledge' && p.action === 'read');
  }

  private async hasUpdateKnowledgePermission(
    knowledge: SharedKnowledge,
    context: AuthContext
  ): Promise<boolean> {
    return (
      context.permissions.some((p) => p.resource === 'knowledge' && p.action === 'update') ||
      knowledge.source_agents.includes(context.userId)
    );
  }

  private async hasDeleteKnowledgePermission(
    knowledge: SharedKnowledge,
    context: AuthContext
  ): Promise<boolean> {
    return (
      context.permissions.some((p) => p.resource === 'knowledge' && p.action === 'delete') ||
      knowledge.source_agents.includes(context.userId)
    );
  }

  private async hasSearchKnowledgePermission(context: AuthContext): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'knowledge' && p.action === 'search');
  }

  private async hasShareKnowledgePermission(
    knowledge: SharedKnowledge,
    context: AuthContext
  ): Promise<boolean> {
    return (
      context.permissions.some((p) => p.resource === 'knowledge' && p.action === 'share') ||
      knowledge.source_agents.includes(context.userId)
    );
  }

  private async hasMergeKnowledgePermission(context: AuthContext): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'knowledge' && p.action === 'merge');
  }

  private async hasStatsPermission(context: AuthContext): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'knowledge' && p.action === 'stats');
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
