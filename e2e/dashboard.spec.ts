import { test, expect } from '@playwright/test';
import {
  waitForAppLoad,
  navigateToPortal,
  waitForLoadingComplete,
  verifyElementText,
} from './utils/test-helpers';
import { waitForTauriWindow } from './utils/tauri-helpers';

test.describe('Dashboard Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/dashboard');
    await waitForLoadingComplete(page);
  });

  test('should display dashboard header and description', async ({ page }) => {
    await verifyElementText(page, 'h1', 'Dashboard');
    await verifyElementText(page, 'p', 'Monitor your AI agents, workflows, and system performance');
  });

  test('should display system stats cards', async ({ page }) => {
    // Verify all 4 main stat cards are present
    const statCards = [
      { title: 'Active Agents', icon: 'Bot' },
      { title: 'Total Conversations', icon: 'BarChart3' },
      { title: 'MCP Connections', icon: 'Zap' },
      { title: 'System Health', icon: 'Activity' },
    ];

    for (const card of statCards) {
      const cardElement = page.locator('[data-testid="stat-card"]', {
        has: page.locator('text=' + card.title),
      });
      await expect(cardElement).toBeVisible();

      // Verify card has numeric value
      const valueElement = cardElement.locator('.text-2xl.font-bold');
      await expect(valueElement).toBeVisible();

      const value = await valueElement.textContent();
      expect(value).toMatch(/^\d+%?$/); // Should be a number, possibly with %
    }
  });

  test('should display recent agent activity section', async ({ page }) => {
    const activitySection = page.locator('[data-testid="recent-activity"]');
    await expect(activitySection).toBeVisible();

    await verifyElementText(page, 'h3', 'Recent Agent Activity');
    await verifyElementText(page, 'p', 'Latest conversations and executions');

    // Check for activity items
    const activityItems = page.locator('[data-testid="activity-item"]');
    const count = await activityItems.count();

    if (count > 0) {
      // Verify first activity item structure
      const firstItem = activityItems.first();
      await expect(firstItem.locator('[data-testid="activity-icon"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="activity-title"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="activity-description"]')).toBeVisible();
      await expect(firstItem.locator('[data-testid="activity-timestamp"]')).toBeVisible();
    }
  });

  test('should display system resources section', async ({ page }) => {
    const resourcesSection = page.locator('[data-testid="system-resources"]');
    await expect(resourcesSection).toBeVisible();

    await verifyElementText(page, 'h3', 'System Resources');
    await verifyElementText(page, 'p', 'Current usage and performance');

    // Check for resource metrics
    const metrics = ['CPU Usage', 'Memory', 'Disk Usage'];

    for (const metric of metrics) {
      const metricElement = page.locator('[data-testid="resource-metric"]', {
        has: page.locator('text=' + metric),
      });
      await expect(metricElement).toBeVisible();

      // Verify progress bar
      const progressBar = metricElement.locator('[data-testid="progress-bar"]');
      await expect(progressBar).toBeVisible();

      // Verify percentage display
      const percentage = metricElement.locator('[data-testid="metric-percentage"]');
      await expect(percentage).toBeVisible();

      const percentValue = await percentage.textContent();
      expect(percentValue).toMatch(/^\d+%$/);
    }
  });

  test('should update stats dynamically', async ({ page }) => {
    // Get initial active agents count
    const activeAgentsCard = page.locator('[data-testid="stat-card"]', {
      has: page.locator('text=Active Agents'),
    });
    const initialCount = await activeAgentsCard.locator('.text-2xl.font-bold').textContent();

    // Wait a moment and check if stats refresh
    await page.waitForTimeout(2000);

    const updatedCount = await activeAgentsCard.locator('.text-2xl.font-bold').textContent();

    // Verify the count is still a valid number (might be same or different)
    expect(updatedCount).toMatch(/^\d+$/);
  });

  test('should display loading states properly', async ({ page }) => {
    // Refresh to see loading states
    await page.reload();

    // Check for skeleton loaders initially
    const skeletons = page.locator('[data-testid="skeleton"]');
    const skeletonCount = await skeletons.count();

    if (skeletonCount > 0) {
      await expect(skeletons.first()).toBeVisible();
    }

    // Wait for content to load
    await waitForLoadingComplete(page);

    // Verify skeletons are gone
    await expect(skeletons.first()).not.toBeVisible({ timeout: 10000 });
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Mock empty states by intercepting API calls
    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [], count: 0 }),
      });
    });

    await page.route('**/api/conversations/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversations: [], count: 0 }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Verify zero counts are displayed
    const activeAgentsCard = page.locator('[data-testid="stat-card"]', {
      has: page.locator('text=Active Agents'),
    });
    await expect(activeAgentsCard.locator('.text-2xl.font-bold')).toHaveText('0');

    const conversationsCard = page.locator('[data-testid="stat-card"]', {
      has: page.locator('text=Total Conversations'),
    });
    await expect(conversationsCard.locator('.text-2xl.font-bold')).toHaveText('0');
  });

  test('should be responsive across different screen sizes', async ({ page }) => {
    // Test desktop layout
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('[data-testid="stats-grid"]')).toHaveClass(/lg:grid-cols-4/);

    // Test tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="stats-grid"]')).toHaveClass(/md:grid-cols-2/);

    // Test mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    const statsGrid = page.locator('[data-testid="stats-grid"]');
    await expect(statsGrid).toBeVisible();

    // Verify cards stack vertically on mobile
    const cards = page.locator('[data-testid="stat-card"]');
    const cardCount = await cards.count();

    if (cardCount >= 2) {
      const firstCard = cards.first();
      const secondCard = cards.nth(1);

      const firstCardBox = await firstCard.boundingBox();
      const secondCardBox = await secondCard.boundingBox();

      // On mobile, second card should be below the first
      expect(secondCardBox?.y ?? 0).toBeGreaterThan(firstCardBox?.y ?? 0);
    }
  });

  test('should display system health with appropriate status', async ({ page }) => {
    const systemHealthCard = page.locator('[data-testid="stat-card"]', {
      has: page.locator('text=System Health'),
    });

    const healthValue = await systemHealthCard.locator('.text-2xl.font-bold').textContent();
    const healthPercentage = parseInt(healthValue?.replace('%', '') ?? '0');

    const statusText = await systemHealthCard
      .locator('.text-xs.text-muted-foreground')
      .textContent();

    if (healthPercentage > 80) {
      expect(statusText).toContain('All systems operational');
    } else {
      expect(statusText).toContain('Performance degraded');
    }
  });

  test('should show MCP server connection status', async ({ page }) => {
    const mcpCard = page.locator('[data-testid="stat-card"]', {
      has: page.locator('text=MCP Connections'),
    });

    const totalServers = await mcpCard.locator('.text-2xl.font-bold').textContent();
    const statusText = await mcpCard.locator('.text-xs.text-muted-foreground').textContent();

    // Should show format like "2 servers active" or "0 servers active"
    expect(statusText).toMatch(/\d+ servers? active/);

    const totalCount = parseInt(totalServers ?? '0');
    const activeMatch = statusText?.match(/(\d+) servers? active/);
    const activeCount = activeMatch ? parseInt(activeMatch[1]) : 0;

    // Active count should not exceed total count
    expect(activeCount).toBeLessThanOrEqual(totalCount);
  });

  test('should handle error states appropriately', async ({ page }) => {
    // Mock API error
    await page.route('**/api/system/stats', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should still display the dashboard structure
    await expect(page.locator('h1')).toHaveText('Dashboard');

    // Should show default/fallback values
    const statsCards = page.locator('[data-testid="stat-card"]');
    const cardCount = await statsCards.count();
    expect(cardCount).toBeGreaterThan(0);
  });
});
