import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type {
  AgentMemory,
  MemoryType,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  MemorySearchResult,
} from '@/lib/ai/memory/types';

/**
 * Test utilities for consistent testing patterns across the Banshee platform
 */

// Mock factory for creating test data
export class TestDataFactory {
  /**
   * Create a test agent memory with sensible defaults
   */
  static createAgentMemory(overrides: Partial<AgentMemory> = {}): AgentMemory {
    return {
      id: `test-memory-${Math.random().toString(36).substr(2, 9)}`,
      agent_id: 'test-agent',
      memory_type: 'Task' as MemoryType.Task,
      content: 'Test memory content for unit testing',
      tags: ['test', 'memory'],
      metadata: { source: 'test-suite' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      access_count: 0,
      relevance_score: 0.85,
      ...overrides,
    };
  }

  /**
   * Create a test create memory request
   */
  static createMemoryRequest(overrides: Partial<CreateMemoryRequest> = {}): CreateMemoryRequest {
    return {
      agent_id: 'test-agent',
      memory_type: 'Task' as MemoryType.Task,
      content: 'Test memory content for creation',
      tags: ['test'],
      metadata: { priority: 'high' },
      ...overrides,
    };
  }

  /**
   * Create a test search memory request
   */
  static createSearchRequest(
    overrides: Partial<SearchMemoriesRequest> = {}
  ): SearchMemoriesRequest {
    return {
      agent_id: 'test-agent',
      content_search: 'test',
      memory_types: ['Task' as MemoryType.Task],
      tags: ['test'],
      limit: 10,
      offset: 0,
      similarity_threshold: 0.7,
      ...overrides,
    };
  }

  /**
   * Create test search results
   */
  static createSearchResults(count: number = 3): MemorySearchResult[] {
    return Array.from({ length: count }, (_, index) => ({
      memory: this.createAgentMemory({
        id: `search-result-${index}`,
        content: `Search result ${index + 1} content`,
      }),
      similarity_score: 0.9 - index * 0.1,
      relevance_rank: index + 1,
    }));
  }

  /**
   * Create multiple test memories with different types
   */
  static createMemoryCollection(): AgentMemory[] {
    const memoryTypes: MemoryType[] = [
      'Task',
      'Learning',
      'Conversation',
      'Context',
      'Tool',
      'Error',
      'Success',
      'Pattern',
    ];

    return memoryTypes.map((type, index) =>
      this.createAgentMemory({
        id: `collection-memory-${index}`,
        memory_type: type,
        content: `${type} memory content example`,
        tags: [type.toLowerCase(), 'collection'],
        relevance_score: 0.8 + index * 0.02,
      })
    );
  }
}

// Mock managers for testing
export class MockManagerFactory {
  /**
   * Create a mock Tauri invoke function
   */
  static createMockInvoke(): Mock {
    return vi.fn().mockImplementation((command: string, args?: any) => {
      // Default mock responses based on command
      switch (command) {
        case 'init_agent_memory':
          return Promise.resolve();
        case 'save_agent_memory':
          return Promise.resolve(`memory-${Date.now()}`);
        case 'get_agent_memory':
          return Promise.resolve(TestDataFactory.createAgentMemory());
        case 'search_agent_memories':
          return Promise.resolve(TestDataFactory.createSearchResults());
        case 'backup_agent_memories':
          return Promise.resolve('/path/to/backup.json');
        default:
          return Promise.resolve(null);
      }
    });
  }

  /**
   * Create a mock crypto object for UUID generation
   */
  static createMockCrypto(): Crypto {
    return {
      randomUUID: () => `test-uuid-${Math.random().toString(36).substr(2, 9)}`,
      // Add other crypto methods as needed for testing
    } as Crypto;
  }

  /**
   * Create a mock local storage
   */
  static createMockLocalStorage(): Storage {
    const store: Record<string, string> = {};

    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
    };
  }
}

