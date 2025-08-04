/**
 * TypeScript types for Knowledge Graph API endpoints
 *
 * These types correspond to the Rust backend graph_commands.rs structures
 * Ensures type safety between frontend and backend communication
 */

import type { KnowledgeNode, KnowledgeEdge, NodeType, RelationshipType } from '../ai/memory/types';

// Request types for graph operations
export interface CreateNodeRequest {
  node_type: string;
  name: string;
  properties?: Record<string, string>;
  agent_id: string;
}

export interface CreateEdgeRequest {
  from_node: string;
  to_node: string;
  relationship_type: string;
  weight?: number;
  properties?: Record<string, string>;
  agent_id: string;
}

export interface UpdateNodeRequest {
  node_id: string;
  properties: Record<string, string>;
  agent_id: string;
}

export interface UpdateEdgeRequest {
  edge_id: string;
  weight?: number;
  properties?: Record<string, string>;
  agent_id: string;
}

export interface GraphQuery {
  agent_id: string;
  node_types?: string[];
  relationship_types?: string[];
  start_node?: string;
  depth?: number;
  limit?: number;
}

// Response types from backend
export interface GraphView {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  selected_node?: string;
  selected_edge?: string;
  zoom: number;
  center: [number, number];
}

export interface PathResult {
  path: string[];
  distance: number;
  weight: number;
}

export interface GraphStats {
  node_count: number;
  edge_count: number;
  node_types: Record<string, number>;
  relationship_types: Record<string, number>;
  connectivity: number;
  density: number;
  components: number;
  average_path_length: number;
  clustering_coefficient: number;
}

export interface GraphCluster {
  id: string;
  nodes: string[];
  strength: number;
  center_node: string;
}

// API service interface for graph operations
export interface GraphApiService {
  // Node operations
  createNode(request: CreateNodeRequest): Promise<string>;
  getNode(nodeId: string, agentId: string): Promise<KnowledgeNode | null>;
  updateNode(request: UpdateNodeRequest): Promise<void>;
  deleteNode(nodeId: string, agentId: string): Promise<void>;

  // Edge operations
  createEdge(request: CreateEdgeRequest): Promise<string>;
  getEdge(edgeId: string, agentId: string): Promise<KnowledgeEdge | null>;
  updateEdge(request: UpdateEdgeRequest): Promise<void>;
  deleteEdge(edgeId: string, agentId: string): Promise<void>;

  // Graph operations
  getGraphView(query: GraphQuery): Promise<GraphView>;
  findPath(
    fromNode: string,
    toNode: string,
    maxDepth?: number,
    agentId?: string
  ): Promise<PathResult[]>;
  getNeighbors(nodeId: string, depth?: number, agentId?: string): Promise<KnowledgeNode[]>;
  getStats(agentId: string): Promise<GraphStats>;
  findClusters(agentId: string): Promise<GraphCluster[]>;
  optimizeGraph(agentId: string): Promise<void>;
}

// Validation helpers
export const GraphApiValidator = {
  validateNodeType(nodeType: string): boolean {
    const validTypes = ['Agent', 'Memory', 'Concept', 'Task', 'Tool', 'Context', 'Pattern'];
    return validTypes.includes(nodeType);
  },

  validateRelationshipType(relType: string): boolean {
    const validTypes = [
      'Knows',
      'Uses',
      'LearnedFrom',
      'CollaboratesWith',
      'DependsOn',
      'Similar',
      'Opposite',
      'CausedBy',
      'LeadsTo',
    ];
    return validTypes.includes(relType);
  },

  validateWeight(weight: number): boolean {
    return weight >= 0.0 && weight <= 1.0 && !Number.isNaN(weight) && Number.isFinite(weight);
  },

  validateDepth(depth: number): boolean {
    return depth >= 1 && depth <= 10 && Number.isInteger(depth);
  },

  validateLimit(limit: number): boolean {
    return limit >= 1 && limit <= 1000 && Number.isInteger(limit);
  },

  validateAgentId(agentId: string): boolean {
    if (!agentId || agentId.trim().length === 0) return false;
    if (agentId.length > 256) return false;
    return /^[a-zA-Z0-9_.-]+$/.test(agentId);
  },

  validateNodeId(nodeId: string): boolean {
    if (!nodeId || nodeId.trim().length === 0) return false;
    // Basic UUID format check
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nodeId);
  },

  validateNodeName(name: string): boolean {
    if (!name || name.trim().length === 0) return false;
    if (name.length > 256) return false;
    // Check for control characters using charCodeAt for safe validation
    for (let i = 0; i < name.length; i++) {
      const code = name.charCodeAt(i);
      if (code >= 0 && code <= 31) return false; // Control characters
      if (code === 127) return false; // DEL character
    }
    return true;
  },

  validateProperties(properties: Record<string, string>): boolean {
    if (Object.keys(properties).length > 100) return false;

    for (const [key, value] of Object.entries(properties)) {
      // Validate key
      if (!key || key.trim().length === 0 || key.length > 128) return false;
      if (!/^[a-zA-Z0-9_.-]+$/.test(key)) return false;

      // Validate value
      if (value.length > 1024) return false;
      // Check for control characters using charCodeAt for safe validation
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (
          (code >= 0 && code <= 8) ||
          (code >= 11 && code <= 12) ||
          (code >= 14 && code <= 31) ||
          code === 127
        ) {
          return false;
        }
      }
    }

    return true;
  },
};

// Error types for graph operations
export class GraphApiError extends Error {
  public readonly code: string;
  public readonly timestamp: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string = 'GRAPH_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'GraphApiError';
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.details = details;
  }
}

// Common error codes
export const GRAPH_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  FORBIDDEN: 'FORBIDDEN',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_STATE: 'INVALID_STATE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type GraphErrorCode = keyof typeof GRAPH_ERROR_CODES;
