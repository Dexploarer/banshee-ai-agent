/**
 * Service Layer Entry Point
 *
 * Main export point for all service layer functionality.
 * Provides clean, organized access to services, containers, and utilities.
 */

// Core Services
export { MemoryService } from './memory-service';
export { KnowledgeService } from './knowledge-service';
export { GraphService } from './graph-service';
export { AuthService, getAuthService } from './auth-service';

// Container and Dependency Injection
export {
  ServiceManager,
  getServiceManager,
  getServices,
  initializeServices,
  useServices,
  useService,
} from './container';
export type { ServiceContainer, ServiceDependencies, ServiceFactory } from './container';

// Types
export type {
  // Core service interfaces
  IMemoryService,
  IKnowledgeService,
  IGraphService,
  IAuthService,
  IEventBus,
  // Request/Response types
  ServiceResult,
  ServiceError,
  ServiceErrorCode,
  // Authentication types
  AuthContext,
  Permission,
  // Memory types
  MemoryServiceConfig,
  MemoryCreateRequest,
  MemorySearchRequest,
  MemoryUpdateRequest,
  // Knowledge types
  KnowledgeServiceConfig,
  KnowledgeCreateRequest,
  KnowledgeSearchRequest,
  // Graph types
  GraphServiceConfig,
  NodeCreateRequest,
  EdgeCreateRequest,
  GraphQuery,
  // Utility types
  PaginationOptions,
  SearchOptions,
  FilterOptions,
  ServiceEvent,
} from './types';

// Error codes
export { ServiceErrorCodes } from './types';

// Re-export commonly used types from memory system
export type {
  AgentMemory,
  SharedKnowledge,
  KnowledgeNode,
  KnowledgeEdge,
  MemoryType,
  KnowledgeType,
  NodeType,
  RelationshipType,
  MemorySearchResult,
} from '../ai/memory/types';

/**
 * Service Layer Version
 */
export const SERVICE_LAYER_VERSION = '1.0.0';

/**
 * Service Layer Health Check
 */