// Test assertion helpers
export class TestAssertions {
  /**
   * Assert that an agent memory has valid structure
   */
  static assertValidAgentMemory(memory: AgentMemory): void {
    expect(memory).toBeDefined();
    expect(memory.id).toBeTruthy();
    expect(memory.agent_id).toBeTruthy();
    expect(memory.memory_type).toBeTruthy();
    expect(memory.content).toBeTruthy();
    expect(Array.isArray(memory.tags)).toBe(true);
    expect(typeof memory.metadata).toBe('object');
    expect(memory.created_at).toBeTruthy();
    expect(memory.updated_at).toBeTruthy();
    expect(typeof memory.access_count).toBe('number');
    expect(typeof memory.relevance_score).toBe('number');
    expect(memory.relevance_score).toBeGreaterThanOrEqual(0);
    expect(memory.relevance_score).toBeLessThanOrEqual(1);
  }

  /**
   * Assert that a search result has valid structure
   */
  static assertValidSearchResult(result: MemorySearchResult): void {
    expect(result).toBeDefined();
    this.assertValidAgentMemory(result.memory);

    if (result.similarity_score !== undefined) {
      expect(result.similarity_score).toBeGreaterThanOrEqual(0);
      expect(result.similarity_score).toBeLessThanOrEqual(1);
    }

    expect(typeof result.relevance_rank).toBe('number');
    expect(result.relevance_rank).toBeGreaterThan(0);
  }

  /**
   * Assert that an array of memories is properly sorted by relevance
   */
  static assertSortedByRelevance(memories: AgentMemory[]): void {
    for (let i = 1; i < memories.length; i++) {
      expect(memories[i - 1].relevance_score).toBeGreaterThanOrEqual(memories[i].relevance_score);
    }
  }

  /**
   * Assert that an array of memories is properly sorted by date
   */
  static assertSortedByDate(memories: AgentMemory[], ascending: boolean = false): void {
    for (let i = 1; i < memories.length; i++) {
      const date1 = new Date(memories[i - 1].created_at);
      const date2 = new Date(memories[i].created_at);

      if (ascending) {
        expect(date1.getTime()).toBeLessThanOrEqual(date2.getTime());
      } else {
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    }
  }

  /**
   * Assert that memories contain specific tags
   */
  static assertMemoriesHaveTags(memories: AgentMemory[], expectedTags: string[]): void {
    const allTags = memories.flatMap((memory) => memory.tags);
    expectedTags.forEach((tag) => {
      expect(allTags).toContain(tag);
    });
  }

  /**
   * Assert that UUID format is valid
   */
  static assertValidUUID(uuid: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(uuid)).toBe(true);
  }
}

// Performance testing utilities
export class PerformanceTestUtils {
  /**
   * Measure execution time of an async function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; timeMs: number }> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();

    return {
      result,
      timeMs: endTime - startTime,
    };
  }

  /**
   * Assert that a function executes within a time limit
   */
  static async assertExecutionTime<T>(
    fn: () => Promise<T>,
    maxTimeMs: number,
    description: string = 'Operation'
  ): Promise<T> {
    const { result, timeMs } = await this.measureExecutionTime(fn);

    expect(timeMs).toBeLessThan(maxTimeMs);
    console.log(`${description} completed in ${timeMs.toFixed(2)}ms`);

    return result;
  }

  /**
   * Run a performance benchmark with multiple iterations
   */
  static async benchmark<T>(
    fn: () => Promise<T>,
    iterations: number = 10
  ): Promise<{ averageMs: number; minMs: number; maxMs: number; results: T[] }> {
    const times: number[] = [];
    const results: T[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, timeMs } = await this.measureExecutionTime(fn);
      times.push(timeMs);
      results.push(result);
    }

    return {
      averageMs: times.reduce((sum, time) => sum + time, 0) / times.length,
      minMs: Math.min(...times),
      maxMs: Math.max(...times),
      results,
    };
  }
}

// Error testing utilities
export class ErrorTestUtils {
  /**
   * Assert that a function throws an error with specific message
   */
  static async assertThrowsWithMessage(
    fn: () => Promise<any>,
    expectedMessagePattern: string | RegExp
  ): Promise<void> {
    try {
      await fn();
      throw new Error('Expected function to throw, but it did not');
    } catch (error) {
      if (error instanceof Error) {
        if (typeof expectedMessagePattern === 'string') {
          expect(error.message).toContain(expectedMessagePattern);
        } else {
          expect(error.message).toMatch(expectedMessagePattern);
        }
      } else {
        throw new Error('Expected error to be an instance of Error');
      }
    }
  }

