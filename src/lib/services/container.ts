/**
 * Dependency Injection Container
 *
 * Manages service lifecycle, dependencies, and provides clean service resolution.
 * Implements singleton pattern with proper disposal for testing.
 */

import { MemoryService } from './memory-service';
import { KnowledgeService } from './knowledge-service';
import { GraphService } from './graph-service';
import { AuthService, getAuthService } from './auth-service';
import type {
  ServiceContainer,
  ServiceDependencies,
  ServiceFactory,
  IMemoryService,
  IKnowledgeService,
  IGraphService,
  IAuthService,
  IEventBus,
  ServiceEvent,
} from './types';

/**
 * Simple Event Bus for service communication
 */
class EventBus implements IEventBus {
  private handlers = new Map<string, Array<(event: ServiceEvent) => void>>();

  emit(event: ServiceEvent): void {
    const eventHandlers = this.handlers.get(event.type) || [];
    eventHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
      }
    });
  }

  on(eventType: string, handler: (event: ServiceEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: (event: ServiceEvent) => void): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  dispose(): void {
    this.handlers.clear();
  }
}

/**
 * Service Registry for managing service instances
 */
class ServiceRegistry implements ServiceContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, ServiceFactory<any>>();
  private singletons = new Set<string>();
  private eventBus: EventBus;

  constructor() {
    this.eventBus = new EventBus();
    this.setupDefaultFactories();
    this.setupEventHandlers();
  }

  /**
   * Register a service instance or factory
   */
  register<T>(name: string, implementation: T | ServiceFactory<T>, singleton = true): void {
    if (this.isFactory(implementation)) {
      this.factories.set(name, implementation);
      if (singleton) {
        this.singletons.add(name);
      }
    } else {
      this.services.set(name, implementation);
      if (singleton) {
        this.singletons.add(name);
      }
    }

    this.eventBus.emit({
      type: 'service_registered',
      source: 'container',
      data: { serviceName: name, singleton },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Resolve a service by name
   */
  resolve<T>(name: string): T {
    // Check if already instantiated
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check if factory exists
    const factory = this.factories.get(name);
    if (factory) {
      const dependencies = this.resolveDependencies();
      const instance = factory.create(dependencies);

      // Store if singleton
      if (this.singletons.has(name)) {
        this.services.set(name, instance);
      }

      this.eventBus.emit({
        type: 'service_created',
        source: 'container',
        data: { serviceName: name },
        timestamp: new Date().toISOString(),
      });

      return instance;
    }

    throw new Error(`Service '${name}' not found in container`);
  }

  /**
   * Check if service is registered
   */
  has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Dispose all services and clean up
   */
  async dispose(): Promise<void> {
    // Emit disposal event
    this.eventBus.emit({
      type: 'container_disposing',
      source: 'container',
      data: { serviceCount: this.services.size },
      timestamp: new Date().toISOString(),
    });

    // Dispose services that have dispose method
    for (const [name, service] of this.services) {
      if (service && typeof service.dispose === 'function') {
        try {
          await service.dispose();
        } catch (error) {
          console.error(`Error disposing service '${name}':`, error);
        }
      }
    }

    // Clear all registrations
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
    this.eventBus.dispose();
  }

  /**
   * Get event bus for service communication
   */
  getEventBus(): IEventBus {
    return this.eventBus;
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    const serviceNames = new Set<string>();

    for (const name of this.services.keys()) {
      serviceNames.add(name);
    }

    for (const name of this.factories.keys()) {
      serviceNames.add(name);
    }

    return Array.from(serviceNames);
  }

  /**
   * Get service health status
   */
  getServiceHealth(): Record<string, { status: 'healthy' | 'error'; lastAccessed?: string }> {
    const health: Record<string, { status: 'healthy' | 'error'; lastAccessed?: string }> = {};

    // Check instantiated services
    for (const [name, service] of this.services) {
      try {
        // Basic health check - if service has healthCheck method, use it
        if (service && typeof service.healthCheck === 'function') {
          const isHealthy = service.healthCheck();
          health[name] = {
            status: isHealthy ? 'healthy' : 'error',
            lastAccessed: new Date().toISOString(),
          };
        } else {
          health[name] = {
            status: 'healthy',
            lastAccessed: new Date().toISOString(),
          };
        }
      } catch (error) {
        health[name] = {
          status: 'error',
          lastAccessed: new Date().toISOString(),
        };
      }
    }

    // Check registered but not instantiated services
    for (const name of this.factories.keys()) {
      if (!health[name]) {
        health[name] = {
          status: 'healthy', // Assume healthy until instantiated
        };
      }
    }

    return health;
  }

  // Private helper methods

  private isFactory<T>(obj: any): obj is ServiceFactory<T> {
    return obj && typeof obj.create === 'function';
  }

  private resolveDependencies(): Partial<ServiceDependencies> {
    const dependencies: Partial<ServiceDependencies> = {};

    // Lazily resolve dependencies to avoid circular dependencies
    Object.defineProperty(dependencies, 'memoryService', {
      get: () => this.resolve<IMemoryService>('memoryService'),
      enumerable: true,
    });

    Object.defineProperty(dependencies, 'knowledgeService', {
      get: () => this.resolve<IKnowledgeService>('knowledgeService'),
      enumerable: true,
    });

    Object.defineProperty(dependencies, 'graphService', {
      get: () => this.resolve<IGraphService>('graphService'),
      enumerable: true,
    });

    Object.defineProperty(dependencies, 'authService', {
      get: () => this.resolve<IAuthService>('authService'),
      enumerable: true,
    });

    return dependencies;
  }

  private setupDefaultFactories(): void {
    // Memory Service Factory
    this.register<IMemoryService>('memoryService', {
      create: () => new MemoryService(),
    });

    // Knowledge Service Factory
    this.register<IKnowledgeService>('knowledgeService', {
      create: () => new KnowledgeService(),
    });

    // Graph Service Factory
    this.register<IGraphService>('graphService', {
      create: () => new GraphService(),
    });

    // Auth Service Factory (uses singleton instance)
    this.register<IAuthService>('authService', {
      create: () => getAuthService(),
    });

    // Event Bus (already created)
    this.register<IEventBus>('eventBus', this.eventBus);
  }

  private setupEventHandlers(): void {
    // Log service lifecycle events
    this.eventBus.on('service_registered', (event) => {
      console.log(`Service registered: ${event.data.serviceName}`);
    });

    this.eventBus.on('service_created', (event) => {
      console.log(`Service created: ${event.data.serviceName}`);
    });

    // Handle cross-service communication
    this.eventBus.on('memory_created', (event) => {
      // Notify knowledge service about new memories that might become knowledge
      console.log('Memory created event received:', event.data);
    });

    this.eventBus.on('knowledge_shared', (event) => {
      // Update graph when knowledge is shared
      console.log('Knowledge shared event received:', event.data);
    });

    this.eventBus.on('user_authenticated', (event) => {
      // Initialize user-specific services
      console.log('User authenticated event received:', event.data);
    });
  }
}

/**
 * Service Locator Pattern Implementation
 */
class ServiceLocator {
  private static instance: ServiceLocator | null = null;
  private container: ServiceRegistry;

  private constructor() {
    this.container = new ServiceRegistry();
  }

  static getInstance(): ServiceLocator {
    if (!ServiceLocator.instance) {
      ServiceLocator.instance = new ServiceLocator();
    }
    return ServiceLocator.instance;
  }

  static async reset(): Promise<void> {
    if (ServiceLocator.instance) {
      await ServiceLocator.instance.container.dispose();
      ServiceLocator.instance = null;
    }
  }

  getContainer(): ServiceContainer {
    return this.container;
  }

  // Convenience methods for common services
  getMemoryService(): IMemoryService {
    return this.container.resolve<IMemoryService>('memoryService');
  }

  getKnowledgeService(): IKnowledgeService {
    return this.container.resolve<IKnowledgeService>('knowledgeService');
  }

  getGraphService(): IGraphService {
    return this.container.resolve<IGraphService>('graphService');
  }

  getAuthService(): IAuthService {
    return this.container.resolve<IAuthService>('authService');
  }

  getEventBus(): IEventBus {
    return this.container.resolve<IEventBus>('eventBus');
  }
}

/**
 * High-level Service Manager for easier usage
 */
export class ServiceManager {
  private locator: ServiceLocator;

  constructor() {
    this.locator = ServiceLocator.getInstance();
  }

  /**
   * Get all services as a convenient object
   */
  getServices(): ServiceDependencies {
    return {
      memoryService: this.locator.getMemoryService(),
      knowledgeService: this.locator.getKnowledgeService(),
      graphService: this.locator.getGraphService(),
      authService: this.locator.getAuthService(),
    };
  }

  /**
   * Initialize services with configuration
   */
  async initialize(config?: {
    memory?: any;
    knowledge?: any;
    graph?: any;
  }): Promise<void> {
    const services = this.getServices();

    // Configure services if config provided
    if (config) {
      if (config.memory) {
        await services.memoryService.configure(config.memory);
      }
      if (config.knowledge) {
        await services.knowledgeService.configure(config.knowledge);
      }
      if (config.graph) {
        await services.graphService.configure(config.graph);
      }
    }

    // Emit initialization complete event
    this.locator.getEventBus().emit({
      type: 'services_initialized',
      source: 'service_manager',
      data: { configProvided: !!config },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get service health status
   */
  getHealthStatus(): Record<string, { status: 'healthy' | 'error'; lastAccessed?: string }> {
    return (this.locator.getContainer() as ServiceRegistry).getServiceHealth();
  }

  /**
   * Register custom service
   */
  registerService<T>(name: string, implementation: T | ServiceFactory<T>, singleton = true): void {
    this.locator.getContainer().register(name, implementation, singleton);
  }

  /**
   * Get custom service
   */
  getService<T>(name: string): T {
    return this.locator.getContainer().resolve<T>(name);
  }

  /**
   * Subscribe to service events
   */
  onEvent(eventType: string, handler: (event: ServiceEvent) => void): void {
    this.locator.getEventBus().on(eventType, handler);
  }

  /**
   * Unsubscribe from service events
   */
  offEvent(eventType: string, handler: (event: ServiceEvent) => void): void {
    this.locator.getEventBus().off(eventType, handler);
  }

  /**
   * Emit custom service event
   */
  emitEvent(event: ServiceEvent): void {
    this.locator.getEventBus().emit(event);
  }

  /**
   * Dispose all services (mainly for testing)
   */
  async dispose(): Promise<void> {
    await ServiceLocator.reset();
  }
}

// Export convenience functions

/**
 * Get global service manager instance
 */
export function getServiceManager(): ServiceManager {
  return new ServiceManager();
}

/**
 * Get services directly without manager
 */
export function getServices(): ServiceDependencies {
  const locator = ServiceLocator.getInstance();
  return {
    memoryService: locator.getMemoryService(),
    knowledgeService: locator.getKnowledgeService(),
    graphService: locator.getGraphService(),
    authService: locator.getAuthService(),
  };
}

/**
 * Initialize services with default configuration
 */
export async function initializeServices(config?: {
  memory?: any;
  knowledge?: any;
  graph?: any;
}): Promise<ServiceManager> {
  const manager = getServiceManager();
  await manager.initialize(config);
  return manager;
}

/**
 * React Hook for using services in components
 */
export function useServices(): ServiceDependencies {
  return getServices();
}

/**
 * React Hook for using a specific service
 */
export function useService<T>(serviceName: string): T {
  const locator = ServiceLocator.getInstance();
  return locator.getContainer().resolve<T>(serviceName);
}

// Export types for external use
export type { ServiceContainer, ServiceDependencies, ServiceFactory };
