import { invoke } from '@tauri-apps/api/core';
import type {
  AgentMemory,
  CreateEdgeRequest,
  CreateKnowledgeRequest,
  CreateMemoryRequest,
  CreateNodeRequest,
  KnowledgeEdge,
  KnowledgeNode,
  KnowledgeType,
  MemorySearchResult,
  NodeType,
  RelationshipType,
  SearchMemoriesRequest,
  SharedKnowledge,
} from './types';
import { MemoryType } from './types';

/**
 * Client for interacting with the Agent Memory System
 */
export class MemoryClient {
  /**
   * Initialize the memory system for an agent
   */
  static async initAgentMemory(agentId: string): Promise<void> {
    try {
      await invoke('init_agent_memory', { agentId });
    } catch (error) {
      console.error('Failed to initialize agent memory:', error);
      throw new Error(`Failed to initialize memory system: ${error}`);
    }
  }

  /**
   * Save a new memory for an agent
   */
  static async saveMemory(request: CreateMemoryRequest): Promise<string> {
    try {
      const memoryId = await invoke<string>('save_agent_memory', {
        agentId: request.agent_id,
        memoryType: request.memory_type,
        content: request.content,
        tags: request.tags || null,
        metadata: request.metadata || null,
      });
      return memoryId;
    } catch (error) {
      console.error('Failed to save memory:', error);
      throw new Error(`Failed to save memory: ${error}`);
    }
  }

  /**
   * Get a specific memory by ID
   */
  static async getMemory(agentId: string, memoryId: string): Promise<AgentMemory | null> {
    try {
      const memory = await invoke<AgentMemory | null>('get_agent_memory', {
        agentId,
        memoryId,
      });
      return memory;
    } catch (error) {
      console.error('Failed to get memory:', error);
      throw new Error(`Failed to retrieve memory: ${error}`);
    }
  }

  /**
   * Search memories for an agent
   */
  static async searchMemories(request: SearchMemoriesRequest): Promise<MemorySearchResult[]> {
    try {
      const results = await invoke<MemorySearchResult[]>('search_agent_memories', {
        agentId: request.agent_id,
        contentSearch: request.content_search || null,
        memoryTypes: request.memory_types || null,
        tags: request.tags || null,
        limit: request.limit || null,
        offset: request.offset || null,
        similarityThreshold: request.similarity_threshold || null,
      });
      return results;
    } catch (error) {
      console.error('Failed to search memories:', error);
      throw new Error(`Failed to search memories: ${error}`);
    }
  }

  /**
   * Save shared knowledge
   */
  static async saveKnowledge(request: CreateKnowledgeRequest): Promise<string> {
    try {
      const knowledgeId = await invoke<string>('save_shared_knowledge', {
        knowledgeType: request.knowledge_type,
        title: request.title,
        content: request.content,
        sourceAgent: request.source_agent,
        tags: request.tags || null,
      });
      return knowledgeId;
    } catch (error) {
      console.error('Failed to save knowledge:', error);
      throw new Error(`Failed to save knowledge: ${error}`);
    }
  }

  /**
   * Add a node to the knowledge graph
   */
  static async addGraphNode(request: CreateNodeRequest): Promise<string> {
    try {
      const nodeId = await invoke<string>('add_knowledge_graph_node', {
        nodeType: request.node_type,
        name: request.name,
        properties: request.properties || null,
        agentId: request.agent_id,
      });
      return nodeId;
    } catch (error) {
      console.error('Failed to add graph node:', error);
      throw new Error(`Failed to add node: ${error}`);
    }
  }

  /**
   * Add an edge to the knowledge graph
   */
  static async addGraphEdge(request: CreateEdgeRequest): Promise<string> {
    try {
      const edgeId = await invoke<string>('add_knowledge_graph_edge', {
        fromNode: request.from_node,
        toNode: request.to_node,
        relationshipType: request.relationship_type,
        weight: request.weight || null,
        properties: request.properties || null,
        agentId: request.agent_id,
      });
      return edgeId;
    } catch (error) {
      console.error('Failed to add graph edge:', error);
      throw new Error(`Failed to add edge: ${error}`);
    }
  }