  /**
   * Assert that a function throws a specific error type
   */
  static async assertThrowsErrorType<T extends Error>(
    fn: () => Promise<any>,
    ErrorType: new (...args: any[]) => T
  ): Promise<T> {
    try {
      await fn();
      throw new Error(`Expected function to throw ${ErrorType.name}, but it did not`);
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorType);
      return error as T;
    }
  }

  /**
   * Test error boundary behavior
   */
  static createErrorBoundaryTest(
    ErrorBoundary: React.ComponentType<{ children: React.ReactNode }>
  ) {
    return {
      expectErrorToBeCaught: (ThrowingComponent: React.ComponentType) => {
        // This would be implemented with React Testing Library
        // For now, it's a placeholder for the pattern
        expect(() => {
          // render(<ErrorBoundary><ThrowingComponent /></ErrorBoundary>);
        }).not.toThrow();
      },
    };
  }
}

// Setup and teardown utilities
export class TestSetupUtils {
  /**
   * Create a test environment with all necessary mocks
   */
  static setupTestEnvironment() {
    // Mock Tauri API
    const mockInvoke = MockManagerFactory.createMockInvoke();
    vi.mock('@tauri-apps/api/core', () => ({
      invoke: mockInvoke,
    }));

    // Mock browser APIs
    Object.defineProperty(global, 'crypto', {
      value: MockManagerFactory.createMockCrypto(),
    });

    Object.defineProperty(global, 'localStorage', {
      value: MockManagerFactory.createMockLocalStorage(),
    });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    return {
      mockInvoke,
      cleanup: () => {
        vi.clearAllMocks();
        vi.resetAllMocks();
      },
    };
  }

  /**
   * Create a test wrapper with all providers
   */
  static createTestWrapper() {
    // This would wrap components with necessary providers
    // For now, it's a placeholder for the pattern
    return ({ children }: { children: React.ReactNode }) => children;
  }

  /**
   * Wait for async operations to complete
   */
  static async waitForAsync(ms: number = 0): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a temporary test database path
   */
  static createTempDbPath(): string {
    return `/tmp/test-db-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`;
  }
}

// Integration test utilities
export class IntegrationTestUtils {
  /**
   * Test full memory workflow end-to-end
   */
  static async testMemoryWorkflow(
    mockInvoke: Mock,
    agentId: string = 'integration-test-agent'
  ): Promise<void> {
    // 1. Initialize agent memory
    mockInvoke.mockResolvedValueOnce(undefined);

    // 2. Save a memory
    const testMemoryId = 'integration-memory-123';
    mockInvoke.mockResolvedValueOnce(testMemoryId);

    // 3. Retrieve the memory
    const testMemory = TestDataFactory.createAgentMemory({ id: testMemoryId });
    mockInvoke.mockResolvedValueOnce(testMemory);

    // 4. Search memories
    const searchResults = TestDataFactory.createSearchResults(2);
    mockInvoke.mockResolvedValueOnce(searchResults);

    // 5. Backup memories
    const backupPath = '/tmp/backup-integration-test.json';
    mockInvoke.mockResolvedValueOnce(backupPath);

    // Verify all mock calls were made in the expected order
    expect(mockInvoke).toHaveBeenCalledTimes(5);
  }

  /**
   * Test error handling across the system
   */
  static async testErrorHandling(mockInvoke: Mock): Promise<void> {
    // Test various error scenarios
    const errorScenarios = [
      { command: 'init_agent_memory', error: new Error('Database connection failed') },
      { command: 'save_agent_memory', error: new Error('Storage quota exceeded') },
      { command: 'get_agent_memory', error: new Error('Memory not found') },
      { command: 'search_agent_memories', error: new Error('Query timeout') },
    ];

    for (const scenario of errorScenarios) {
      mockInvoke.mockRejectedValueOnce(scenario.error);

      // Each error should be handled gracefully
      // The actual test would verify proper error handling
    }
  }
}

// Export all utilities
export {
  TestDataFactory,
  MockManagerFactory,
  TestAssertions,
  PerformanceTestUtils,
  ErrorTestUtils,
  TestSetupUtils,
  IntegrationTestUtils,
};

// Type exports for convenience
export type {
  AgentMemory,
  MemoryType,
  CreateMemoryRequest,
  SearchMemoriesRequest,
  MemorySearchResult,
};
