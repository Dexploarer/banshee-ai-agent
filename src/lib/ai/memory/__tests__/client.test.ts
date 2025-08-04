import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryClient, MemoryUtils } from '../client';
import { MemoryType } from '../types';
import type { CreateMemoryRequest, SearchMemoriesRequest, AgentMemory } from '../types';

// Mock the @tauri-apps/api/core module
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
const mockInvoke = vi.mocked(invoke);

describe('MemoryClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initAgentMemory', () => {
    it('should initialize agent memory successfully', async () => {
      mockInvoke.mockResolvedValueOnce(undefined);

      await MemoryClient.initAgentMemory('test-agent-1');

      expect(mockInvoke).toHaveBeenCalledWith('init_agent_memory', {
        agentId: 'test-agent-1',
      });
    });

    it('should handle initialization errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockInvoke.mockRejectedValueOnce(new Error(errorMessage));

      await expect(MemoryClient.initAgentMemory('test-agent-1')).rejects.toThrow(
        'Failed to initialize memory system:'
      );

      expect(mockInvoke).toHaveBeenCalledWith('init_agent_memory', {
        agentId: 'test-agent-1',
      });
    });

    it('should validate agent ID format', async () => {
      await expect(MemoryClient.initAgentMemory('')).rejects.toThrow();
      await expect(MemoryClient.initAgentMemory('   ')).rejects.toThrow();
    });
  });

  describe('saveMemory', () => {
    const validMemoryRequest: CreateMemoryRequest = {
      agent_id: 'test-agent-1',
      memory_type: MemoryType.Task,
      content: 'Test memory content for task completion',
      tags: ['important', 'test'],
      metadata: { source: 'unit-test', priority: 'high' },
    };

    it('should save memory successfully', async () => {
      const expectedMemoryId = 'memory-uuid-123';
      mockInvoke.mockResolvedValueOnce(expectedMemoryId);

      const result = await MemoryClient.saveMemory(validMemoryRequest);

      expect(result).toBe(expectedMemoryId);
      expect(mockInvoke).toHaveBeenCalledWith('save_agent_memory', {
        agentId: validMemoryRequest.agent_id,
        memoryType: validMemoryRequest.memory_type,
        content: validMemoryRequest.content,
        tags: validMemoryRequest.tags,
        metadata: validMemoryRequest.metadata,
      });
    });

    it('should handle optional parameters correctly', async () => {
      const minimalRequest: CreateMemoryRequest = {
        agent_id: 'test-agent-1',
        memory_type: MemoryType.Learning,
        content: 'Minimal memory content',
      };

      mockInvoke.mockResolvedValueOnce('memory-uuid-456');

      await MemoryClient.saveMemory(minimalRequest);

      expect(mockInvoke).toHaveBeenCalledWith('save_agent_memory', {
        agentId: minimalRequest.agent_id,
        memoryType: minimalRequest.memory_type,
        content: minimalRequest.content,
        tags: null,
        metadata: null,
      });
    });

    it('should handle save errors gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Storage quota exceeded'));

      await expect(MemoryClient.saveMemory(validMemoryRequest)).rejects.toThrow(
        'Failed to save memory:'
      );
    });

    it('should validate memory content length', async () => {
      const longContent = 'x'.repeat(10001);
      const invalidRequest = { ...validMemoryRequest, content: longContent };

      await expect(MemoryClient.saveMemory(invalidRequest)).rejects.toThrow();
    });
  });

  describe('getMemory', () => {
    const mockMemory: AgentMemory = {
      id: 'memory-123',
      agent_id: 'test-agent-1',
      memory_type: MemoryType.Conversation,
      content: 'Test conversation memory',
      tags: ['conversation', 'test'],
      metadata: { participants: '2', duration: '30min' },
      created_at: '2023-12-01T10:00:00Z',
      updated_at: '2023-12-01T10:00:00Z',
      access_count: 0,
      relevance_score: 0.85,
    };

    it('should retrieve memory successfully', async () => {
      mockInvoke.mockResolvedValueOnce(mockMemory);

      const result = await MemoryClient.getMemory('test-agent-1', 'memory-123');

      expect(result).toEqual(mockMemory);
      expect(mockInvoke).toHaveBeenCalledWith('get_agent_memory', {
        agentId: 'test-agent-1',
        memoryId: 'memory-123',
      });
    });

    it('should handle memory not found', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const result = await MemoryClient.getMemory('test-agent-1', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database error'));

      await expect(MemoryClient.getMemory('test-agent-1', 'memory-123')).rejects.toThrow(
        'Failed to retrieve memory:'
      );
    });

    it('should validate UUID format', async () => {
      await expect(MemoryClient.getMemory('test-agent-1', 'invalid-uuid')).rejects.toThrow();
    });
  });

  describe('searchMemories', () => {
    const mockSearchResults = [
      {
        memory: {
          id: 'memory-1',
          agent_id: 'test-agent-1',
          memory_type: MemoryType.Task,
          content: 'Complete testing setup',
          tags: ['testing', 'setup'],
          metadata: {},
          created_at: '2023-12-01T10:00:00Z',
          updated_at: '2023-12-01T10:00:00Z',
          access_count: 2,
          relevance_score: 0.95,
        },
        similarity_score: 0.89,
        relevance_rank: 1,
      },
    ];

    it('should search memories successfully', async () => {
      mockInvoke.mockResolvedValueOnce(mockSearchResults);

      const searchRequest: SearchMemoriesRequest = {
        agent_id: 'test-agent-1',
        content_search: 'testing',
        memory_types: [MemoryType.Task],
        limit: 10,
        offset: 0,
      };

      const results = await MemoryClient.searchMemories(searchRequest);

      expect(results).toEqual(mockSearchResults);
      expect(mockInvoke).toHaveBeenCalledWith('search_agent_memories', {
        agentId: searchRequest.agent_id,
        contentSearch: searchRequest.content_search,
        memoryTypes: searchRequest.memory_types,
        tags: null,
        limit: searchRequest.limit,
        offset: searchRequest.offset,
        similarityThreshold: null,
      });
    });

    it('should handle empty search results', async () => {
      mockInvoke.mockResolvedValueOnce([]);

      const searchRequest: SearchMemoriesRequest = {
        agent_id: 'test-agent-1',
        content_search: 'nonexistent',
      };

      const results = await MemoryClient.searchMemories(searchRequest);

      expect(results).toEqual([]);
    });

    it('should validate search parameters', async () => {
      const invalidRequest: SearchMemoriesRequest = {
        agent_id: '',
        limit: -1,
        offset: -1,
      };

      await expect(MemoryClient.searchMemories(invalidRequest)).rejects.toThrow();
    });

    it('should handle search errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Query timeout'));

      const searchRequest: SearchMemoriesRequest = {
        agent_id: 'test-agent-1',
        content_search: 'test',
      };

      await expect(MemoryClient.searchMemories(searchRequest)).rejects.toThrow(
        'Failed to search memories:'
      );
    });
  });

  describe('backupMemories', () => {
    it('should backup memories successfully', async () => {
      const backupPath = '/path/to/backup/agent-memories-2023.json';
      mockInvoke.mockResolvedValueOnce(backupPath);

      const result = await MemoryClient.backupMemories('test-agent-1', 'weekly-backup');

      expect(result).toBe(backupPath);
      expect(mockInvoke).toHaveBeenCalledWith('backup_agent_memories', {
        agentId: 'test-agent-1',
        backupName: 'weekly-backup',
      });
    });

    it('should handle backup without custom name', async () => {
      const backupPath = '/path/to/backup/agent-memories-auto.json';
      mockInvoke.mockResolvedValueOnce(backupPath);

      await MemoryClient.backupMemories('test-agent-1');

      expect(mockInvoke).toHaveBeenCalledWith('backup_agent_memories', {
        agentId: 'test-agent-1',
        backupName: null,
      });
    });

    it('should handle backup errors', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Insufficient disk space'));

      await expect(MemoryClient.backupMemories('test-agent-1')).rejects.toThrow(
        'Failed to backup memories:'
      );
    });
  });
});

