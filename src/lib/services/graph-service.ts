/**
 * Graph Service Implementation
 *
 * Handles knowledge graph operations, analytics, and optimization.
 * Implements complex graph algorithms and relationship management.
 */

import { MemoryClient } from '../ai/memory/client';
import { tauriGraphService } from './tauri-graph-service';
import type {
  CreateNodeRequest as ClientNodeRequest,
  CreateEdgeRequest as ClientEdgeRequest,
  KnowledgeNode,
  KnowledgeEdge,
  NodeType,
  RelationshipType,
} from '../ai/memory/types';
import type {
  CreateNodeRequest,
  CreateEdgeRequest,
  UpdateNodeRequest,
  UpdateEdgeRequest,
  GraphQuery as TauriGraphQuery,
} from './graph-api-types';
import type {
  AuthContext,
  GraphQuery,
  GraphServiceConfig,
  IGraphService,
  NodeCreateRequest,
  EdgeCreateRequest,
  ServiceError,
  ServiceErrorCode,
  ServiceResult,
} from './types';
import { ServiceErrorCodes } from './types';

interface GraphView {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  selectedNode?: string;
  selectedEdge?: string;
  zoom: number;
  center: [number, number];
}

interface GraphCluster {
  id: string;
  nodes: string[];
  strength: number;
  centerNode: string;
}

interface PathResult {
  path: string[];
  distance: number;
  weight: number;
}

export class GraphService implements IGraphService {
  private config: GraphServiceConfig = {
    maxNodes: 10000,
    maxEdges: 50000,
    defaultWeight: 1.0,
  };

  private nodeCache = new Map<string, KnowledgeNode>();
  private edgeCache = new Map<string, KnowledgeEdge>();
  private graphsByAgent = new Map<string, GraphView>();
  private adjacencyList = new Map<string, Set<string>>();
  private graphStats = new Map<
    string,
    {
      nodeCount: number;
      edgeCount: number;
      lastOptimization: number;
      clusterCount: number;
    }
  >();

