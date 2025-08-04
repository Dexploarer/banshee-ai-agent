/**
 * Tauri-based implementation of GraphApiService
 *
 * Provides a bridge between the frontend GraphService and the Rust backend
 * using Tauri's invoke API for secure communication
 */

import { invoke } from '@tauri-apps/api/core';
import type { KnowledgeEdge, KnowledgeNode } from '../ai/memory/types';
import type {
  CreateEdgeRequest,
  CreateNodeRequest,
  GraphApiService,
  GraphCluster,
  GraphQuery,
  GraphStats,
  GraphView,
  PathResult,
  UpdateEdgeRequest,
  UpdateNodeRequest,
} from './graph-api-types';
import { GraphApiValidator } from './graph-api-types';
import { GRAPH_ERROR_CODES, GraphApiError } from './graph-api-types';

export class TauriGraphService implements GraphApiService {
  /**
   * Create a new node in the knowledge graph
   */
  async createNode(request: CreateNodeRequest): Promise<string> {
    try {
      // Validate request before sending to backend
      this.validateCreateNodeRequest(request);

      const nodeId = await invoke<string>('create_graph_node', { request });
      return nodeId;
    } catch (error) {
      throw this.handleError(error, 'Failed to create node');
    }
  }

  /**
   * Get a specific node by ID
   */
  async getNode(nodeId: string, agentId: string): Promise<KnowledgeNode | null> {
    try {
      if (!GraphApiValidator.validateNodeId(nodeId)) {
        throw new GraphApiError('Invalid node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (!GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      const node = await invoke<KnowledgeNode | null>('get_graph_node', {
        nodeId,
        agentId,
      });

      return node;
    } catch (error) {
      throw this.handleError(error, 'Failed to get node');
    }
  }

  /**
   * Update node properties
   */
  async updateNode(request: UpdateNodeRequest): Promise<void> {
    try {
      this.validateUpdateNodeRequest(request);

      await invoke('update_graph_node', { request });
    } catch (error) {
      throw this.handleError(error, 'Failed to update node');
    }
  }

