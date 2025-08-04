import { expect, test } from '@playwright/test';
import { waitForTauriWindow } from './utils/tauri-helpers';
import {
  clickButton,
  navigateToPortal,
  verifyElementText,
  waitForAppLoad,
  waitForLoadingComplete,
} from './utils/test-helpers';

test.describe('Navigation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/');
    await waitForLoadingComplete(page);
  });

  test('should navigate between all main portals', async ({ page }) => {
    // Test navigation to Dashboard
    await clickButton(page, '[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
    await verifyElementText(page, 'h1', 'Dashboard');

    // Test navigation to Workspace
    await clickButton(page, '[data-testid="nav-workspace"]');
    await expect(page).toHaveURL('/workspace');
    await expect(page.locator('[data-testid="workspace-sidebar"]')).toBeVisible();

    // Test navigation to Chat
    await clickButton(page, '[data-testid="nav-chat"]');
    await expect(page).toHaveURL('/chat');
    await expect(page.locator('[data-testid="chat-sidebar"]')).toBeVisible();

    // Test navigation to Settings
    await clickButton(page, '[data-testid="nav-settings"]');
    await expect(page).toHaveURL('/settings');
    await verifyElementText(page, 'h1', 'Settings');

    // Test navigation to MCP
    await clickButton(page, '[data-testid="nav-mcp"]');
    await expect(page).toHaveURL('/mcp');
    await verifyElementText(page, 'h1', 'MCP Servers');
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Dashboard should be active initially
    const dashboardNav = page.locator('[data-testid="nav-dashboard"]');
    await expect(dashboardNav).toHaveClass(/active/);

    // Navigate to workspace
    await clickButton(page, '[data-testid="nav-workspace"]');
    const workspaceNav = page.locator('[data-testid="nav-workspace"]');
    await expect(workspaceNav).toHaveClass(/active/);
    await expect(dashboardNav).not.toHaveClass(/active/);
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate to workspace
    await clickButton(page, '[data-testid="nav-workspace"]');
    await expect(page).toHaveURL('/workspace');

    // Navigate to chat
    await clickButton(page, '[data-testid="nav-chat"]');
    await expect(page).toHaveURL('/chat');

    // Use browser back
    await page.goBack();
    await expect(page).toHaveURL('/workspace');
    await expect(page.locator('[data-testid="workspace-sidebar"]')).toBeVisible();

    // Use browser forward
    await page.goForward();
    await expect(page).toHaveURL('/chat');
    await expect(page.locator('[data-testid="chat-sidebar"]')).toBeVisible();
  });

  test('should redirect legacy routes', async ({ page }) => {
    // Navigate to legacy /agents route
    await page.goto('/agents');
    await waitForLoadingComplete(page);

    // Should redirect to /workspace
    await expect(page).toHaveURL('/workspace');
    await expect(page.locator('[data-testid="workspace-sidebar"]')).toBeVisible();
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to settings
    await page.goto('/settings');
    await waitForLoadingComplete(page);

    await verifyElementText(page, 'h1', 'Settings');
    await expect(page.locator('[data-testid="nav-settings"]')).toHaveClass(/active/);
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Go to workspace and create an agent
    await clickButton(page, '[data-testid="nav-workspace"]');
    await clickButton(page, '[data-testid="create-agent-button"]');

    // Navigate away and back
    await clickButton(page, '[data-testid="nav-dashboard"]');
    await clickButton(page, '[data-testid="nav-workspace"]');

    // Should maintain build tab state
    await expect(page.locator('[data-testid="build-tab"]')).toHaveAttribute('data-state', 'active');
  });

  test('should show loading states during navigation', async ({ page }) => {
    // Mock slow response
    await page.route('**/api/**', (route) => {
      setTimeout(() => route.continue(), 1000);
    });

    await clickButton(page, '[data-testid="nav-workspace"]');

    // Should show loading state briefly
    await expect(page.locator('[data-testid="loading"]')).toBeVisible();

    await waitForLoadingComplete(page);
    await expect(page.locator('[data-testid="loading"]')).not.toBeVisible();
  });
});