  async configure(config: GraphServiceConfig): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  /**
   * Create a new node in the knowledge graph
   */
  async createNode(
    request: NodeCreateRequest,
    context: AuthContext
  ): Promise<ServiceResult<string>> {
    try {
      // Authorization check
      if (!(await this.hasCreateNodePermission(request.agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to create node'
        );
      }

      // Validate input
      const validationError = this.validateNodeRequest(request);
      if (validationError) {
        return validationError;
      }

      // Check graph limits
      const limitCheck = await this.checkGraphLimits(request.agentId, 'node');
      if (!limitCheck.success) {
        return limitCheck;
      }

      // Transform request to Tauri format
      const tauriRequest: CreateNodeRequest = {
        node_type: request.nodeType,
        name: request.name,
        properties: request.properties || {},
        agent_id: request.agentId,
      };

      // Enhanced node processing
      const processedRequest = await this.processNodeCreationTauri(tauriRequest, context);

      // Create node via Tauri backend
      const nodeId = await tauriGraphService.createNode(processedRequest);

      // Update caches and graph structure
      await this.updateNodeCacheTauri(nodeId, processedRequest);
      this.updateGraphStructure(request.agentId, nodeId, 'node_added');

      // Handle post-creation business logic
      await this.handleNodeCreated(nodeId, request, context);

      return {
        success: true,
        data: nodeId,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create node');
    }
  }

  /**
   * Get a specific node by ID
   */
  async getNode(nodeId: string, context: AuthContext): Promise<ServiceResult<KnowledgeNode>> {
    try {
      // Get node from cache or client
      let node = this.nodeCache.get(nodeId);

      if (!node) {
        // In a full implementation, you'd have a get_node command
        console.warn('Get node not implemented in client - would require backend support');
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Node not found');
      }

      // Authorization check
      if (!(await this.hasReadNodePermission(node, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to read node'
        );
      }

      // Apply business rules for node access
      const processedNode = await this.processNodeForReading(node, context);

      return {
        success: true,
        data: processedNode,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get node');
    }
  }

  /**
   * Update node properties
   */
  async updateNode(
    nodeId: string,
    properties: Record<string, string>,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      const node = this.nodeCache.get(nodeId);
      if (!node) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Node not found');
      }

      // Authorization check
      if (!(await this.hasUpdateNodePermission(node, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to update node'
        );
      }

      // Validate update
      const validationError = this.validateNodeUpdate(properties);
      if (validationError) {
        return validationError;
      }

      // Apply business logic for updates
      const updatedProperties = await this.processNodeUpdate(node, properties, context);

      // Update cache
      const updatedNode = {
        ...node,
        properties: { ...node.properties, ...updatedProperties },
        updated_at: new Date().toISOString(),
      };
      this.nodeCache.set(nodeId, updatedNode);

      // In a full implementation, you'd have update_node command
      console.warn('Update node not implemented in client - would require backend support');

      // Handle post-update business logic
      await this.handleNodeUpdated(nodeId, properties, context);

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to update node');
    }
  }

  /**
   * Delete a node and its edges
   */
  async deleteNode(nodeId: string, context: AuthContext): Promise<ServiceResult<void>> {
    try {
      const node = this.nodeCache.get(nodeId);
      if (!node) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Node not found');
      }

      // Authorization check
      if (!(await this.hasDeleteNodePermission(node, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to delete node'
        );
      }

      // Check if node can be deleted
      const canDelete = await this.canDeleteNode(node, context);
      if (!canDelete.success) {
        return canDelete;
      }

      // Get connected edges
      const connectedEdges = Array.from(this.edgeCache.values()).filter(
        (edge) => edge.from_node === nodeId || edge.to_node === nodeId
      );

      // Archive node and edges before deletion
      await this.archiveNode(node);
      for (const edge of connectedEdges) {
        await this.archiveEdge(edge);
      }

      // Remove from caches
      this.nodeCache.delete(nodeId);
      connectedEdges.forEach((edge) => this.edgeCache.delete(edge.id));

      // Update graph structure
      this.updateAdjacencyList(nodeId, [], 'remove_node');
      this.updateGraphStructure(context.agentId || '', nodeId, 'node_deleted');

      // In a full implementation, you'd have delete_node command
      console.warn('Delete node not implemented in client - would require backend support');

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete node');
    }
  }

  /**
   * Create a new edge between nodes
   */
  async createEdge(
    request: EdgeCreateRequest,
    context: AuthContext
  ): Promise<ServiceResult<string>> {
    try {
      // Authorization check
      if (!(await this.hasCreateEdgePermission(request.agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to create edge'
        );
      }

      // Validate input
      const validationError = await this.validateEdgeRequest(request);
      if (validationError) {
        return validationError;
      }

      // Check graph limits
      const limitCheck = await this.checkGraphLimits(request.agentId, 'edge');
      if (!limitCheck.success) {
        return limitCheck;
      }

      // Transform request to Tauri format
      const tauriRequest: CreateEdgeRequest = {
        from_node: request.fromNode,
        to_node: request.toNode,
        relationship_type: request.relationshipType,
        weight: request.weight ?? this.config.defaultWeight,
        properties: request.properties || {},
        agent_id: request.agentId,
      };

      // Enhanced edge processing
      const processedRequest = await this.processEdgeCreationTauri(tauriRequest, context);

      // Create edge via Tauri backend
      const edgeId = await tauriGraphService.createEdge(processedRequest);

      // Update caches and graph structure
      await this.updateEdgeCacheTauri(edgeId, processedRequest);
      this.updateAdjacencyList(request.fromNode, [request.toNode], 'add_edge');
      this.updateGraphStructure(request.agentId, edgeId, 'edge_added');

      // Handle post-creation business logic
      await this.handleEdgeCreated(edgeId, request, context);

      return {
        success: true,
        data: edgeId,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create edge');
    }
  }

  /**
   * Get a specific edge by ID
   */
  async getEdge(edgeId: string, context: AuthContext): Promise<ServiceResult<KnowledgeEdge>> {
    try {
      let edge = this.edgeCache.get(edgeId);

      if (!edge) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Edge not found');
      }

      // Authorization check
      if (!(await this.hasReadEdgePermission(edge, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to read edge'
        );
      }

      // Apply business rules for edge access
      const processedEdge = await this.processEdgeForReading(edge, context);

      return {
        success: true,
        data: processedEdge,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get edge');
    }
  }

  /**
   * Update edge properties
   */
  async updateEdge(
    edgeId: string,
    weight?: number,
    properties?: Record<string, string>,
    context?: AuthContext
  ): Promise<ServiceResult<void>> {
    try {
      const edge = this.edgeCache.get(edgeId);
      if (!edge) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Edge not found');
      }

      // Authorization check
      if (context && !(await this.hasUpdateEdgePermission(edge, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to update edge'
        );
      }

      // Apply business logic for updates
      const updatedEdge = {
        ...edge,
        ...(weight !== undefined && { weight }),
        ...(properties && { properties: { ...edge.properties, ...properties } }),
        updated_at: new Date().toISOString(),
      };

      this.edgeCache.set(edgeId, updatedEdge);

      // In a full implementation, you'd have update_edge command
      console.warn('Update edge not implemented in client - would require backend support');

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to update edge');
    }
  }

  /**
   * Delete an edge
   */
  async deleteEdge(edgeId: string, context: AuthContext): Promise<ServiceResult<void>> {
    try {
      const edge = this.edgeCache.get(edgeId);
      if (!edge) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Edge not found');
      }

      // Authorization check
      if (!(await this.hasDeleteEdgePermission(edge, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to delete edge'
        );
      }

      // Archive before deletion
      await this.archiveEdge(edge);

      // Remove from cache and adjacency list
      this.edgeCache.delete(edgeId);
      this.updateAdjacencyList(edge.from_node, [edge.to_node], 'remove_edge');

      // In a full implementation, you'd have delete_edge command
      console.warn('Delete edge not implemented in client - would require backend support');

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to delete edge');
    }
  }

  /**
   * Get graph data for visualization
   */
  async getGraph(
    agentId: string,
    query?: GraphQuery,
    context?: AuthContext
  ): Promise<ServiceResult<GraphView>> {
    try {
      // Authorization check
      if (context && !(await this.hasReadGraphPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to read graph'
        );
      }

      // Get or create graph view
      let graphView = this.graphsByAgent.get(agentId);
      if (!graphView) {
        graphView = await this.buildGraphView(agentId, query);
        this.graphsByAgent.set(agentId, graphView);
      }

      // Apply query filters if provided
      if (query) {
        graphView = await this.applyGraphQuery(graphView, query);
      }

      return {
        success: true,
        data: graphView,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get graph');
    }
  }

  /**
   * Find shortest path between two nodes
   */
  async findPath(
    fromNode: string,
    toNode: string,
    maxDepth?: number,
    context?: AuthContext
  ): Promise<ServiceResult<PathResult[]>> {
    try {
      // Validate nodes exist
      if (!this.nodeCache.has(fromNode) || !this.nodeCache.has(toNode)) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'One or both nodes not found');
      }

      // Use Dijkstra's algorithm to find shortest paths
      const paths = await this.dijkstraSearch(fromNode, toNode, maxDepth || 6);

      return {
        success: true,
        data: paths,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to find path');
    }
  }

  /**
   * Get neighboring nodes
   */
  async getNeighbors(
    nodeId: string,
    depth?: number,
    context?: AuthContext
  ): Promise<ServiceResult<KnowledgeNode[]>> {
    try {
      if (!this.nodeCache.has(nodeId)) {
        return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'Node not found');
      }

      const neighbors = await this.breadthFirstSearch(nodeId, depth || 1);
      const neighborNodes = neighbors
        .map((id) => this.nodeCache.get(id))
        .filter((node) => node !== undefined) as KnowledgeNode[];

      return {
        success: true,
        data: neighborNodes,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get neighbors');
    }
  }

  /**
   * Get comprehensive graph statistics
   */
  async getGraphStats(agentId: string, context: AuthContext): Promise<ServiceResult<any>> {
    try {
      // Authorization check
      if (!(await this.hasStatsPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to view graph stats'
        );
      }

      const agentNodes = Array.from(this.nodeCache.values()).filter(
        (node) => node.properties.agent_id === agentId
      );
      const agentEdges = Array.from(this.edgeCache.values()).filter(
        (edge) => edge.properties.agent_id === agentId
      );

      const stats = {
        nodeCount: agentNodes.length,
        edgeCount: agentEdges.length,
        nodeTypes: this.getNodeTypeDistribution(agentNodes),
        relationshipTypes: this.getRelationshipTypeDistribution(agentEdges),
        connectivity: await this.calculateConnectivity(agentNodes, agentEdges),
        centrality: await this.calculateCentralityMetrics(agentNodes, agentEdges),
        density: this.calculateGraphDensity(agentNodes.length, agentEdges.length),
        components: await this.findConnectedComponents(agentId),
        averagePathLength: await this.calculateAveragePathLength(agentId),
        clusteringCoefficient: await this.calculateClusteringCoefficient(agentId),
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to get graph stats');
    }
  }

  /**
   * Find clusters in the graph
   */
  async findClusters(
    agentId: string,
    context: AuthContext
  ): Promise<ServiceResult<GraphCluster[]>> {
    try {
      // Authorization check
      if (!(await this.hasReadGraphPermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to find clusters'
        );
      }

      // Use community detection algorithm
      const clusters = await this.detectCommunities(agentId);

      return {
        success: true,
        data: clusters,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to find clusters');
    }
  }

  /**
   * Optimize graph structure and performance
   */
  async optimizeGraph(agentId: string, context: AuthContext): Promise<ServiceResult<void>> {
    try {
      // Authorization check
      if (!(await this.hasOptimizePermission(agentId, context))) {
        return this.createErrorResult(
          ServiceErrorCodes.FORBIDDEN,
          'Insufficient permissions to optimize graph'
        );
      }

      // Perform optimization operations
      await this.removeRedundantEdges(agentId);
      await this.mergeIdenticalNodes(agentId);
      await this.updateNodeWeights(agentId);
      await this.rebuildAdjacencyList(agentId);

      // Update optimization timestamp
      const stats = this.graphStats.get(agentId) || {
        nodeCount: 0,
        edgeCount: 0,
        lastOptimization: 0,
        clusterCount: 0,
      };
      stats.lastOptimization = Date.now();
      this.graphStats.set(agentId, stats);

      return {
        success: true,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to optimize graph');
    }
  }

  // Private helper methods

  private validateNodeRequest(request: NodeCreateRequest): ServiceResult<void> | null {
    if (!request.name?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Node name is required'
      );
    }

    if (!request.nodeType?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Node type is required'
      );
    }

    if (!request.agentId?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'Agent ID is required'
      );
    }

    return null;
  }

  private async checkGraphLimits(
    agentId: string,
    type: 'node' | 'edge'
  ): Promise<ServiceResult<void>> {
    const stats = this.graphStats.get(agentId) || {
      nodeCount: 0,
      edgeCount: 0,
      lastOptimization: 0,
      clusterCount: 0,
    };

    if (type === 'node' && stats.nodeCount >= this.config.maxNodes) {
      return this.createErrorResult(
        ServiceErrorCodes.QUOTA_EXCEEDED,
        'Maximum nodes per agent exceeded'
      );
    }

    if (type === 'edge' && stats.edgeCount >= this.config.maxEdges) {
      return this.createErrorResult(
        ServiceErrorCodes.QUOTA_EXCEEDED,
        'Maximum edges per agent exceeded'
      );
    }

    return { success: true };
  }

  private async processNodeCreation(
    request: ClientNodeRequest,
    context: AuthContext
  ): Promise<ClientNodeRequest> {
    return {
      ...request,
      name: request.name.trim(),
      properties: {
        ...request.properties,
        created_by: context.userId,
        created_at: new Date().toISOString(),
      },
    };
  }

  private async processNodeCreationTauri(
    request: CreateNodeRequest,
    context: AuthContext
  ): Promise<CreateNodeRequest> {
    return {
      ...request,
      name: request.name.trim(),
      properties: {
        ...request.properties,
        created_by: context.userId,
        created_at: new Date().toISOString(),
      },
    };
  }

  private async updateNodeCache(nodeId: string, request: ClientNodeRequest): Promise<void> {
    const node: KnowledgeNode = {
      id: nodeId,
      node_type: request.node_type,
      name: request.name,
      properties: request.properties,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.nodeCache.set(nodeId, node);
  }

  private async updateNodeCacheTauri(nodeId: string, request: CreateNodeRequest): Promise<void> {
    const node: KnowledgeNode = {
      id: nodeId,
      node_type: request.node_type as NodeType,
      name: request.name,
      properties: request.properties ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.nodeCache.set(nodeId, node);
  }

  private updateGraphStructure(agentId: string, itemId: string, operation: string): void {
    const stats = this.graphStats.get(agentId) || {
      nodeCount: 0,
      edgeCount: 0,
      lastOptimization: 0,
      clusterCount: 0,
    };

    switch (operation) {
      case 'node_added':
        stats.nodeCount++;
        break;
      case 'node_deleted':
        stats.nodeCount--;
        break;
      case 'edge_added':
        stats.edgeCount++;
        break;
      case 'edge_deleted':
        stats.edgeCount--;
        break;
    }

    this.graphStats.set(agentId, stats);
  }

  private async handleNodeCreated(
    nodeId: string,
    request: NodeCreateRequest,
    context: AuthContext
  ): Promise<void> {
    console.log(`Node ${nodeId} created for agent ${request.agentId}`);
  }

  private async processNodeForReading(
    node: KnowledgeNode,
    context: AuthContext
  ): Promise<KnowledgeNode> {
    return node;
  }

  private validateNodeUpdate(properties: Record<string, string>): ServiceResult<void> | null {
    if (Object.keys(properties).length === 0) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_INPUT,
        'At least one property must be updated'
      );
    }

    return null;
  }

  private async processNodeUpdate(
    node: KnowledgeNode,
    properties: Record<string, string>,
    context: AuthContext
  ): Promise<Record<string, string>> {
    return {
      ...properties,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };
  }

  private async handleNodeUpdated(
    nodeId: string,
    properties: Record<string, string>,
    context: AuthContext
  ): Promise<void> {
    console.log(`Node ${nodeId} updated by ${context.userId}`);
  }

  private async canDeleteNode(
    node: KnowledgeNode,
    context: AuthContext
  ): Promise<ServiceResult<void>> {
    // Check if node has critical connections
    const connections = Array.from(this.edgeCache.values()).filter(
      (edge) => edge.from_node === node.id || edge.to_node === node.id
    );

    if (connections.length > 10) {
      return this.createErrorResult(
        ServiceErrorCodes.INVALID_STATE,
        'Cannot delete highly connected node without confirmation'
      );
    }

    return { success: true };
  }

  private async archiveNode(node: KnowledgeNode): Promise<void> {
    console.log(`Archiving node ${node.id}`);
  }

  private async archiveEdge(edge: KnowledgeEdge): Promise<void> {
    console.log(`Archiving edge ${edge.id}`);
  }

  private async validateEdgeRequest(
    request: EdgeCreateRequest
  ): Promise<ServiceResult<void> | null> {
    if (!request.fromNode?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'From node is required'
      );
    }

    if (!request.toNode?.trim()) {
      return this.createErrorResult(
        ServiceErrorCodes.MISSING_REQUIRED_FIELD,
        'To node is required'
      );
    }

    if (request.fromNode === request.toNode) {
      return this.createErrorResult(ServiceErrorCodes.INVALID_INPUT, 'Self-loops are not allowed');
    }

    // Check if nodes exist
    if (!this.nodeCache.has(request.fromNode) || !this.nodeCache.has(request.toNode)) {
      return this.createErrorResult(ServiceErrorCodes.NOT_FOUND, 'One or both nodes do not exist');
    }

    // Check for duplicate edges
    const existingEdge = Array.from(this.edgeCache.values()).find(
      (edge) =>
        edge.from_node === request.fromNode &&
        edge.to_node === request.toNode &&
        edge.relationship_type === request.relationshipType
    );

    if (existingEdge) {
      return this.createErrorResult(
        ServiceErrorCodes.ALREADY_EXISTS,
        'Edge with same relationship already exists'
      );
    }

    return null;
  }

  private async processEdgeCreation(
    request: ClientEdgeRequest,
    context: AuthContext
  ): Promise<ClientEdgeRequest> {
    return {
      ...request,
      properties: {
        ...request.properties,
        created_by: context.userId,
        created_at: new Date().toISOString(),
      },
    };
  }

  private async processEdgeCreationTauri(
    request: CreateEdgeRequest,
    context: AuthContext
  ): Promise<CreateEdgeRequest> {
    return {
      ...request,
      properties: {
        ...request.properties,
        created_by: context.userId,
        created_at: new Date().toISOString(),
      },
    };
  }

  private async updateEdgeCache(edgeId: string, request: ClientEdgeRequest): Promise<void> {
    const edge: KnowledgeEdge = {
      id: edgeId,
      from_node: request.from_node,
      to_node: request.to_node,
      relationship_type: request.relationship_type,
      weight: request.weight || this.config.defaultWeight,
      properties: request.properties,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.edgeCache.set(edgeId, edge);
  }

  private async updateEdgeCacheTauri(edgeId: string, request: CreateEdgeRequest): Promise<void> {
    const edge: KnowledgeEdge = {
      id: edgeId,
      from_node: request.from_node,
      to_node: request.to_node,
      relationship_type: request.relationship_type as RelationshipType,
      weight: request.weight ?? this.config.defaultWeight,
      properties: request.properties ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.edgeCache.set(edgeId, edge);
  }

  private updateAdjacencyList(
    fromNode: string,
    toNodes: string[],
    operation: 'add_edge' | 'remove_edge' | 'remove_node'
  ): void {
    if (operation === 'remove_node') {
      this.adjacencyList.delete(fromNode);
      // Remove references to this node from other adjacency lists
      for (const [node, neighbors] of this.adjacencyList) {
        neighbors.delete(fromNode);
      }
      return;
    }

    const neighbors = this.adjacencyList.get(fromNode) || new Set();

    if (operation === 'add_edge') {
      toNodes.forEach((node) => neighbors.add(node));
    } else if (operation === 'remove_edge') {
      toNodes.forEach((node) => neighbors.delete(node));
    }

    this.adjacencyList.set(fromNode, neighbors);
  }

  private async handleEdgeCreated(
    edgeId: string,
    request: EdgeCreateRequest,
    context: AuthContext
  ): Promise<void> {
    console.log(`Edge ${edgeId} created between ${request.fromNode} and ${request.toNode}`);
  }

  private async processEdgeForReading(
    edge: KnowledgeEdge,
    context: AuthContext
  ): Promise<KnowledgeEdge> {
    return edge;
  }

  private async buildGraphView(agentId: string, query?: GraphQuery): Promise<GraphView> {
    const agentNodes = Array.from(this.nodeCache.values()).filter(
      (node) => node.properties.agent_id === agentId
    );
    const agentEdges = Array.from(this.edgeCache.values()).filter(
      (edge) => edge.properties.agent_id === agentId
    );

    return {
      nodes: agentNodes,
      edges: agentEdges,
      zoom: 1,
      center: [0, 0],
    };
  }

  private async applyGraphQuery(view: GraphView, query: GraphQuery): Promise<GraphView> {
    let filteredNodes = view.nodes;
    let filteredEdges = view.edges;

    if (query.nodeTypes && query.nodeTypes.length > 0) {
      filteredNodes = filteredNodes.filter((node) => query.nodeTypes!.includes(node.node_type));
    }

    if (query.relationshipTypes && query.relationshipTypes.length > 0) {
      filteredEdges = filteredEdges.filter((edge) =>
        query.relationshipTypes!.includes(edge.relationship_type)
      );
    }

    if (query.startNode) {
      // Filter to show only nodes within specified depth from start node
      const reachableNodes = await this.breadthFirstSearch(query.startNode, query.depth || 3);
      const reachableNodeSet = new Set(reachableNodes);

      filteredNodes = filteredNodes.filter((node) => reachableNodeSet.has(node.id));
      filteredEdges = filteredEdges.filter(
        (edge) => reachableNodeSet.has(edge.from_node) && reachableNodeSet.has(edge.to_node)
      );
    }

    return {
      ...view,
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }

  private async dijkstraSearch(
    startNode: string,
    targetNode: string,
    maxDepth: number
  ): Promise<PathResult[]> {
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // Initialize
    distances.set(startNode, 0);
    previous.set(startNode, null);
    unvisited.add(startNode);

    // Add all reachable nodes
    const reachableNodes = await this.breadthFirstSearch(startNode, maxDepth);
    reachableNodes.forEach((node) => {
      if (node !== startNode) {
        distances.set(node, Infinity);
        previous.set(node, null);
        unvisited.add(node);
      }
    });

    while (unvisited.size > 0) {
      // Find node with minimum distance
      let currentNode: string | null = null;
      let minDistance = Infinity;

      for (const node of unvisited) {
        const distance = distances.get(node) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          currentNode = node;
        }
      }

      if (!currentNode || minDistance === Infinity) break;

      unvisited.delete(currentNode);

      if (currentNode === targetNode) break;

      // Check neighbors
      const neighbors = this.adjacencyList.get(currentNode) || new Set();
      for (const neighbor of neighbors) {
        if (!unvisited.has(neighbor)) continue;

        const edge = Array.from(this.edgeCache.values()).find(
          (e) => e.from_node === currentNode && e.to_node === neighbor
        );
        const weight = edge?.weight || 1;
        const altDistance = (distances.get(currentNode) || 0) + weight;

        if (altDistance < (distances.get(neighbor) || Infinity)) {
          distances.set(neighbor, altDistance);
          previous.set(neighbor, currentNode);
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let current: string | null = targetNode;

    while (current !== null) {
      path.unshift(current);
      current = previous.get(current) || null;
    }

    if (path.length > 0 && path[0] === startNode) {
      return [
        {
          path,
          distance: path.length - 1,
          weight: distances.get(targetNode) || Infinity,
        },
      ];
    }

    return [];
  }

  private async breadthFirstSearch(startNode: string, depth: number): Promise<string[]> {
    const visited = new Set<string>();
    const queue: Array<{ node: string; depth: number }> = [{ node: startNode, depth: 0 }];
    const result: string[] = [];

    while (queue.length > 0) {
      const { node, depth: currentDepth } = queue.shift()!;

      if (visited.has(node) || currentDepth > depth) continue;

      visited.add(node);
      result.push(node);

      const neighbors = this.adjacencyList.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push({ node: neighbor, depth: currentDepth + 1 });
        }
      }
    }

    return result;
  }

  private getNodeTypeDistribution(nodes: KnowledgeNode[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    nodes.forEach((node) => {
      distribution[node.node_type] = (distribution[node.node_type] || 0) + 1;
    });
    return distribution;
  }

  private getRelationshipTypeDistribution(edges: KnowledgeEdge[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    edges.forEach((edge) => {
      distribution[edge.relationship_type] = (distribution[edge.relationship_type] || 0) + 1;
    });
    return distribution;
  }

  private async calculateConnectivity(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  ): Promise<number> {
    if (nodes.length <= 1) return 0;

    const maxPossibleEdges = (nodes.length * (nodes.length - 1)) / 2;
    return edges.length / maxPossibleEdges;
  }

  private async calculateCentralityMetrics(
    nodes: KnowledgeNode[],
    edges: KnowledgeEdge[]
  ): Promise<any> {
    const degreeCentrality = new Map<string, number>();

    nodes.forEach((node) => degreeCentrality.set(node.id, 0));

    edges.forEach((edge) => {
      degreeCentrality.set(edge.from_node, (degreeCentrality.get(edge.from_node) || 0) + 1);
      degreeCentrality.set(edge.to_node, (degreeCentrality.get(edge.to_node) || 0) + 1);
    });

    const sortedNodes = Array.from(degreeCentrality.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      topNodes: sortedNodes.map(([nodeId, degree]) => ({
        nodeId,
        degree,
        node: this.nodeCache.get(nodeId),
      })),
    };
  }

  private calculateGraphDensity(nodeCount: number, edgeCount: number): number {
    if (nodeCount <= 1) return 0;
    const maxPossibleEdges = (nodeCount * (nodeCount - 1)) / 2;
    return edgeCount / maxPossibleEdges;
  }

  private async findConnectedComponents(agentId: string): Promise<number> {
    const agentNodes = Array.from(this.nodeCache.values()).filter(
      (node) => node.properties.agent_id === agentId
    );

    const visited = new Set<string>();
    let components = 0;

    for (const node of agentNodes) {
      if (!visited.has(node.id)) {
        const component = await this.breadthFirstSearch(node.id, Infinity);
        component.forEach((nodeId) => visited.add(nodeId));
        components++;
      }
    }

    return components;
  }

  private async calculateAveragePathLength(agentId: string): Promise<number> {
    // Simplified calculation - in production you'd use more sophisticated algorithms
    return 3.2; // Placeholder
  }

  private async calculateClusteringCoefficient(agentId: string): Promise<number> {
    // Simplified calculation - in production you'd calculate actual clustering coefficient
    return 0.65; // Placeholder
  }

  private async detectCommunities(agentId: string): Promise<GraphCluster[]> {
    // Simplified community detection - in production you'd use algorithms like Louvain
    const agentNodes = Array.from(this.nodeCache.values()).filter(
      (node) => node.properties.agent_id === agentId
    );

    // Group nodes by type as a simple clustering approach
    const clusters = new Map<string, string[]>();

    agentNodes.forEach((node) => {
      const type = node.node_type;
      if (!clusters.has(type)) {
        clusters.set(type, []);
      }
      clusters.get(type)!.push(node.id);
    });

    return Array.from(clusters.entries()).map(([type, nodes], index) => ({
      id: `cluster-${index}`,
      nodes,
      strength: nodes.length / agentNodes.length,
      centerNode: nodes[0], // Simplified - would calculate actual center
    }));
  }

  private async removeRedundantEdges(agentId: string): Promise<void> {
    // Remove duplicate edges with same relationship type
    const edgeMap = new Map<string, KnowledgeEdge>();

    Array.from(this.edgeCache.values())
      .filter((edge) => edge.properties.agent_id === agentId)
      .forEach((edge) => {
        const key = `${edge.from_node}-${edge.to_node}-${edge.relationship_type}`;
        if (!edgeMap.has(key) || edgeMap.get(key)!.weight < edge.weight) {
          edgeMap.set(key, edge);
        }
      });

    // Update cache with deduplicated edges
    Array.from(this.edgeCache.entries()).forEach(([id, edge]) => {
      if (edge.properties.agent_id === agentId) {
        const key = `${edge.from_node}-${edge.to_node}-${edge.relationship_type}`;
        if (edgeMap.get(key) !== edge) {
          this.edgeCache.delete(id);
        }
      }
    });
  }

  private async mergeIdenticalNodes(agentId: string): Promise<void> {
    // Merge nodes with identical names and types
    const nodeGroups = new Map<string, KnowledgeNode[]>();

    Array.from(this.nodeCache.values())
      .filter((node) => node.properties.agent_id === agentId)
      .forEach((node) => {
        const key = `${node.name}-${node.node_type}`;
        if (!nodeGroups.has(key)) {
          nodeGroups.set(key, []);
        }
        nodeGroups.get(key)!.push(node);
      });

    // Merge duplicates
    for (const nodes of nodeGroups.values()) {
      if (nodes.length > 1) {
        const primaryNode = nodes[0];
        const duplicateNodes = nodes.slice(1);

        // Merge properties
        duplicateNodes.forEach((duplicate) => {
          Object.assign(primaryNode.properties, duplicate.properties);
          this.nodeCache.delete(duplicate.id);
        });
      }
    }
  }

  private async updateNodeWeights(agentId: string): Promise<void> {
    // Update node importance based on connectivity
    const agentNodes = Array.from(this.nodeCache.values()).filter(
      (node) => node.properties.agent_id === agentId
    );

    agentNodes.forEach((node) => {
      const connections = Array.from(this.edgeCache.values()).filter(
        (edge) => edge.from_node === node.id || edge.to_node === node.id
      );

      node.properties.importance_score = String(connections.length);
    });
  }

  private async rebuildAdjacencyList(agentId: string): Promise<void> {
    // Clear existing adjacency list for agent
    const agentNodes = Array.from(this.nodeCache.values()).filter(
      (node) => node.properties.agent_id === agentId
    );

    agentNodes.forEach((node) => {
      this.adjacencyList.delete(node.id);
    });

    // Rebuild from edges
    Array.from(this.edgeCache.values())
      .filter((edge) => edge.properties.agent_id === agentId)
      .forEach((edge) => {
        this.updateAdjacencyList(edge.from_node, [edge.to_node], 'add_edge');
      });
  }

  // Permission check methods
  private async hasCreateNodePermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) =>
        p.resource === 'graph' && p.action === 'create_node' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasReadNodePermission(node: KnowledgeNode, context: AuthContext): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'graph' && p.action === 'read');
  }

  private async hasUpdateNodePermission(
    node: KnowledgeNode,
    context: AuthContext
  ): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'graph' && p.action === 'update_node');
  }

  private async hasDeleteNodePermission(
    node: KnowledgeNode,
    context: AuthContext
  ): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'graph' && p.action === 'delete_node');
  }

  private async hasCreateEdgePermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) =>
        p.resource === 'graph' && p.action === 'create_edge' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasReadEdgePermission(edge: KnowledgeEdge, context: AuthContext): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'graph' && p.action === 'read');
  }

  private async hasUpdateEdgePermission(
    edge: KnowledgeEdge,
    context: AuthContext
  ): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'graph' && p.action === 'update_edge');
  }

  private async hasDeleteEdgePermission(
    edge: KnowledgeEdge,
    context: AuthContext
  ): Promise<boolean> {
    return context.permissions.some((p) => p.resource === 'graph' && p.action === 'delete_edge');
  }

  private async hasReadGraphPermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'graph' && p.action === 'read' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasStatsPermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'graph' && p.action === 'stats' && (!p.scope || p.scope === agentId)
    );
  }

  private async hasOptimizePermission(agentId: string, context: AuthContext): Promise<boolean> {
    return context.permissions.some(
      (p) => p.resource === 'graph' && p.action === 'optimize' && (!p.scope || p.scope === agentId)
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
