/**
 * Service Layer Types
 *
 * Comprehensive type definitions for the service layer architecture
 */

// Base service types
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SearchOptions extends PaginationOptions {
  query: string;
  threshold?: number;
}

export interface FilterOptions {
  tags?: string[];
  types?: string[];
  dateRange?: [Date, Date];
}

// Authentication & Authorization
export interface AuthContext {
  userId: string;
  agentId?: string;
  permissions: Permission[];
  sessionId: string;
}

export interface Permission {
  resource: string;
  action: string;
  scope?: string;
}

// Memory Service Types
export interface MemoryServiceConfig {
  defaultRelevanceThreshold: number;
  maxMemoriesPerAgent: number;
  backupInterval: number;
}

export interface MemoryCreateRequest {
  agentId: string;
  memoryType: string;
  content: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface MemorySearchRequest {
  agentId: string;
  query?: string;
  types?: string[];
  tags?: string[];
  options?: SearchOptions;
}

export interface MemoryUpdateRequest {
  memoryId: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

// Knowledge Service Types
export interface KnowledgeServiceConfig {
  confidenceThreshold: number;
  maxKnowledgeItems: number;
  syncInterval: number;
}

export interface KnowledgeCreateRequest {
  knowledgeType: string;
  title: string;
  content: string;
  sourceAgent: string;
  tags?: string[];
}

export interface KnowledgeSearchRequest {
  query: string;
  types?: string[];
  confidence?: number;
  options?: SearchOptions;
}

// Graph Service Types
export interface GraphServiceConfig {
  maxNodes: number;
  maxEdges: number;
  defaultWeight: number;
}

export interface NodeCreateRequest {
  nodeType: string;
  name: string;
  properties?: Record<string, string>;
  agentId: string;
}

export interface EdgeCreateRequest {
  fromNode: string;
  toNode: string;
  relationshipType: string;
  weight?: number;
  properties?: Record<string, string>;
  agentId: string;
}

export interface GraphQuery {
  startNode?: string;
  depth?: number;
  relationshipTypes?: string[];
  nodeTypes?: string[];
}

// Service Interfaces
export interface IMemoryService {
  // Configuration
  configure(config: MemoryServiceConfig): Promise<void>;

  // Memory lifecycle
  createMemory(request: MemoryCreateRequest, context: AuthContext): Promise<ServiceResult<string>>;
  getMemory(agentId: string, memoryId: string, context: AuthContext): Promise<ServiceResult<any>>;
  updateMemory(request: MemoryUpdateRequest, context: AuthContext): Promise<ServiceResult<void>>;
  deleteMemory(
    agentId: string,
    memoryId: string,
    context: AuthContext
  ): Promise<ServiceResult<void>>;

  // Search and filtering
  searchMemories(request: MemorySearchRequest, context: AuthContext): Promise<ServiceResult<any[]>>;
  filterMemories(
    agentId: string,
    filters: FilterOptions,
    context: AuthContext
  ): Promise<ServiceResult<any[]>>;

  // Analytics
  getMemoryStats(agentId: string, context: AuthContext): Promise<ServiceResult<any>>;
  getTypeDistribution(
    agentId: string,
    context: AuthContext
  ): Promise<ServiceResult<Record<string, number>>>;

  // Backup and maintenance
  backupMemories(
    agentId: string,
    backupName?: string,
    context?: AuthContext
  ): Promise<ServiceResult<string>>;
  cleanupMemories(
    agentId: string,
    retentionDays: number,
    context: AuthContext
  ): Promise<ServiceResult<number>>;

  // Initialization
  initializeAgent(agentId: string, context: AuthContext): Promise<ServiceResult<void>>;
}

export interface IKnowledgeService {
  // Configuration
  configure(config: KnowledgeServiceConfig): Promise<void>;

  // Knowledge lifecycle
  createKnowledge(
    request: KnowledgeCreateRequest,
    context: AuthContext
  ): Promise<ServiceResult<string>>;
  getKnowledge(knowledgeId: string, context: AuthContext): Promise<ServiceResult<any>>;
  updateKnowledge(
    knowledgeId: string,
    updates: Partial<KnowledgeCreateRequest>,
    context: AuthContext
  ): Promise<ServiceResult<void>>;
  deleteKnowledge(knowledgeId: string, context: AuthContext): Promise<ServiceResult<void>>;

  // Search and discovery
  searchKnowledge(
    request: KnowledgeSearchRequest,
    context: AuthContext
  ): Promise<ServiceResult<any[]>>;
  getRelatedKnowledge(
    knowledgeId: string,
    limit?: number,
    context?: AuthContext
  ): Promise<ServiceResult<any[]>>;

  // Collaboration
  shareKnowledge(
    knowledgeId: string,
    targetAgents: string[],
    context: AuthContext
  ): Promise<ServiceResult<void>>;
  mergeKnowledge(
    sourceIds: string[],
    targetTitle: string,
    context: AuthContext
  ): Promise<ServiceResult<string>>;

