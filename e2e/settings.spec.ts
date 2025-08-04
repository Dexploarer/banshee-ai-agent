import { test, expect } from '@playwright/test';
import {
  waitForAppLoad,
  navigateToPortal,
  waitForLoadingComplete,
  verifyElementText,
  fillFormField,
  clickButton,
  selectOption,
  waitForToast,
} from './utils/test-helpers';
import { waitForTauriWindow } from './utils/tauri-helpers';

test.describe('Settings Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/settings');
    await waitForLoadingComplete(page);
  });

  test('should display settings portal with main sections', async ({ page }) => {
    await verifyElementText(page, 'h1', 'Settings');
    await expect(page.locator('[data-testid="settings-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="settings-content"]')).toBeVisible();
  });

  test('should switch between settings sections', async ({ page }) => {
    // Test General settings (default)
    await expect(page.locator('[data-testid="general-settings"]')).toBeVisible();

    // Switch to AI Providers
    await clickButton(page, '[data-testid="nav-ai-providers"]');
    await expect(page.locator('[data-testid="ai-providers-settings"]')).toBeVisible();

    // Switch to Appearance
    await clickButton(page, '[data-testid="nav-appearance"]');
    await expect(page.locator('[data-testid="appearance-settings"]')).toBeVisible();

    // Switch to Advanced
    await clickButton(page, '[data-testid="nav-advanced"]');
    await expect(page.locator('[data-testid="advanced-settings"]')).toBeVisible();
  });

  test('should change theme settings', async ({ page }) => {
    await clickButton(page, '[data-testid="nav-appearance"]');

    // Test light theme
    await clickButton(page, '[data-testid="theme-light"]');
    await expect(page.locator('html')).not.toHaveClass('dark');

    // Test dark theme
    await clickButton(page, '[data-testid="theme-dark"]');
    await expect(page.locator('html')).toHaveClass('dark');

    // Test system theme
    await clickButton(page, '[data-testid="theme-system"]');
    await waitForToast(page, 'Theme updated', 'success');
  });

  test('should manage API keys', async ({ page }) => {
    await clickButton(page, '[data-testid="nav-ai-providers"]');

    // Add new API key
    await clickButton(page, '[data-testid="add-api-key-button"]');
    await fillFormField(page, '[data-testid="api-key-name"]', 'Test Provider');
    await fillFormField(page, '[data-testid="api-key-value"]', 'test-api-key-123');
    await selectOption(
      page,
      '[data-testid="provider-select"]',
      '[data-testid="provider-anthropic"]'
    );

    await clickButton(page, '[data-testid="save-api-key"]');
    await waitForToast(page, 'API key saved', 'success');

    // Verify key appears in list
    await expect(page.locator('[data-testid="api-key-item"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="api-key-name"]', 'Test Provider');
  });

  test('should configure general preferences', async ({ page }) => {
    // Test auto-save toggle
    await clickButton(page, '[data-testid="auto-save-toggle"]');
    await expect(page.locator('[data-testid="auto-save-toggle"]')).toBeChecked();

    // Test notification preferences
    await clickButton(page, '[data-testid="notifications-toggle"]');
    await expect(page.locator('[data-testid="notifications-toggle"]')).toBeChecked();

    // Save preferences
    await clickButton(page, '[data-testid="save-preferences"]');
    await waitForToast(page, 'Preferences saved', 'success');
  });

  test('should manage advanced settings', async ({ page }) => {
    await clickButton(page, '[data-testid="nav-advanced"]');

    // Test debug mode toggle
    await clickButton(page, '[data-testid="debug-mode-toggle"]');
    await expect(page.locator('[data-testid="debug-mode-toggle"]')).toBeChecked();

    // Test data export
    await clickButton(page, '[data-testid="export-data-button"]');
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();

    // Test data clear (with warning)
    await clickButton(page, '[data-testid="clear-data-button"]');
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await clickButton(page, '[data-testid="cancel-button"]');
  });

  test('should validate form inputs', async ({ page }) => {
    await clickButton(page, '[data-testid="nav-ai-providers"]');

    // Try to save empty API key form
    await clickButton(page, '[data-testid="add-api-key-button"]');
    await clickButton(page, '[data-testid="save-api-key"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="key-error"]')).toContainText('API key is required');
  });

  test('should persist settings across page reloads', async ({ page }) => {
    // Change theme to dark
    await clickButton(page, '[data-testid="nav-appearance"]');
    await clickButton(page, '[data-testid="theme-dark"]');

    // Reload page
    await page.reload();
    await waitForLoadingComplete(page);

    // Should maintain dark theme
    await expect(page.locator('html')).toHaveClass('dark');
    await clickButton(page, '[data-testid="nav-appearance"]');
    await expect(page.locator('[data-testid="theme-dark"]')).toBeChecked();
  });
});
