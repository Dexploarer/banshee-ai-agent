import { test, expect } from '@playwright/test';

test.describe('Memory Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Wait for the application to load
    await page.waitForLoadState('domcontentloaded');

    // Ensure we're on the memory management page or navigate to it
    if (!(await page.locator('[data-testid="memory-dashboard"]').isVisible())) {
      await page.click('[data-testid="nav-memory"]');
      await page.waitForSelector('[data-testid="memory-dashboard"]');
    }
  });

  test('should create a new memory successfully', async ({ page }) => {
    // Click the "Create Memory" button
    await page.click('[data-testid="create-memory-button"]');

    // Wait for the create memory dialog to appear
    await page.waitForSelector('[data-testid="create-memory-dialog"]');

    // Fill in the memory details
    await page.fill(
      '[data-testid="memory-content-input"]',
      'This is a test memory created through E2E testing'
    );

    // Select memory type
    await page.click('[data-testid="memory-type-select"]');
    await page.click('[data-testid="memory-type-task"]');

    // Add tags
    await page.fill('[data-testid="memory-tags-input"]', 'e2e, testing, automation');

    // Add metadata
    await page.click('[data-testid="add-metadata-button"]');
    await page.fill('[data-testid="metadata-key-input"]', 'priority');
    await page.fill('[data-testid="metadata-value-input"]', 'high');

    // Save the memory
    await page.click('[data-testid="save-memory-button"]');

    // Wait for success message
    await page.waitForSelector('[data-testid="success-toast"]');
    expect(await page.textContent('[data-testid="success-toast"]')).toContain(
      'Memory created successfully'
    );

    // Verify the memory appears in the list
    await page.waitForSelector('[data-testid="memory-list"]');
    const memoryList = page.locator('[data-testid="memory-list"]');
    await expect(memoryList).toContainText('This is a test memory created through E2E testing');
  });

  test('should search memories by content', async ({ page }) => {
    // Ensure we have some test data first
    await createTestMemory(page, 'E2E search test memory', ['search', 'test']);

    // Use the search functionality
    await page.fill('[data-testid="memory-search-input"]', 'E2E search');
    await page.press('[data-testid="memory-search-input"]', 'Enter');

    // Wait for search results
    await page.waitForSelector('[data-testid="search-results"]');

    // Verify search results contain the expected memory
    const searchResults = page.locator('[data-testid="search-results"]');
    await expect(searchResults).toContainText('E2E search test memory');

    // Clear search to show all memories again
    await page.fill('[data-testid="memory-search-input"]', '');
    await page.press('[data-testid="memory-search-input"]', 'Enter');
  });

  test('should filter memories by type', async ({ page }) => {
    // Create memories of different types
    await createTestMemory(page, 'Task memory for E2E', ['task'], 'Task');
    await createTestMemory(page, 'Learning memory for E2E', ['learning'], 'Learning');

    // Filter by Task type
    await page.click('[data-testid="memory-type-filter"]');
    await page.click('[data-testid="filter-task"]');

    // Wait for filtered results
    await page.waitForSelector('[data-testid="memory-list"]');

    // Verify only task memories are shown
    const memoryList = page.locator('[data-testid="memory-list"]');
    await expect(memoryList).toContainText('Task memory for E2E');
    await expect(memoryList).not.toContainText('Learning memory for E2E');

    // Clear filter
    await page.click('[data-testid="clear-filters"]');
  });

  test('should filter memories by tags', async ({ page }) => {
    // Create memories with specific tags
    await createTestMemory(page, 'Memory with urgent tag', ['urgent', 'important']);
    await createTestMemory(page, 'Memory with normal tag', ['normal', 'routine']);

    // Filter by urgent tag
    await page.click('[data-testid="tag-filter"]');
    await page.fill('[data-testid="tag-filter-input"]', 'urgent');
    await page.press('[data-testid="tag-filter-input"]', 'Enter');

    // Wait for filtered results
    await page.waitForSelector('[data-testid="memory-list"]');

    // Verify only memories with urgent tag are shown
    const memoryList = page.locator('[data-testid="memory-list"]');
    await expect(memoryList).toContainText('Memory with urgent tag');
    await expect(memoryList).not.toContainText('Memory with normal tag');
  });

  test('should view memory details', async ({ page }) => {
    // Create a test memory first
    await createTestMemory(page, 'Detailed memory for viewing', ['detail', 'view']);

    // Click on the memory to view details
    await page.click('[data-testid^="memory-card-"]');

    // Wait for memory details to load
    await page.waitForSelector('[data-testid="memory-details"]');

    // Verify memory details are displayed
    const memoryDetails = page.locator('[data-testid="memory-details"]');
    await expect(memoryDetails).toContainText('Detailed memory for viewing');
    await expect(memoryDetails).toContainText('detail');
    await expect(memoryDetails).toContainText('view');

    // Verify metadata is shown
    await expect(memoryDetails).toContainText('Created');
    await expect(memoryDetails).toContainText('Updated');
    await expect(memoryDetails).toContainText('Access Count');
  });

  test('should edit memory content', async ({ page }) => {
    // Create a test memory first
    await createTestMemory(page, 'Memory to be edited', ['edit', 'test']);

    // Click edit button on the memory
    await page.click('[data-testid^="edit-memory-"]');

    // Wait for edit dialog
    await page.waitForSelector('[data-testid="edit-memory-dialog"]');

    // Modify the content
    await page.fill(
      '[data-testid="memory-content-input"]',
      'This memory has been edited through E2E testing'
    );

    // Add a new tag
    await page.fill('[data-testid="memory-tags-input"]', 'edit, test, modified');

    // Save changes
    await page.click('[data-testid="save-memory-button"]');

    // Wait for success message
    await page.waitForSelector('[data-testid="success-toast"]');

    // Verify the memory was updated
    const memoryList = page.locator('[data-testid="memory-list"]');
    await expect(memoryList).toContainText('This memory has been edited through E2E testing');
    await expect(memoryList).toContainText('modified');
  });

  test('should delete memory', async ({ page }) => {
    // Create a test memory first
    await createTestMemory(page, 'Memory to be deleted', ['delete', 'test']);

    // Click delete button on the memory
    await page.click('[data-testid^="delete-memory-"]');

    // Wait for confirmation dialog
    await page.waitForSelector('[data-testid="delete-confirmation-dialog"]');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Wait for success message
    await page.waitForSelector('[data-testid="success-toast"]');
    expect(await page.textContent('[data-testid="success-toast"]')).toContain(
      'Memory deleted successfully'
    );

    // Verify the memory is no longer in the list
    const memoryList = page.locator('[data-testid="memory-list"]');
    await expect(memoryList).not.toContainText('Memory to be deleted');
  });

  test('should export memories', async ({ page }) => {
    // Ensure we have some memories to export
    await createTestMemory(page, 'Export test memory 1', ['export']);
    await createTestMemory(page, 'Export test memory 2', ['export']);

    // Click export button
    await page.click('[data-testid="export-memories-button"]');

    // Wait for export dialog
    await page.waitForSelector('[data-testid="export-dialog"]');

    // Select export format (JSON)
    await page.click('[data-testid="export-format-json"]');

    // Include metadata
    await page.check('[data-testid="include-metadata-checkbox"]');

    // Start export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="start-export-button"]');

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('memories');
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('should backup memories', async ({ page }) => {
    // Ensure we have some memories to backup
    await createTestMemory(page, 'Backup test memory', ['backup']);

    // Click backup button
    await page.click('[data-testid="backup-memories-button"]');

    // Wait for backup dialog
    await page.waitForSelector('[data-testid="backup-dialog"]');

    // Enter backup name
    await page.fill('[data-testid="backup-name-input"]', 'E2E Test Backup');

    // Start backup
    await page.click('[data-testid="start-backup-button"]');

    // Wait for success message
    await page.waitForSelector('[data-testid="success-toast"]');
    expect(await page.textContent('[data-testid="success-toast"]')).toContain(
      'Backup created successfully'
    );

    // Verify backup appears in backup list
    await page.click('[data-testid="view-backups-button"]');
    await page.waitForSelector('[data-testid="backup-list"]');
    const backupList = page.locator('[data-testid="backup-list"]');
    await expect(backupList).toContainText('E2E Test Backup');
  });

  test('should handle memory statistics display', async ({ page }) => {
    // Create memories of different types for statistics
    await createTestMemory(page, 'Stat test task', ['stats'], 'Task');
    await createTestMemory(page, 'Stat test learning', ['stats'], 'Learning');
    await createTestMemory(page, 'Stat test conversation', ['stats'], 'Conversation');

    // Navigate to statistics view
    await page.click('[data-testid="memory-stats-tab"]');

    // Wait for statistics to load
    await page.waitForSelector('[data-testid="memory-statistics"]');

    // Verify statistics are displayed
    const statsContainer = page.locator('[data-testid="memory-statistics"]');
    await expect(statsContainer).toContainText('Total Memories');
    await expect(statsContainer).toContainText('Task');
    await expect(statsContainer).toContainText('Learning');
    await expect(statsContainer).toContainText('Conversation');

    // Check memory type distribution chart
    await expect(page.locator('[data-testid="memory-type-chart"]')).toBeVisible();

    // Check recent activity
    await expect(page.locator('[data-testid="recent-activity"]')).toBeVisible();
  });

  test('should handle pagination correctly', async ({ page }) => {
    // Create multiple memories to test pagination
    for (let i = 1; i <= 15; i++) {
      await createTestMemory(page, `Pagination test memory ${i}`, ['pagination']);
    }

    // Check that pagination controls are visible
    await page.waitForSelector('[data-testid="pagination-controls"]');

    // Verify first page shows expected memories
    const memoryList = page.locator('[data-testid="memory-list"]');
    await expect(memoryList).toContainText('Pagination test memory 1');

    // Go to next page
    await page.click('[data-testid="next-page-button"]');

    // Verify we're on page 2 and content changes
    await page.waitForSelector('[data-testid="current-page-2"]');

    // Go back to first page
    await page.click('[data-testid="previous-page-button"]');

    // Verify we're back on page 1
    await page.waitForSelector('[data-testid="current-page-1"]');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock a network error by intercepting API calls
    await page.route('**/api/memories/**', (route) => {
      route.abort('failed');
    });

    // Try to create a memory (should fail)
    await page.click('[data-testid="create-memory-button"]');
    await page.waitForSelector('[data-testid="create-memory-dialog"]');
    await page.fill('[data-testid="memory-content-input"]', 'This should fail');
    await page.click('[data-testid="save-memory-button"]');

    // Verify error message is displayed
    await page.waitForSelector('[data-testid="error-toast"]');
    expect(await page.textContent('[data-testid="error-toast"]')).toContain(
      'Failed to create memory'
    );

    // Verify user can retry or cancel
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-button"]')).toBeVisible();
  });
});

// Helper function to create test memories
async function createTestMemory(
  page: any,
  content: string,
  tags: string[] = [],
  memoryType: string = 'Task'
) {
  await page.click('[data-testid="create-memory-button"]');
  await page.waitForSelector('[data-testid="create-memory-dialog"]');

  await page.fill('[data-testid="memory-content-input"]', content);

  if (memoryType !== 'Task') {
    await page.click('[data-testid="memory-type-select"]');
    await page.click(`[data-testid="memory-type-${memoryType.toLowerCase()}"]`);
  }

  if (tags.length > 0) {
    await page.fill('[data-testid="memory-tags-input"]', tags.join(', '));
  }

  await page.click('[data-testid="save-memory-button"]');
  await page.waitForSelector('[data-testid="success-toast"]');

  // Wait a bit for the UI to update
  await page.waitForTimeout(500);
}