  // Analytics
  getKnowledgeStats(context: AuthContext): Promise<ServiceResult<any>>;
  getPopularKnowledge(limit?: number, context?: AuthContext): Promise<ServiceResult<any[]>>;
}

export interface IGraphService {
  // Configuration
  configure(config: GraphServiceConfig): Promise<void>;

  // Node operations
  createNode(request: NodeCreateRequest, context: AuthContext): Promise<ServiceResult<string>>;
  getNode(nodeId: string, context: AuthContext): Promise<ServiceResult<any>>;
  updateNode(
    nodeId: string,
    properties: Record<string, string>,
    context: AuthContext
  ): Promise<ServiceResult<void>>;
  deleteNode(nodeId: string, context: AuthContext): Promise<ServiceResult<void>>;

  // Edge operations
  createEdge(request: EdgeCreateRequest, context: AuthContext): Promise<ServiceResult<string>>;
  getEdge(edgeId: string, context: AuthContext): Promise<ServiceResult<any>>;
  updateEdge(
    edgeId: string,
    weight?: number,
    properties?: Record<string, string>,
    context?: AuthContext
  ): Promise<ServiceResult<void>>;
  deleteEdge(edgeId: string, context: AuthContext): Promise<ServiceResult<void>>;

  // Graph queries
  getGraph(agentId: string, query?: GraphQuery, context?: AuthContext): Promise<ServiceResult<any>>;
  findPath(
    fromNode: string,
    toNode: string,
    maxDepth?: number,
    context?: AuthContext
  ): Promise<ServiceResult<any[]>>;
  getNeighbors(
    nodeId: string,
    depth?: number,
    context?: AuthContext
  ): Promise<ServiceResult<any[]>>;

  // Analytics
  getGraphStats(agentId: string, context: AuthContext): Promise<ServiceResult<any>>;
  findClusters(agentId: string, context: AuthContext): Promise<ServiceResult<any[]>>;

  // Maintenance
  optimizeGraph(agentId: string, context: AuthContext): Promise<ServiceResult<void>>;
}

export interface IAuthService {
  // Authentication
  authenticate(credentials: any): Promise<ServiceResult<AuthContext>>;
  refreshAuth(context: AuthContext): Promise<ServiceResult<AuthContext>>;
  logout(context: AuthContext): Promise<ServiceResult<void>>;

  // Authorization
  hasPermission(context: AuthContext, resource: string, action: string): Promise<boolean>;
  checkPermissions(context: AuthContext, permissions: Permission[]): Promise<boolean[]>;

  // Session management
  validateSession(sessionId: string): Promise<ServiceResult<AuthContext>>;
  extendSession(sessionId: string): Promise<ServiceResult<void>>;
  invalidateSession(sessionId: string): Promise<ServiceResult<void>>;

  // User management
  getUserInfo(userId: string, context: AuthContext): Promise<ServiceResult<any>>;
  updateUserInfo(userId: string, updates: any, context: AuthContext): Promise<ServiceResult<void>>;

  // Role and permission management
  assignRole(userId: string, role: string, context: AuthContext): Promise<ServiceResult<void>>;
  revokeRole(userId: string, role: string, context: AuthContext): Promise<ServiceResult<void>>;
  grantPermission(
    userId: string,
    permission: Permission,
    context: AuthContext
  ): Promise<ServiceResult<void>>;
  revokePermission(
    userId: string,
    permission: Permission,
    context: AuthContext
  ): Promise<ServiceResult<void>>;
}

// Service Container Types
export interface ServiceContainer {
  register<T>(name: string, implementation: T): void;
  resolve<T>(name: string): T;
  has(name: string): boolean;
  dispose(): Promise<void>;
}

export interface ServiceDependencies {
  memoryService: IMemoryService;
  knowledgeService: IKnowledgeService;
  graphService: IGraphService;
  authService: IAuthService;
}

// Factory types
export interface ServiceFactory<T> {
  create(dependencies?: Partial<ServiceDependencies>): T;
}

// Event types for service communication
export interface ServiceEvent {
  type: string;
  source: string;
  data: any;
  timestamp: string;
}

export interface IEventBus {
  emit(event: ServiceEvent): void;
  on(eventType: string, handler: (event: ServiceEvent) => void): void;
  off(eventType: string, handler: (event: ServiceEvent) => void): void;
  dispose(): void;
}

// Common error codes
export const ServiceErrorCodes = {
  // Authentication/Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',

  // Business Logic
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_STATE: 'INVALID_STATE',
  DEPENDENCY_FAILED: 'DEPENDENCY_FAILED',
} as const;

export type ServiceErrorCode = (typeof ServiceErrorCodes)[keyof typeof ServiceErrorCodes];
