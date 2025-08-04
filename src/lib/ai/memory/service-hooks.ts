/**
 * Service-Based Memory Hooks
 *
 * Refactored hooks that use the service layer instead of direct client calls.
 * Provides clean separation between UI and business logic.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useServices, ContextUtils, ServiceUtils } from '../../services';
import type {
  AgentMemory,
  MemorySearchResult,
  SharedKnowledge,
  KnowledgeNode,
  KnowledgeEdge,
} from '../../services';
import type {
  AuthContext,
  MemoryCreateRequest,
  MemorySearchRequest,
  MemoryUpdateRequest,
  KnowledgeCreateRequest,
  NodeCreateRequest,
  EdgeCreateRequest,
  GraphQuery,
  FilterOptions,
} from '../../services';
import { MemoryType } from '../memory/types';

// Create a mock context for now - in production this would come from auth
const createMockContext = (agentId?: string): AuthContext =>
  ContextUtils.createMockContext(
    'current-user',
    [
      { resource: 'memory', action: 'create' },
      { resource: 'memory', action: 'read' },
      { resource: 'memory', action: 'update' },
      { resource: 'memory', action: 'delete' },
      { resource: 'memory', action: 'backup' },
      { resource: 'knowledge', action: 'create' },
      { resource: 'knowledge', action: 'read' },
      { resource: 'knowledge', action: 'share' },
      { resource: 'graph', action: 'create_node' },
      { resource: 'graph', action: 'create_edge' },
      { resource: 'graph', action: 'read' },
    ],
    agentId
  );

/**
 * Enhanced hook for managing agent memories through service layer
 */
