import '@testing-library/jest-dom';

// Extend Jest matchers for better assertions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeWithinTimeRange(startMs: number, endMs: number): R;
      toHaveValidMemoryStructure(): R;
      toContainMemoryWithContent(content: string): R;
    }
  }
}
