import { expect } from 'vitest';
import type { AgentMemory, MemorySearchResult } from '@/lib/ai/memory/types';

// Custom matchers for testing
export const customMatchers = {
  /**
   * Check if a string is a valid UUID
   */
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },

  /**
   * Check if a number is within a time range
   */
  toBeWithinTimeRange(received: number, start: number, end: number) {
    const pass = received >= start && received <= end;

    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within time range ${start}-${end}ms`
          : `Expected ${received} to be within time range ${start}-${end}ms`,
    };
  },

  /**
   * Check if an object has valid AgentMemory structure
   */
  toHaveValidMemoryStructure(received: any) {
    const requiredFields = [
      'id',
      'agent_id',
      'memory_type',
      'content',
      'tags',
      'metadata',
      'created_at',
      'updated_at',
      'access_count',
      'relevance_score',
    ];

    const missingFields = requiredFields.filter((field) => !(field in received));
    const pass = missingFields.length === 0;

    return {
      pass,
      message: () =>
        pass
          ? `Expected object not to have valid memory structure`
          : `Expected object to have valid memory structure. Missing fields: ${missingFields.join(', ')}`,
    };
  },

  /**
   * Check if an array of memories contains one with specific content
   */
  toContainMemoryWithContent(received: AgentMemory[], content: string) {
    const pass = received.some((memory) => memory.content.includes(content));

    return {
      pass,
      message: () =>
        pass
          ? `Expected memories not to contain content "${content}"`
          : `Expected memories to contain content "${content}"`,
    };
  },

  /**
   * Check if search results are properly sorted by relevance
   */
  toBeSortedByRelevance(received: MemorySearchResult[]) {
    let pass = true;

    for (let i = 1; i < received.length; i++) {
      if (received[i - 1].memory.relevance_score < received[i].memory.relevance_score) {
        pass = false;
        break;
      }
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected search results not to be sorted by relevance`
          : `Expected search results to be sorted by relevance (descending)`,
    };
  },

  /**
   * Check if memories are properly sorted by date
   */
  toBeSortedByDate(received: AgentMemory[], ascending: boolean = false) {
    let pass = true;

    for (let i = 1; i < received.length; i++) {
      const date1 = new Date(received[i - 1].created_at);
      const date2 = new Date(received[i].created_at);

      if (ascending) {
        if (date1.getTime() > date2.getTime()) {
          pass = false;
          break;
        }
      } else {
        if (date1.getTime() < date2.getTime()) {
          pass = false;
          break;
        }
      }
    }

    return {
      pass,
      message: () =>
        pass
          ? `Expected memories not to be sorted by date (${ascending ? 'ascending' : 'descending'})`
          : `Expected memories to be sorted by date (${ascending ? 'ascending' : 'descending'})`,
    };
  },

  /**
   * Check if all memories have specific tags
   */
  toAllHaveTags(received: AgentMemory[], expectedTags: string[]) {
    const pass = received.every((memory) => expectedTags.every((tag) => memory.tags.includes(tag)));

    return {
      pass,
      message: () =>
        pass
          ? `Expected not all memories to have tags: ${expectedTags.join(', ')}`
          : `Expected all memories to have tags: ${expectedTags.join(', ')}`,
    };
  },

  /**
   * Check if any memory has specific tags
   */
  toHaveAnyMemoryWithTags(received: AgentMemory[], expectedTags: string[]) {
    const pass = received.some((memory) => expectedTags.some((tag) => memory.tags.includes(tag)));

    return {
      pass,
      message: () =>
        pass
          ? `Expected no memories to have any of these tags: ${expectedTags.join(', ')}`
          : `Expected at least one memory to have any of these tags: ${expectedTags.join(', ')}`,
    };
  },

  /**
   * Check if similarity scores are within valid range
   */
  toHaveValidSimilarityScores(received: MemorySearchResult[]) {
    const pass = received.every(
      (result) =>
        result.similarity_score === undefined ||
        (result.similarity_score >= 0 && result.similarity_score <= 1)
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected some similarity scores to be invalid`
          : `Expected all similarity scores to be between 0 and 1`,
    };
  },

  /**
   * Check if relevance scores are within valid range
   */
  toHaveValidRelevanceScores(received: AgentMemory[]) {
    const pass = received.every(
      (memory) => memory.relevance_score >= 0 && memory.relevance_score <= 1
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected some relevance scores to be invalid`
          : `Expected all relevance scores to be between 0 and 1`,
    };
  },
};

// Extend expect with custom matchers
expect.extend(customMatchers);

export default customMatchers;