  /**
   * Backup agent memories
   */
  static async backupMemories(agentId: string, backupName?: string): Promise<string> {
    try {
      const backupPath = await invoke<string>('backup_agent_memories', {
        agentId,
        backupName: backupName || null,
      });
      return backupPath;
    } catch (error) {
      console.error('Failed to backup memories:', error);
      throw new Error(`Failed to backup memories: ${error}`);
    }
  }
}

/**
 * Utility functions for working with memory data
 */
export class MemoryUtils {
  /**
   * Filter memories by type
   */
  static filterByType(memories: AgentMemory[], types: MemoryType[]): AgentMemory[] {
    if (types.length === 0) return memories;
    return memories.filter((memory) => types.includes(memory.memory_type));
  }

  /**
   * Filter memories by tags
   */
  static filterByTags(memories: AgentMemory[], tags: string[]): AgentMemory[] {
    if (tags.length === 0) return memories;
    return memories.filter((memory) => tags.some((tag) => memory.tags.includes(tag)));
  }

  /**
   * Filter memories by content search
   */
  static filterByContent(memories: AgentMemory[], searchText: string): AgentMemory[] {
    if (!searchText.trim()) return memories;
    const searchLower = searchText.toLowerCase();
    return memories.filter((memory) => memory.content.toLowerCase().includes(searchLower));
  }

  /**
   * Filter memories by date range
   */
  static filterByDateRange(memories: AgentMemory[], startDate: Date, endDate: Date): AgentMemory[] {
    return memories.filter((memory) => {
      const memoryDate = new Date(memory.created_at);
      return memoryDate >= startDate && memoryDate <= endDate;
    });
  }

  /**
   * Sort memories by relevance score
   */
  static sortByRelevance(memories: AgentMemory[]): AgentMemory[] {
    return [...memories].sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Sort memories by creation date
   */
  static sortByDate(memories: AgentMemory[], ascending = false): AgentMemory[] {
    return [...memories].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return ascending ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Sort memories by access count
   */
  static sortByAccessCount(memories: AgentMemory[]): AgentMemory[] {
    return [...memories].sort((a, b) => b.access_count - a.access_count);
  }

  /**
   * Get unique tags from memories
   */
  static getUniqueTags(memories: AgentMemory[]): string[] {
    const tagSet = new Set<string>();
    memories.forEach((memory) => {
      memory.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  /**
   * Get memory type distribution
   */
  static getTypeDistribution(memories: AgentMemory[]): Record<MemoryType, number> {
    const distribution: Record<MemoryType, number> = {
      [MemoryType.Conversation]: 0,
      [MemoryType.Task]: 0,
      [MemoryType.Learning]: 0,
      [MemoryType.Context]: 0,
      [MemoryType.Tool]: 0,
      [MemoryType.Error]: 0,
      [MemoryType.Success]: 0,
      [MemoryType.Pattern]: 0,
    };

    memories.forEach((memory) => {
      distribution[memory.memory_type]++;
    });

    return distribution;
  }

  /**
   * Format date for display
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  static getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return MemoryUtils.formatDate(dateString);
  }

  /**
   * Truncate content for display
   */
  static truncateContent(content: string, maxLength = 100): string {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength).trim()}...`;
  }

  /**
   * Get memory type color for UI
   */
  static getTypeColor(type: MemoryType): string {
    const colors: Record<MemoryType, string> = {
      [MemoryType.Conversation]: '#3B82F6', // blue
      [MemoryType.Task]: '#10B981', // green
      [MemoryType.Learning]: '#8B5CF6', // purple
      [MemoryType.Context]: '#6B7280', // gray
      [MemoryType.Tool]: '#F59E0B', // amber
      [MemoryType.Error]: '#EF4444', // red
      [MemoryType.Success]: '#059669', // emerald
      [MemoryType.Pattern]: '#EC4899', // pink
    };
    return colors[type] || '#6B7280';
  }

  /**
   * Get memory type icon for UI
   */
  static getTypeIcon(type: MemoryType): string {
    const icons: Record<MemoryType, string> = {
      [MemoryType.Conversation]: '💬',
      [MemoryType.Task]: '✅',
      [MemoryType.Learning]: '🧠',
      [MemoryType.Context]: '📝',
      [MemoryType.Tool]: '🔧',
      [MemoryType.Error]: '❌',
      [MemoryType.Success]: '🎉',
      [MemoryType.Pattern]: '🔍',
    };
    return icons[type] || '📄';
  }
}
