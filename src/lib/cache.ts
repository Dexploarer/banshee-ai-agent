import { useCallback, useRef } from 'react';

// Cache configuration constants
const DEFAULT_MAX_SIZE = 1000;
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_KEY_LENGTH = 1000;
const MAX_COMPUTATION_KEY_LENGTH = 100;
const MAX_PATTERN_LENGTH = 100;
const ENTRY_METADATA_SIZE = 24; // Size of timestamp, accessCount, lastAccessed

export interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds (fixed expiration from creation time)
  namespace?: string;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage?: number;
}

class LRUCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly namespace: string;
  private stats = { hits: 0, misses: 0 };

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    this.ttl = Math.max(0, options.ttl || DEFAULT_TTL); // Ensure non-negative TTL
    this.namespace = options.namespace || 'default';
  }

  set(key: string, value: T): void {
    // Validate cache key
    if (!this.isValidKey(key)) {
      throw new Error('Invalid cache key');
    }

    const now = Date.now();
    
    // Check if key already exists
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.lastAccessed = now;
      entry.accessCount++;
      return;
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
    });
  }

  private isValidKey(key: string): boolean {
    return typeof key === 'string' && key.length > 0 && key.length <= MAX_KEY_LENGTH;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.stats.hits++;

    return entry.value;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  // Get all keys for iteration
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  // Get all entries for iteration
  entries(): IterableIterator<[string, CacheEntry<T>]> {
    return this.cache.entries();
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimates memory usage of the cache.
   * Note: This is an approximation based on assumptions about JavaScript memory allocation.
   * Actual memory usage may vary significantly across different JavaScript engines and object structures.
   * This method provides a rough estimate and should not be used for precise memory management.
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      try {
        // Key size (UTF-16 encoding)
        size += key.length * 2;
        
        // Value size (approximate)
        try {
          size += JSON.stringify(entry.value).length * 2;
        } catch (serializationError) {
          // Fallback for non-serializable objects
          size += 100; // Conservative estimate
        }
        
        // Entry metadata (timestamp, accessCount, lastAccessed)
        size += ENTRY_METADATA_SIZE;
      } catch (error) {
        // If we can't estimate this entry, skip it
        console.warn('Failed to estimate memory usage for cache entry:', error);
        continue;
      }
    }
    return size;
  }

  // Clean expired entries
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Global cache instances
const caches = new Map<string, LRUCache>();

export function getCache<T>(namespace: string, options?: CacheOptions): LRUCache<T> {
  if (!caches.has(namespace)) {
    caches.set(namespace, new LRUCache<T>({ ...options, namespace }));
  }
  return caches.get(namespace)!;
}

// React hook for caching
export function useCache<T>(
  namespace: string,
  options?: CacheOptions
): {
  get: (key: string) => T | null;
  set: (key: string, value: T) => void;
  has: (key: string) => boolean;
  delete: (key: string) => boolean;
  clear: () => void;
  stats: CacheStats;
} {
  const cacheRef = useRef<LRUCache<T>>();
  
  if (!cacheRef.current) {
    cacheRef.current = getCache<T>(namespace, options);
  }

  const get = useCallback((key: string): T | null => {
    return cacheRef.current!.get(key);
  }, []);

  const set = useCallback((key: string, value: T): void => {
    cacheRef.current!.set(key, value);
  }, []);

  const has = useCallback((key: string): boolean => {
    return cacheRef.current!.has(key);
  }, []);

  const deleteKey = useCallback((key: string): boolean => {
    return cacheRef.current!.delete(key);
  }, []);

  const clear = useCallback((): void => {
    cacheRef.current!.clear();
  }, []);

  return {
    get,
    set,
    has,
    delete: deleteKey,
    clear,
    stats: cacheRef.current!.getStats(),
  };
}

// Specialized cache for API responses
export class APICache {
  private cache: LRUCache<any>;
  private pendingRequests = new Map<string, Promise<any>>();
  private requestTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(options?: CacheOptions) {
    this.cache = getCache('api', options);
  }

  async get<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    // Validate cache key
    if (!this.isValidKey(key)) {
      throw new Error('Invalid cache key');
    }

    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request with proper error handling and timeout
    let promise: Promise<T>;
    const timeout = 30000; // 30 second timeout
    
    try {
      promise = fetcher()
        .then((result) => {
          this.cache.set(key, result);
          this.pendingRequests.delete(key);
          this.clearTimeout(key);
          return result;
        })
        .catch((error) => {
          // Remove from pending requests on error to prevent memory leak
          this.pendingRequests.delete(key);
          this.clearTimeout(key);
          throw error;
        });
    } catch (error) {
      // Handle synchronous errors from fetcher
      this.pendingRequests.delete(key);
      this.clearTimeout(key);
      throw error;
    }

    // Set timeout to prevent memory leaks
    const timeoutId = setTimeout(() => {
      this.pendingRequests.delete(key);
      this.requestTimeouts.delete(key);
    }, timeout);
    
    this.requestTimeouts.set(key, timeoutId);
    this.pendingRequests.set(key, promise);
    return promise;
  }

  private isValidKey(key: string): boolean {
    return typeof key === 'string' && key.length > 0 && key.length <= MAX_KEY_LENGTH;
  }

  private clearTimeout(key: string): void {
    const timeoutId = this.requestTimeouts.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.requestTimeouts.delete(key);
    }
  }

  invalidate(pattern?: string): void {
    if (pattern) {
      // Validate pattern to prevent injection attacks
      if (!this.isValidPattern(pattern)) {
        throw new Error('Invalid cache invalidation pattern');
      }
      
      // Use more precise pattern matching
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  private isValidPattern(pattern: string): boolean {
    if (typeof pattern !== 'string' || pattern.length === 0 || pattern.length > MAX_PATTERN_LENGTH) {
      return false;
    }
    
    // Prevent ReDoS attacks by limiting pattern complexity
    const dangerousPatterns = /[.*+?^${}()|[\]\\]{2,}/;
    if (dangerousPatterns.test(pattern)) {
      return false;
    }
    
    // Additional ReDoS protection: limit consecutive special characters
    const consecutiveSpecialChars = /[.*+?^${}()|[\]\\]{3,}/;
    if (consecutiveSpecialChars.test(pattern)) {
      return false;
    }
    
    // Prevent patterns that could cause catastrophic backtracking
    const catastrophicPatterns = /(\w+)*\w*\1/;
    if (catastrophicPatterns.test(pattern)) {
      return false;
    }
    
    return true;
  }

  getStats(): CacheStats {
    return this.cache.getStats();
  }
}

// Cache for expensive computations
export class ComputationCache {
  private cache: LRUCache<any>;

  constructor(options?: CacheOptions) {
    this.cache = getCache('computation', options);
  }

  memoize<T, Args extends any[]>(
    key: string,
    fn: (...args: Args) => T,
    args: Args
  ): T {
    // Validate key and args
    if (!this.isValidKey(key)) {
      throw new Error('Invalid computation cache key');
    }

    // Create a more secure cache key using hash
    const argsHash = this.hashArgs(args);
    const cacheKey = `${key}:${argsHash}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    this.cache.set(cacheKey, result);
    return result;
  }

  private isValidKey(key: string): boolean {
    return typeof key === 'string' && key.length > 0 && key.length <= MAX_COMPUTATION_KEY_LENGTH;
  }

  private hashArgs(args: any[]): string {
    // Simple hash function for arguments
    const str = JSON.stringify(args);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + charCode;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Export default cache instance
export const defaultCache = getCache('default');
export const apiCache = new APICache();
export const computationCache = new ComputationCache(); 