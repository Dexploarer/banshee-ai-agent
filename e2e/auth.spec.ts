import { expect, test } from '@playwright/test';
import { waitForTauriWindow } from './utils/tauri-helpers';
import {
  clickButton,
  fillFormField,
  navigateToPortal,
  verifyElementText,
  waitForAppLoad,
  waitForLoadingComplete,
  waitForToast,
} from './utils/test-helpers';

test.describe('Authentication E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/settings');
    await clickButton(page, '[data-testid="nav-ai-providers"]');
    await waitForLoadingComplete(page);
  });

  test('should display OAuth authentication options', async ({ page }) => {
    await expect(page.locator('[data-testid="oauth-providers"]')).toBeVisible();
    await expect(page.locator('[data-testid="anthropic-oauth"]')).toBeVisible();
    await expect(page.locator('[data-testid="openai-oauth"]')).toBeVisible();
  });

  test('should initiate OAuth flow for Anthropic', async ({ page }) => {
    // Mock OAuth response
    await page.route('**/oauth/anthropic/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ auth_url: 'https://auth.anthropic.com/oauth' }),
      });
    });

    await clickButton(page, '[data-testid="anthropic-oauth-button"]');

    // Should show OAuth initiation
    await waitForToast(page, 'Opening authentication window', 'info');
    await expect(page.locator('[data-testid="oauth-status-pending"]')).toBeVisible();
  });

  test('should handle OAuth success callback', async ({ page }) => {
    // Mock successful OAuth callback
    await page.route('**/oauth/callback/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          provider: 'anthropic',
          user: { email: 'test@example.com' },
        }),
      });
    });

    // Simulate OAuth callback
    await page.goto('/oauth/callback?code=test-code&state=test-state');
    await waitForLoadingComplete(page);

    // Should show success message
    await waitForToast(page, 'Authentication successful', 'success');
  });

  test('should handle OAuth errors', async ({ page }) => {
    // Mock OAuth error
    await page.route('**/oauth/anthropic/**', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'OAuth initialization failed' }),
      });
    });

    await clickButton(page, '[data-testid="anthropic-oauth-button"]');

    // Should show error message
    await waitForToast(page, 'Authentication failed', 'error');
    await expect(page.locator('[data-testid="oauth-status-error"]')).toBeVisible();
  });

  test('should display authentication status', async ({ page }) => {
    // Mock authenticated state
    await page.route('**/api/auth/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          anthropic: { authenticated: true, email: 'test@example.com' },
          openai: { authenticated: false },
        }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should show authenticated status for Anthropic
    await expect(page.locator('[data-testid="anthropic-status-authenticated"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="anthropic-user-email"]', 'test@example.com');

    // Should show unauthenticated status for OpenAI
    await expect(page.locator('[data-testid="openai-status-unauthenticated"]')).toBeVisible();
  });

  test('should logout from provider', async ({ page }) => {
    // Mock authenticated state
    await page.route('**/api/auth/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          anthropic: { authenticated: true, email: 'test@example.com' },
        }),
      });
    });

    await page.route('**/api/auth/logout/**', (route) => {
      route.fulfill({ status: 200 });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Click logout button
    await clickButton(page, '[data-testid="anthropic-logout-button"]');

    // Should show logout confirmation
    await waitForToast(page, 'Logged out successfully', 'success');
    await expect(page.locator('[data-testid="anthropic-status-unauthenticated"]')).toBeVisible();
  });

  test('should handle API key authentication as fallback', async ({ page }) => {
    // Add API key directly
    await clickButton(page, '[data-testid="add-api-key-button"]');
    await fillFormField(page, '[data-testid="api-key-name"]', 'Anthropic API');
    await fillFormField(page, '[data-testid="api-key-value"]', 'sk-test-key-123');
    await clickButton(page, '[data-testid="provider-anthropic"]');

    await clickButton(page, '[data-testid="save-api-key"]');
    await waitForToast(page, 'API key saved', 'success');

    // Should show API key authentication status
    await expect(page.locator('[data-testid="api-key-status"]')).toBeVisible();
  });

  test('should validate API key format', async ({ page }) => {
    await clickButton(page, '[data-testid="add-api-key-button"]');

    // Try invalid API key format
    await fillFormField(page, '[data-testid="api-key-name"]', 'Invalid Key');
    await fillFormField(page, '[data-testid="api-key-value"]', 'invalid-key');
    await clickButton(page, '[data-testid="save-api-key"]');

    // Should show validation error
    await expect(page.locator('[data-testid="key-format-error"]')).toContainText(
      'Invalid API key format'
    );
  });

  test('should handle authentication state persistence', async ({ page }) => {
    // Mock authenticated state
    await page.route('**/api/auth/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          anthropic: { authenticated: true, email: 'test@example.com' },
        }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Verify authenticated state persists
    await expect(page.locator('[data-testid="anthropic-status-authenticated"]')).toBeVisible();

    // Navigate away and back
    await clickButton(page, '[data-testid="nav-dashboard"]');
    await clickButton(page, '[data-testid="nav-settings"]');
    await clickButton(page, '[data-testid="nav-ai-providers"]');

    // Should still be authenticated
    await expect(page.locator('[data-testid="anthropic-status-authenticated"]')).toBeVisible();
  });
});