describe('MemoryUtils', () => {
  const mockMemories: AgentMemory[] = [
    {
      id: 'memory-1',
      agent_id: 'test-agent',
      memory_type: MemoryType.Task,
      content: 'Complete unit testing setup',
      tags: ['testing', 'important'],
      metadata: { priority: 'high' },
      created_at: '2023-12-01T10:00:00Z',
      updated_at: '2023-12-01T10:00:00Z',
      access_count: 5,
      relevance_score: 0.95,
    },
    {
      id: 'memory-2',
      agent_id: 'test-agent',
      memory_type: MemoryType.Learning,
      content: 'Learned about memory management patterns',
      tags: ['learning', 'patterns'],
      metadata: { source: 'documentation' },
      created_at: '2023-12-01T09:00:00Z',
      updated_at: '2023-12-01T09:00:00Z',
      access_count: 2,
      relevance_score: 0.78,
    },
    {
      id: 'memory-3',
      agent_id: 'test-agent',
      memory_type: MemoryType.Conversation,
      content: 'Discussion about testing strategies',
      tags: ['conversation', 'testing'],
      metadata: { participants: '3' },
      created_at: '2023-12-01T11:00:00Z',
      updated_at: '2023-12-01T11:00:00Z',
      access_count: 1,
      relevance_score: 0.88,
    },
  ];

  describe('filterByType', () => {
    it('should filter memories by single type', () => {
      const result = MemoryUtils.filterByType(mockMemories, [MemoryType.Task]);
      expect(result).toHaveLength(1);
      expect(result[0].memory_type).toBe(MemoryType.Task);
    });

    it('should filter memories by multiple types', () => {
      const result = MemoryUtils.filterByType(mockMemories, [MemoryType.Task, MemoryType.Learning]);
      expect(result).toHaveLength(2);
    });

    it('should return all memories when no types specified', () => {
      const result = MemoryUtils.filterByType(mockMemories, []);
      expect(result).toEqual(mockMemories);
    });
  });

  describe('filterByTags', () => {
    it('should filter memories by single tag', () => {
      const result = MemoryUtils.filterByTags(mockMemories, ['testing']);
      expect(result).toHaveLength(2);
    });

    it('should filter memories by multiple tags', () => {
      const result = MemoryUtils.filterByTags(mockMemories, ['important', 'patterns']);
      expect(result).toHaveLength(2);
    });

    it('should return all memories when no tags specified', () => {
      const result = MemoryUtils.filterByTags(mockMemories, []);
      expect(result).toEqual(mockMemories);
    });
  });

  describe('filterByContent', () => {
    it('should filter memories by content search', () => {
      const result = MemoryUtils.filterByContent(mockMemories, 'testing');
      expect(result).toHaveLength(2);
    });

    it('should be case insensitive', () => {
      const result = MemoryUtils.filterByContent(mockMemories, 'TESTING');
      expect(result).toHaveLength(2);
    });

    it('should return all memories for empty search', () => {
      const result = MemoryUtils.filterByContent(mockMemories, '');
      expect(result).toEqual(mockMemories);
    });
  });

  describe('sortByRelevance', () => {
    it('should sort memories by relevance score descending', () => {
      const result = MemoryUtils.sortByRelevance(mockMemories);
      expect(result[0].relevance_score).toBe(0.95);
      expect(result[1].relevance_score).toBe(0.88);
      expect(result[2].relevance_score).toBe(0.78);
    });

    it('should not mutate original array', () => {
      const original = [...mockMemories];
      MemoryUtils.sortByRelevance(mockMemories);
      expect(mockMemories).toEqual(original);
    });
  });

  describe('sortByDate', () => {
    it('should sort memories by date descending by default', () => {
      const result = MemoryUtils.sortByDate(mockMemories);
      expect(new Date(result[0].created_at).getTime()).toBeGreaterThan(
        new Date(result[1].created_at).getTime()
      );
    });

    it('should sort memories by date ascending when specified', () => {
      const result = MemoryUtils.sortByDate(mockMemories, true);
      expect(new Date(result[0].created_at).getTime()).toBeLessThan(
        new Date(result[1].created_at).getTime()
      );
    });
  });

  describe('getUniqueTags', () => {
    it('should return unique tags sorted alphabetically', () => {
      const result = MemoryUtils.getUniqueTags(mockMemories);
      expect(result).toEqual(['conversation', 'important', 'learning', 'patterns', 'testing']);
    });

    it('should handle empty array', () => {
      const result = MemoryUtils.getUniqueTags([]);
      expect(result).toEqual([]);
    });
  });

  describe('getTypeDistribution', () => {
    it('should return correct distribution of memory types', () => {
      const result = MemoryUtils.getTypeDistribution(mockMemories);
      expect(result[MemoryType.Task]).toBe(1);
      expect(result[MemoryType.Learning]).toBe(1);
      expect(result[MemoryType.Conversation]).toBe(1);
      expect(result[MemoryType.Context]).toBe(0);
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = MemoryUtils.formatDate('2023-12-01T10:00:00Z');
      expect(result).toMatch(/Dec \d{1,2}, 2023 at \d{1,2}:\d{2} [AP]M/);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "just now" for recent dates', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 30000); // 30 seconds ago
      const result = MemoryUtils.getRelativeTime(recent.toISOString());
      expect(result).toBe('just now');
    });

    it('should return minutes for recent dates', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 300000); // 5 minutes ago
      const result = MemoryUtils.getRelativeTime(recent.toISOString());
      expect(result).toBe('5m ago');
    });
  });

  describe('truncateContent', () => {
    it('should truncate long content', () => {
      const longContent = 'x'.repeat(150);
      const result = MemoryUtils.truncateContent(longContent, 100);
      expect(result).toHaveLength(103); // 100 + "..."
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not truncate short content', () => {
      const shortContent = 'Short content';
      const result = MemoryUtils.truncateContent(shortContent, 100);
      expect(result).toBe(shortContent);
    });
  });

  describe('getTypeColor', () => {
    it('should return correct colors for memory types', () => {
      expect(MemoryUtils.getTypeColor(MemoryType.Task)).toBe('#10B981');
      expect(MemoryUtils.getTypeColor(MemoryType.Error)).toBe('#EF4444');
      expect(MemoryUtils.getTypeColor(MemoryType.Success)).toBe('#059669');
    });
  });

  describe('getTypeIcon', () => {
    it('should return correct icons for memory types', () => {
      expect(MemoryUtils.getTypeIcon(MemoryType.Task)).toBe('✅');
      expect(MemoryUtils.getTypeIcon(MemoryType.Conversation)).toBe('💬');
      expect(MemoryUtils.getTypeIcon(MemoryType.Learning)).toBe('🧠');
    });
  });
});
