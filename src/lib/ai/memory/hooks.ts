import { useCallback, useEffect, useMemo, useState } from 'react';
import { MemoryClient, MemoryUtils } from './client';
import type {
  AgentMemory,
  CreateEdgeRequest,
  CreateKnowledgeRequest,
  CreateMemoryRequest,
  CreateNodeRequest,
  KnowledgeEdge,
  KnowledgeGraphView,
  KnowledgeNode,
  MemoryFilter,
  MemorySearchResult,
  SearchMemoriesRequest,
  SharedKnowledge,
  UseKnowledgeGraphReturn,
  UseKnowledgeReturn,
  UseMemoryReturn,
} from './types';
import { MemoryType } from './types';

/**
 * Hook for managing agent memories
 */
export function useAgentMemory(agentId: string): UseMemoryReturn {
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize memory system for agent
  useEffect(() => {
    if (!agentId) return;

    const initMemory = async () => {
      try {
        await MemoryClient.initAgentMemory(agentId);
      } catch (err) {
        console.error('Failed to initialize memory:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize memory');
      }
    };

    initMemory();
  }, [agentId]);

  // Create a new memory
  const createMemory = useCallback(async (request: CreateMemoryRequest): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const memoryId = await MemoryClient.saveMemory(request);
      // Refresh memories after creating
      await refreshMemories();
      return memoryId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create memory';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search memories
  const searchMemories = useCallback(
    async (request: SearchMemoriesRequest): Promise<MemorySearchResult[]> => {
      setLoading(true);
      setError(null);

      try {
        const results = await MemoryClient.searchMemories(request);
        // Update memories with search results
        setMemories(results.map((result) => result.memory));
        return results;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search memories';
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Get specific memory
  const getMemory = useCallback(
    async (agentId: string, memoryId: string): Promise<AgentMemory | null> => {
      setLoading(true);
      setError(null);

      try {
        return await MemoryClient.getMemory(agentId, memoryId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get memory';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Refresh all memories for agent
  const refreshMemories = useCallback(async (): Promise<void> => {
    if (!agentId) return;

    setLoading(true);
    setError(null);

    try {
      const results = await MemoryClient.searchMemories({
        agent_id: agentId,
        limit: 1000, // Get all recent memories
      });
      setMemories(results.map((result) => result.memory));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh memories';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Load memories on mount and when agent changes
  useEffect(() => {
    refreshMemories();
  }, [refreshMemories]);

  return {
    memories,
    loading,
    error,
    createMemory,
    searchMemories,
    getMemory,
    refreshMemories,
  };
}

/**
 * Hook for managing shared knowledge
 */
export function useSharedKnowledge(): UseKnowledgeReturn {
  const [knowledge, setKnowledge] = useState<SharedKnowledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create shared knowledge
  const createKnowledge = useCallback(async (request: CreateKnowledgeRequest): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const knowledgeId = await MemoryClient.saveKnowledge(request);
      await refreshKnowledge();
      return knowledgeId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh shared knowledge (placeholder - would need backend support)
  const refreshKnowledge = useCallback(async (): Promise<void> => {
    // For now, this would require additional backend support
    // In a full implementation, you'd add a search_shared_knowledge command
    setKnowledge([]);
  }, []);

  return {
    knowledge,
    loading,
    error,
    createKnowledge,
    refreshKnowledge,
  };
}

/**
 * Hook for managing knowledge graph
 */
export function useKnowledgeGraph(agentId: string): UseKnowledgeGraphReturn {
  const [graph, setGraph] = useState<KnowledgeGraphView>({
    nodes: [],
    edges: [],
    zoom: 1,
    center: [0, 0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add node to graph
  const addNode = useCallback(async (request: CreateNodeRequest): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const nodeId = await MemoryClient.addGraphNode(request);
      await refreshGraph();
      return nodeId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add node';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add edge to graph
  const addEdge = useCallback(async (request: CreateEdgeRequest): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const edgeId = await MemoryClient.addGraphEdge(request);
      await refreshGraph();
      return edgeId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add edge';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh graph data (placeholder - would need backend support)
  const refreshGraph = useCallback(async (): Promise<void> => {
    // For now, this would require additional backend endpoints
    // In a full implementation, you'd add get_knowledge_graph commands
    setGraph((prev) => ({ ...prev, nodes: [], edges: [] }));
  }, []);

  // Select node
  const selectNode = useCallback((nodeId: string) => {
    setGraph((prev) => ({ ...prev, selectedNode: nodeId, selectedEdge: undefined }));
  }, []);

  // Select edge
  const selectEdge = useCallback((edgeId: string) => {
    setGraph((prev) => ({ ...prev, selectedEdge: edgeId, selectedNode: undefined }));
  }, []);

  return {
    graph,
    loading,
    error,
    addNode,
    addEdge,
    refreshGraph,
    selectNode,
    selectEdge,
  };
}

/**
 * Hook for filtered memory views
 */
export function useFilteredMemories(memories: AgentMemory[], filter: MemoryFilter) {
  return useMemo(() => {
    let filtered = memories;

    // Filter by types
    if (filter.types.length > 0) {
      filtered = MemoryUtils.filterByType(filtered, filter.types);
    }

    // Filter by tags
    if (filter.tags.length > 0) {
      filtered = MemoryUtils.filterByTags(filtered, filter.tags);
    }

    // Filter by search text
    if (filter.searchText.trim()) {
      filtered = MemoryUtils.filterByContent(filtered, filter.searchText);
    }

    // Filter by date range
    if (filter.dateRange) {
      filtered = MemoryUtils.filterByDateRange(filtered, filter.dateRange[0], filter.dateRange[1]);
    }

    return filtered;
  }, [memories, filter]);
}

/**
 * Hook for memory statistics
 */
export function useMemoryStats(memories: AgentMemory[]) {
  return useMemo(() => {
    const typeDistribution = MemoryUtils.getTypeDistribution(memories);
    const uniqueTags = MemoryUtils.getUniqueTags(memories);
    const totalMemories = memories.length;
    const averageRelevance =
      memories.length > 0
        ? memories.reduce((sum, m) => sum + m.relevance_score, 0) / memories.length
        : 0;

    const mostAccessed = MemoryUtils.sortByAccessCount(memories).slice(0, 5);
    const recentLearnings = memories
      .filter((m) => m.memory_type === MemoryType.Learning)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    return {
      totalMemories,
      typeDistribution,
      uniqueTags,
      averageRelevance,
      mostAccessed,
      recentLearnings,
    };
  }, [memories]);
}

/**
 * Hook for backup functionality
 */
export function useMemoryBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backupMemories = useCallback(
    async (agentId: string, backupName?: string): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const backupPath = await MemoryClient.backupMemories(agentId, backupName);
        return backupPath;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to backup memories';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    backupMemories,
    loading,
    error,
  };
}
