import type { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  // Clean up any test data
  await cleanupTestData();

  console.log('✅ Global test teardown completed');
}

async function cleanupTestData() {
  // Clean up any test data created during tests
  console.log('🧹 Cleaning up test data...');
}

export default globalTeardown;