export function useAgentMemoryService(agentId: string) {
  const services = useServices();
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create auth context
  const authContext = useMemo(() => createMockContext(agentId), [agentId]);

  // Initialize memory system for agent
  useEffect(() => {
    if (!agentId) return;

    const initMemory = async () => {
      try {
        const result = await services.memoryService.initializeAgent(agentId, authContext);
        if (!result.success) {
          console.error('Failed to initialize memory:', result.error?.message);
          setError(result.error?.message || 'Failed to initialize memory');
        }
      } catch (err) {
        console.error('Failed to initialize memory:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize memory');
      }
    };

    initMemory();
  }, [agentId, authContext, services.memoryService]);

  // Create a new memory
  const createMemory = useCallback(
    async (request: Omit<MemoryCreateRequest, 'agentId'>): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const fullRequest: MemoryCreateRequest = {
          ...request,
          agentId,
        };

        const result = await services.memoryService.createMemory(fullRequest, authContext);

        if (result.success) {
          // Refresh memories after creating
          await refreshMemories();
          return result.data!;
        } else {
          const errorMessage = result.error?.message || 'Failed to create memory';
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create memory';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [agentId, authContext, services.memoryService]
  );

  // Search memories
  const searchMemories = useCallback(
    async (request: Omit<MemorySearchRequest, 'agentId'>): Promise<MemorySearchResult[]> => {
      setLoading(true);
      setError(null);

      try {
        const fullRequest: MemorySearchRequest = {
          ...request,
          agentId,
        };

        const result = await services.memoryService.searchMemories(fullRequest, authContext);

        if (result.success) {
          // Update memories with search results
          setMemories(result.data!.map((result) => result.memory));
          return result.data!;
        } else {
          const errorMessage = result.error?.message || 'Failed to search memories';
          setError(errorMessage);
          return [];
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search memories';
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [agentId, authContext, services.memoryService]
  );

  // Get specific memory
  const getMemory = useCallback(
    async (memoryId: string): Promise<AgentMemory | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await services.memoryService.getMemory(agentId, memoryId, authContext);

        if (result.success) {
          return result.data!;
        } else {
          const errorMessage = result.error?.message || 'Failed to get memory';
          setError(errorMessage);
          return null;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get memory';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [agentId, authContext, services.memoryService]
  );

  // Update memory
  const updateMemory = useCallback(
    async (request: MemoryUpdateRequest): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const result = await services.memoryService.updateMemory(request, authContext);

        if (result.success) {
          await refreshMemories();
        } else {
          const errorMessage = result.error?.message || 'Failed to update memory';
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update memory';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [authContext, services.memoryService]
  );

  // Delete memory
  const deleteMemory = useCallback(
    async (memoryId: string): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const result = await services.memoryService.deleteMemory(agentId, memoryId, authContext);

        if (result.success) {
          await refreshMemories();
        } else {
          const errorMessage = result.error?.message || 'Failed to delete memory';
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete memory';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [agentId, authContext, services.memoryService]
  );

  // Refresh all memories for agent
  const refreshMemories = useCallback(async (): Promise<void> => {
    if (!agentId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await services.memoryService.searchMemories(
        {
          agentId,
          options: { limit: 1000 }, // Get all recent memories
        },
        authContext
      );

      if (result.success) {
        setMemories(result.data!.map((result) => result.memory));
      } else {
        const errorMessage = result.error?.message || 'Failed to refresh memories';
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh memories';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [agentId, authContext, services.memoryService]);

  // Get memory statistics
  const getStats = useCallback(async () => {
    try {
      const result = await services.memoryService.getMemoryStats(agentId, authContext);
      return ServiceUtils.isSuccess(result) ? result.data : null;
    } catch (err) {
      console.error('Failed to get memory stats:', err);
      return null;
    }
  }, [agentId, authContext, services.memoryService]);

  // Backup memories
  const backupMemories = useCallback(
    async (backupName?: string): Promise<string | null> => {
      try {
        const result = await services.memoryService.backupMemories(
          agentId,
          backupName,
          authContext
        );
        return ServiceUtils.isSuccess(result) ? result.data : null;
      } catch (err) {
        console.error('Failed to backup memories:', err);
        return null;
      }
    },
    [agentId, authContext, services.memoryService]
  );

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
    updateMemory,
    deleteMemory,
    refreshMemories,
    getStats,
    backupMemories,
  };
}

/**
 * Enhanced hook for managing shared knowledge through service layer
 */
export function useSharedKnowledgeService() {
  const services = useServices();
  const [knowledge, setKnowledge] = useState<SharedKnowledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authContext = useMemo(() => createMockContext(), []);

  // Create shared knowledge
  const createKnowledge = useCallback(
    async (request: KnowledgeCreateRequest): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const result = await services.knowledgeService.createKnowledge(request, authContext);

        if (result.success) {
          await refreshKnowledge();
          return result.data!;
        } else {
          const errorMessage = result.error?.message || 'Failed to create knowledge';
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create knowledge';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [authContext, services.knowledgeService]
  );

  // Search knowledge
  const searchKnowledge = useCallback(
    async (
      query: string,
      options?: {
        types?: string[];
        confidence?: number;
        limit?: number;
      }
    ): Promise<SharedKnowledge[]> => {
      setLoading(true);
      setError(null);

      try {
        const result = await services.knowledgeService.searchKnowledge(
          {
            query,
            types: options?.types,
            confidence: options?.confidence,
            options: { limit: options?.limit || 20 },
          },
          authContext
        );

        if (result.success) {
          return result.data!;
        } else {
          const errorMessage = result.error?.message || 'Failed to search knowledge';
          setError(errorMessage);
          return [];
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search knowledge';
        setError(errorMessage);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [authContext, services.knowledgeService]
  );

  // Share knowledge
  const shareKnowledge = useCallback(
    async (knowledgeId: string, targetAgents: string[]): Promise<void> => {
      try {
        const result = await services.knowledgeService.shareKnowledge(
          knowledgeId,
          targetAgents,
          authContext
        );

        if (!result.success) {
          const errorMessage = result.error?.message || 'Failed to share knowledge';
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to share knowledge';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [authContext, services.knowledgeService]
  );

  // Get popular knowledge
  const getPopularKnowledge = useCallback(
    async (limit = 10): Promise<SharedKnowledge[]> => {
      try {
        const result = await services.knowledgeService.getPopularKnowledge(limit, authContext);
        return ServiceUtils.isSuccess(result) ? result.data : [];
      } catch (err) {
        console.error('Failed to get popular knowledge:', err);
        return [];
      }
    },
    [authContext, services.knowledgeService]
  );

  // Refresh shared knowledge
  const refreshKnowledge = useCallback(async (): Promise<void> => {
    // In a full implementation, you'd search for user's accessible knowledge
    setKnowledge([]);
  }, []);

  return {
    knowledge,
    loading,
    error,
    createKnowledge,
    searchKnowledge,
    shareKnowledge,
    getPopularKnowledge,
    refreshKnowledge,
  };
}

/**
 * Enhanced hook for managing knowledge graph through service layer
 */
export function useKnowledgeGraphService(agentId: string) {
  const services = useServices();
  const [graph, setGraph] = useState<{
    nodes: KnowledgeNode[];
    edges: KnowledgeEdge[];
    selectedNode?: string;
    selectedEdge?: string;
    zoom: number;
    center: [number, number];
  }>({
    nodes: [],
    edges: [],
    zoom: 1,
    center: [0, 0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authContext = useMemo(() => createMockContext(agentId), [agentId]);

  // Add node to graph
  const addNode = useCallback(
    async (request: Omit<NodeCreateRequest, 'agentId'>): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const fullRequest: NodeCreateRequest = {
          ...request,
          agentId,
        };

        const result = await services.graphService.createNode(fullRequest, authContext);

        if (result.success) {
          await refreshGraph();
          return result.data!;
        } else {
          const errorMessage = result.error?.message || 'Failed to add node';
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add node';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [agentId, authContext, services.graphService]
  );

  // Add edge to graph
  const addEdge = useCallback(
    async (request: Omit<EdgeCreateRequest, 'agentId'>): Promise<string> => {
      setLoading(true);
      setError(null);

      try {
        const fullRequest: EdgeCreateRequest = {
          ...request,
          agentId,
        };

        const result = await services.graphService.createEdge(fullRequest, authContext);

        if (result.success) {
          await refreshGraph();
          return result.data!;
        } else {
          const errorMessage = result.error?.message || 'Failed to add edge';
          setError(errorMessage);
          throw new Error(errorMessage);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add edge';
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [agentId, authContext, services.graphService]
  );

  // Get graph data
  const getGraph = useCallback(
    async (query?: GraphQuery) => {
      try {
        const result = await services.graphService.getGraph(agentId, query, authContext);
        return ServiceUtils.isSuccess(result) ? result.data : null;
      } catch (err) {
        console.error('Failed to get graph:', err);
        return null;
      }
    },
    [agentId, authContext, services.graphService]
  );

  // Find path between nodes
  const findPath = useCallback(
    async (fromNode: string, toNode: string, maxDepth?: number) => {
      try {
        const result = await services.graphService.findPath(
          fromNode,
          toNode,
          maxDepth,
          authContext
        );
        return ServiceUtils.isSuccess(result) ? result.data : [];
      } catch (err) {
        console.error('Failed to find path:', err);
        return [];
      }
    },
    [authContext, services.graphService]
  );

  // Get graph statistics
  const getStats = useCallback(async () => {
    try {
      const result = await services.graphService.getGraphStats(agentId, authContext);
      return ServiceUtils.isSuccess(result) ? result.data : null;
    } catch (err) {
      console.error('Failed to get graph stats:', err);
      return null;
    }
  }, [agentId, authContext, services.graphService]);

  // Find clusters
  const findClusters = useCallback(async () => {
    try {
      const result = await services.graphService.findClusters(agentId, authContext);
      return ServiceUtils.isSuccess(result) ? result.data : [];
    } catch (err) {
      console.error('Failed to find clusters:', err);
      return [];
    }
  }, [agentId, authContext, services.graphService]);

  // Optimize graph
  const optimizeGraph = useCallback(async (): Promise<void> => {
    try {
      const result = await services.graphService.optimizeGraph(agentId, authContext);

      if (result.success) {
        await refreshGraph();
      } else {
        const errorMessage = result.error?.message || 'Failed to optimize graph';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to optimize graph';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [agentId, authContext, services.graphService]);

  // Refresh graph data
  const refreshGraph = useCallback(async (): Promise<void> => {
    const graphData = await getGraph();
    if (graphData) {
      setGraph(graphData);
    }
  }, [getGraph]);

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
    getGraph,
    findPath,
    getStats,
    findClusters,
    optimizeGraph,
    refreshGraph,
    selectNode,
    selectEdge,
  };
}

/**
 * Enhanced hook for filtered memory views using service layer
 */
export function useFilteredMemoriesService(memories: AgentMemory[], filter: FilterOptions) {
  const services = useServices();
  const authContext = useMemo(() => createMockContext(), []);

  return useMemo(() => {
    // Apply filters through service layer business logic
    // This would typically be done on the server side for performance
    let filtered = memories;

    // Filter by types
    if (filter.types && filter.types.length > 0) {
      filtered = filtered.filter((memory) => filter.types!.includes(memory.memory_type));
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter((memory) => filter.tags!.some((tag) => memory.tags.includes(tag)));
    }

    // Filter by date range
    if (filter.dateRange) {
      filtered = filtered.filter((memory) => {
        const memoryDate = new Date(memory.created_at);
        return memoryDate >= filter.dateRange![0] && memoryDate <= filter.dateRange![1];
      });
    }

    return filtered;
  }, [memories, filter]);
}

/**
 * Enhanced hook for memory statistics using service layer
 */
export function useMemoryStatsService(agentId: string) {
  const services = useServices();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const authContext = useMemo(() => createMockContext(agentId), [agentId]);

  const refreshStats = useCallback(async () => {
    setLoading(true);
    try {
      const result = await services.memoryService.getMemoryStats(agentId, authContext);
      if (ServiceUtils.isSuccess(result)) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Failed to get memory stats:', err);
    } finally {
      setLoading(false);
    }
  }, [agentId, authContext, services.memoryService]);

  useEffect(() => {
    if (agentId) {
      refreshStats();
    }
  }, [agentId, refreshStats]);

  return {
    stats,
    loading,
    refreshStats,
  };
}

/**
 * Enhanced hook for backup functionality using service layer
 */
export function useMemoryBackupService() {
  const services = useServices();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authContext = useMemo(() => createMockContext(), []);

  const backupMemories = useCallback(
    async (agentId: string, backupName?: string): Promise<string | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await services.memoryService.backupMemories(
          agentId,
          backupName,
          authContext
        );

        if (result.success) {
          return result.data!;
        } else {
          const errorMessage = result.error?.message || 'Failed to backup memories';
          setError(errorMessage);
          return null;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to backup memories';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [authContext, services.memoryService]
  );

  return {
    backupMemories,
    loading,
    error,
  };
}