  /**
   * Delete a node and its edges
   */
  async deleteNode(nodeId: string, agentId: string): Promise<void> {
    try {
      if (!GraphApiValidator.validateNodeId(nodeId)) {
        throw new GraphApiError('Invalid node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (!GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      await invoke('delete_graph_node', { nodeId, agentId });
    } catch (error) {
      throw this.handleError(error, 'Failed to delete node');
    }
  }

  /**
   * Create a new edge between nodes
   */
  async createEdge(request: CreateEdgeRequest): Promise<string> {
    try {
      this.validateCreateEdgeRequest(request);

      const edgeId = await invoke<string>('create_graph_edge', { request });
      return edgeId;
    } catch (error) {
      throw this.handleError(error, 'Failed to create edge');
    }
  }

  /**
   * Get a specific edge by ID
   */
  async getEdge(edgeId: string, agentId: string): Promise<KnowledgeEdge | null> {
    try {
      if (!GraphApiValidator.validateNodeId(edgeId)) {
        // Edge IDs use same format as node IDs
        throw new GraphApiError('Invalid edge ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (!GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      const edge = await invoke<KnowledgeEdge | null>('get_graph_edge', {
        edgeId,
        agentId,
      });

      return edge;
    } catch (error) {
      throw this.handleError(error, 'Failed to get edge');
    }
  }

  /**
   * Update edge properties
   */
  async updateEdge(request: UpdateEdgeRequest): Promise<void> {
    try {
      this.validateUpdateEdgeRequest(request);

      await invoke('update_graph_edge', { request });
    } catch (error) {
      throw this.handleError(error, 'Failed to update edge');
    }
  }

  /**
   * Delete an edge
   */
  async deleteEdge(edgeId: string, agentId: string): Promise<void> {
    try {
      if (!GraphApiValidator.validateNodeId(edgeId)) {
        throw new GraphApiError('Invalid edge ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (!GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      await invoke('delete_graph_edge', { edgeId, agentId });
    } catch (error) {
      throw this.handleError(error, 'Failed to delete edge');
    }
  }

  /**
   * Get graph data for visualization
   */
  async getGraphView(query: GraphQuery): Promise<GraphView> {
    try {
      this.validateGraphQuery(query);

      const graphView = await invoke<GraphView>('get_graph_view', { query });
      return graphView;
    } catch (error) {
      throw this.handleError(error, 'Failed to get graph view');
    }
  }

  /**
   * Find shortest path between two nodes
   */
  async findPath(
    fromNode: string,
    toNode: string,
    maxDepth?: number,
    agentId?: string
  ): Promise<PathResult[]> {
    try {
      if (!GraphApiValidator.validateNodeId(fromNode)) {
        throw new GraphApiError('Invalid from node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (!GraphApiValidator.validateNodeId(toNode)) {
        throw new GraphApiError('Invalid to node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (maxDepth !== undefined && !GraphApiValidator.validateDepth(maxDepth)) {
        throw new GraphApiError('Invalid max depth value', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (agentId && !GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      const paths = await invoke<PathResult[]>('find_graph_path', {
        fromNode,
        toNode,
        maxDepth: maxDepth ?? 6,
        agentId: agentId ?? 'default',
      });

      return paths;
    } catch (error) {
      throw this.handleError(error, 'Failed to find path');
    }
  }

  /**
   * Get neighboring nodes
   */
  async getNeighbors(nodeId: string, depth?: number, agentId?: string): Promise<KnowledgeNode[]> {
    try {
      if (!GraphApiValidator.validateNodeId(nodeId)) {
        throw new GraphApiError('Invalid node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (depth !== undefined && !GraphApiValidator.validateDepth(depth)) {
        throw new GraphApiError('Invalid depth value', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      if (agentId && !GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      const neighbors = await invoke<KnowledgeNode[]>('get_graph_neighbors', {
        nodeId,
        depth: depth ?? 1,
        agentId: agentId ?? 'default',
      });

      return neighbors;
    } catch (error) {
      throw this.handleError(error, 'Failed to get neighbors');
    }
  }

  /**
   * Get comprehensive graph statistics
   */
  async getStats(agentId: string): Promise<GraphStats> {
    try {
      if (!GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      const stats = await invoke<GraphStats>('get_graph_stats', { agentId });
      return stats;
    } catch (error) {
      throw this.handleError(error, 'Failed to get graph stats');
    }
  }

  /**
   * Find clusters in the graph
   */
  async findClusters(agentId: string): Promise<GraphCluster[]> {
    try {
      if (!GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      const clusters = await invoke<GraphCluster[]>('find_graph_clusters', { agentId });
      return clusters;
    } catch (error) {
      throw this.handleError(error, 'Failed to find clusters');
    }
  }

  /**
   * Optimize graph structure and performance
   */
  async optimizeGraph(agentId: string): Promise<void> {
    try {
      if (!GraphApiValidator.validateAgentId(agentId)) {
        throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
      }

      await invoke('optimize_graph', { agentId });
    } catch (error) {
      throw this.handleError(error, 'Failed to optimize graph');
    }
  }

  // Private validation methods
  private validateCreateNodeRequest(request: CreateNodeRequest): void {
    if (!GraphApiValidator.validateAgentId(request.agent_id)) {
      throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!GraphApiValidator.validateNodeName(request.name)) {
      throw new GraphApiError('Invalid node name', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!GraphApiValidator.validateNodeType(request.node_type)) {
      throw new GraphApiError('Invalid node type', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.properties && !GraphApiValidator.validateProperties(request.properties)) {
      throw new GraphApiError('Invalid properties', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }
  }

  private validateUpdateNodeRequest(request: UpdateNodeRequest): void {
    if (!GraphApiValidator.validateAgentId(request.agent_id)) {
      throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!GraphApiValidator.validateNodeId(request.node_id)) {
      throw new GraphApiError('Invalid node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!GraphApiValidator.validateProperties(request.properties)) {
      throw new GraphApiError('Invalid properties', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }
  }

  private validateCreateEdgeRequest(request: CreateEdgeRequest): void {
    if (!GraphApiValidator.validateAgentId(request.agent_id)) {
      throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!GraphApiValidator.validateNodeId(request.from_node)) {
      throw new GraphApiError('Invalid from node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!GraphApiValidator.validateNodeId(request.to_node)) {
      throw new GraphApiError('Invalid to node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.from_node === request.to_node) {
      throw new GraphApiError('Self-loops are not allowed', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!GraphApiValidator.validateRelationshipType(request.relationship_type)) {
      throw new GraphApiError('Invalid relationship type', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.weight !== undefined && !GraphApiValidator.validateWeight(request.weight)) {
      throw new GraphApiError('Invalid weight value', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.properties && !GraphApiValidator.validateProperties(request.properties)) {
      throw new GraphApiError('Invalid properties', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }
  }

  private validateUpdateEdgeRequest(request: UpdateEdgeRequest): void {
    if (!GraphApiValidator.validateAgentId(request.agent_id)) {
      throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (!GraphApiValidator.validateNodeId(request.edge_id)) {
      throw new GraphApiError('Invalid edge ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.weight !== undefined && !GraphApiValidator.validateWeight(request.weight)) {
      throw new GraphApiError('Invalid weight value', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (request.properties && !GraphApiValidator.validateProperties(request.properties)) {
      throw new GraphApiError('Invalid properties', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }
  }

  private validateGraphQuery(query: GraphQuery): void {
    if (!GraphApiValidator.validateAgentId(query.agent_id)) {
      throw new GraphApiError('Invalid agent ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (query.node_types) {
      for (const nodeType of query.node_types) {
        if (!GraphApiValidator.validateNodeType(nodeType)) {
          throw new GraphApiError(
            `Invalid node type: ${nodeType}`,
            GRAPH_ERROR_CODES.VALIDATION_ERROR
          );
        }
      }
    }

    if (query.relationship_types) {
      for (const relType of query.relationship_types) {
        if (!GraphApiValidator.validateRelationshipType(relType)) {
          throw new GraphApiError(
            `Invalid relationship type: ${relType}`,
            GRAPH_ERROR_CODES.VALIDATION_ERROR
          );
        }
      }
    }

    if (query.start_node && !GraphApiValidator.validateNodeId(query.start_node)) {
      throw new GraphApiError('Invalid start node ID format', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (query.depth !== undefined && !GraphApiValidator.validateDepth(query.depth)) {
      throw new GraphApiError('Invalid depth value', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }

    if (query.limit !== undefined && !GraphApiValidator.validateLimit(query.limit)) {
      throw new GraphApiError('Invalid limit value', GRAPH_ERROR_CODES.VALIDATION_ERROR);
    }
  }

  // Error handling
  private handleError(error: any, defaultMessage: string): GraphApiError {
    if (error instanceof GraphApiError) {
      return error;
    }

    // Handle Tauri errors
    if (typeof error === 'string') {
      return new GraphApiError(error, GRAPH_ERROR_CODES.INTERNAL_ERROR);
    }

    if (error?.message) {
      return new GraphApiError(error.message, GRAPH_ERROR_CODES.INTERNAL_ERROR);
    }

    return new GraphApiError(defaultMessage, GRAPH_ERROR_CODES.INTERNAL_ERROR, {
      originalError: String(error),
    });
  }
}

// Create singleton instance for use throughout the application
export const tauriGraphService = new TauriGraphService();
