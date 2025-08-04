import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  // Ensure test results directory exists
  const fs = await import('fs');
  const path = await import('path');

  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Clean up any existing test data
  await cleanupTestData();

  console.log('✅ Global test setup completed');
}

async function cleanupTestData() {
  // Clean up any test data that might interfere with tests
  // This could include test databases, files, etc.
  console.log('🧹 Cleaning up test data...');
}

export default globalSetup;