export async function checkServiceHealth(): Promise<{
  version: string;
  healthy: boolean;
  services: Record<string, { status: 'healthy' | 'error'; lastAccessed?: string }>;
  timestamp: string;
}> {
  try {
    const manager = getServiceManager();
    const health = manager.getHealthStatus();

    const allHealthy = Object.values(health).every((service) => service.status === 'healthy');

    return {
      version: SERVICE_LAYER_VERSION,
      healthy: allHealthy,
      services: health,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      version: SERVICE_LAYER_VERSION,
      healthy: false,
      services: {},
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Initialize service layer with recommended defaults
 */
export async function initializeServiceLayer(): Promise<ServiceManager> {
  const config = {
    memory: {
      defaultRelevanceThreshold: 0.7,
      maxMemoriesPerAgent: 10000,
      backupInterval: 86400000, // 24 hours
    },
    knowledge: {
      confidenceThreshold: 0.8,
      maxKnowledgeItems: 5000,
      syncInterval: 3600000, // 1 hour
    },
    graph: {
      maxNodes: 10000,
      maxEdges: 50000,
      defaultWeight: 1.0,
    },
  };

  return await initializeServices(config);
}

/**
 * Service Layer Utilities
 */
export const ServiceUtils = {
  /**
   * Create a standardized service error
   */
  createError: (
    code: ServiceErrorCode,
    message: string,
    details?: Record<string, unknown>
  ): ServiceError => ({
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  }),

  /**
   * Create a success result
   */
  createSuccess: <T>(data: T): ServiceResult<T> => ({
    success: true,
    data,
  }),

  /**
   * Create an error result
   */
  createErrorResult: <T>(error: ServiceError): ServiceResult<T> => ({
    success: false,
    error,
  }),

  /**
   * Check if result is successful
   */
  isSuccess: <T>(
    result: ServiceResult<T>
  ): result is ServiceResult<T> & { success: true; data: T } => {
    return result.success;
  },

  /**
   * Check if result is an error
   */
  isError: <T>(
    result: ServiceResult<T>
  ): result is ServiceResult<T> & { success: false; error: ServiceError } => {
    return !result.success;
  },

  /**
   * Extract data from successful result or throw error
   */
  unwrap: <T>(result: ServiceResult<T>): T => {
    if (result.success) {
      return result.data!;
    }
    throw new Error(`Service error [${result.error!.code}]: ${result.error!.message}`);
  },

  /**
   * Extract data from successful result or return default
   */
  unwrapOr: <T>(result: ServiceResult<T>, defaultValue: T): T => {
    return result.success ? result.data! : defaultValue;
  },

  /**
   * Map result data through a function
   */
  map: <T, U>(result: ServiceResult<T>, mapper: (data: T) => U): ServiceResult<U> => {
    if (result.success) {
      return {
        success: true,
        data: mapper(result.data!),
      };
    }
    return {
      success: false,
      error: result.error!,
    };
  },

  /**
   * Chain service operations
   */
  flatMap: async <T, U>(
    result: ServiceResult<T>,
    mapper: (data: T) => Promise<ServiceResult<U>>
  ): Promise<ServiceResult<U>> => {
    if (result.success) {
      return await mapper(result.data!);
    }
    return {
      success: false,
      error: result.error!,
    };
  },
};

/**
 * Permission Utilities
 */
export const PermissionUtils = {
  /**
   * Create a permission object
   */
  create: (resource: string, action: string, scope?: string): Permission => ({
    resource,
    action,
    scope,
  }),

  /**
   * Check if a permission matches another
   */
  matches: (required: Permission, available: Permission): boolean => {
    if (available.resource === '*' && available.action === '*') return true;
    if (available.resource === required.resource && available.action === '*') return true;
    if (available.resource === required.resource && available.action === required.action) {
      if (!required.scope || !available.scope || available.scope === required.scope) {
        return true;
      }
    }
    return false;
  },

  /**
   * Check if user has required permissions
   */
  hasPermissions: (userPermissions: Permission[], required: Permission[]): boolean => {
    return required.every((req) =>
      userPermissions.some((avail) => PermissionUtils.matches(req, avail))
    );
  },

  /**
   * Filter permissions by resource
   */
  filterByResource: (permissions: Permission[], resource: string): Permission[] => {
    return permissions.filter((p) => p.resource === resource || p.resource === '*');
  },

  /**
   * Get all unique resources from permissions
   */
  getResources: (permissions: Permission[]): string[] => {
    const resources = new Set(permissions.map((p) => p.resource));
    return Array.from(resources);
  },

  /**
   * Get all unique actions for a resource
   */
  getActionsForResource: (permissions: Permission[], resource: string): string[] => {
    const actions = new Set(
      permissions.filter((p) => p.resource === resource || p.resource === '*').map((p) => p.action)
    );
    return Array.from(actions);
  },
};

/**
 * Context Utilities
 */
export const ContextUtils = {
  /**
   * Create a mock auth context for testing
   */
  createMockContext: (
    userId = 'test-user',
    permissions: Permission[] = [],
    agentId?: string
  ): AuthContext => ({
    userId,
    agentId,
    permissions,
    sessionId: 'mock-session-' + Math.random().toString(36).substr(2, 9),
  }),

  /**
   * Create admin context with all permissions
   */
  createAdminContext: (userId = 'admin'): AuthContext => ({
    userId,
    permissions: [{ resource: '*', action: '*' }],
    sessionId: 'admin-session-' + Math.random().toString(36).substr(2, 9),
  }),

  /**
   * Check if context has admin permissions
   */
  isAdmin: (context: AuthContext): boolean => {
    return context.permissions.some((p) => p.resource === '*' && p.action === '*');
  },

  /**
   * Get user-specific permissions (excluding admin)
   */
  getUserPermissions: (context: AuthContext): Permission[] => {
    return context.permissions.filter((p) => !(p.resource === '*' && p.action === '*'));
  },
};

/**
 * Development utilities (not for production)
 */
export const DevUtils = {
  /**
   * Log service layer info
   */
  logInfo: async (): Promise<void> => {
    const health = await checkServiceHealth();
    console.group('🔧 Service Layer Info');
    console.log('Version:', health.version);
    console.log('Healthy:', health.healthy);
    console.log('Services:', health.services);
    console.log('Timestamp:', health.timestamp);
    console.groupEnd();
  },

  /**
   * Reset all services (for testing)
   */
  reset: async (): Promise<void> => {
    const manager = getServiceManager();
    await manager.dispose();
    console.log('🔄 Service layer reset');
  },

  /**
   * Create sample data for testing
   */
  createSampleData: async (context: AuthContext): Promise<void> => {
    const services = getServices();

    // Create sample memories
    await services.memoryService.createMemory(
      {
        agentId: context.agentId || 'test-agent',
        memoryType: 'Learning',
        content: 'Sample learning memory for testing',
        tags: ['test', 'sample'],
        metadata: { source: 'dev-utils' },
      },
      context
    );

    // Create sample knowledge
    await services.knowledgeService.createKnowledge(
      {
        knowledgeType: 'Fact',
        title: 'Sample Knowledge',
        content: 'This is sample knowledge created for testing',
        sourceAgent: context.userId,
        tags: ['test', 'sample'],
      },
      context
    );

    console.log('📝 Sample data created');
  },
};

// Re-export commonly used service error codes for convenience
export const ErrorCodes = ServiceErrorCodes;
