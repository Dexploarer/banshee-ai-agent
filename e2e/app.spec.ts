import { expect, test } from '@playwright/test';

test.describe('Banshee App', () => {
  test('should load the application', async ({ page }) => {
    // Navigate to the Tauri app
    // Note: This URL may need adjustment based on Tauri configuration
    await page.goto('http://localhost:1420');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Check that the main application is loaded
    await expect(page.locator('body')).toBeVisible();

    // Look for the main app container or title
    await expect(page.locator('[data-testid="app"], #root, .app')).toBeVisible();
  });

  test('should display navigation elements', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Check for navigation or main UI elements
    // Note: These selectors should be adjusted based on actual app structure
    const navigation = page.locator('nav, [role="navigation"], .navigation');
    await expect(navigation).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.waitForLoadState('networkidle');

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();
  });
});
