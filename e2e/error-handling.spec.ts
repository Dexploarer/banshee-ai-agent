import { test, expect } from '@playwright/test';
import {
  waitForAppLoad,
  navigateToPortal,
  waitForLoadingComplete,
  verifyElementText,
  clickButton,
  waitForToast,
} from './utils/test-helpers';
import { waitForTauriWindow } from './utils/tauri-helpers';

test.describe('Error Handling E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
  });

  test('should handle API server errors gracefully', async ({ page }) => {
    // Mock server error
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await navigateToPortal(page, '/dashboard');
    await waitForLoadingComplete(page);

    // Should show error state but not crash
    await expect(page.locator('[data-testid="error-fallback"]')).toBeVisible();
    await verifyElementText(page, 'h2', 'Something went wrong');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should handle network connectivity issues', async ({ page }) => {
    await navigateToPortal(page, '/chat');
    await waitForLoadingComplete(page);

    // Simulate network failure
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    // Try to perform action that requires network
    await clickButton(page, '[data-testid="create-conversation-button"]');

    // Should show network error
    await waitForToast(page, 'Network error', 'error');
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
  });

  test('should handle malformed API responses', async ({ page }) => {
    // Mock invalid JSON response
    await page.route('**/api/agents', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response',
      });
    });

    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);

    // Should show error state
    await expect(page.locator('[data-testid="parse-error"]')).toBeVisible();
    await verifyElementText(page, 'p', 'Failed to load data');
  });

  test('should handle component errors with error boundary', async ({ page }) => {
    // Navigate to a page that might have component errors
    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);

    // Inject JavaScript error to trigger error boundary
    await page.evaluate(() => {
      // Trigger a React component error
      const errorEvent = new Error('Test component error');
      window.dispatchEvent(new ErrorEvent('error', { error: errorEvent }));
    });

    // Error boundary should catch and display error
    await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
    await verifyElementText(page, 'h2', 'Something went wrong');
    await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
  });

  test('should handle unauthorized access', async ({ page }) => {
    // Mock 401 unauthorized response
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await navigateToPortal(page, '/settings');
    await waitForLoadingComplete(page);

    // Should show auth error
    await waitForToast(page, 'Authentication required', 'error');
    await expect(page.locator('[data-testid="auth-required"]')).toBeVisible();
  });

  test('should handle rate limiting', async ({ page }) => {
    // Mock 429 rate limit response
    await page.route('**/api/chat/**', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Rate limit exceeded', retryAfter: 60 }),
      });
    });

    await navigateToPortal(page, '/chat');
    await waitForLoadingComplete(page);

    // Try to send message
    await clickButton(page, '[data-testid="send-button"]');

    // Should show rate limit error
    await waitForToast(page, 'Rate limit exceeded', 'error');
    await expect(page.locator('[data-testid="rate-limit-info"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="retry-after"]', '60 seconds');
  });

  test('should handle form validation errors', async ({ page }) => {
    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);

    // Try to save empty form
    await clickButton(page, '[data-testid="save-agent-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="field-error"]')).toHaveCount(2); // name and prompt required
  });

  test('should handle file upload errors', async ({ page }) => {
    await navigateToPortal(page, '/settings');

    // Mock file upload error
    await page.route('**/api/upload/**', (route) => {
      route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'File too large' }),
      });
    });

    // Try to upload large file
    const fileInput = page.locator('[data-testid="file-upload"]');
    await fileInput.setInputFiles({
      name: 'large-file.json',
      mimeType: 'application/json',
      buffer: Buffer.alloc(10 * 1024 * 1024, 'a'), // 10MB file
    });

    // Should show file size error
    await waitForToast(page, 'File too large', 'error');
  });

  test('should recover from errors with retry mechanism', async ({ page }) => {
    let attempts = 0;
    await page.route('**/api/agents', (route) => {
      attempts++;
      if (attempts === 1) {
        // First attempt fails
        route.fulfill({ status: 500 });
      } else {
        // Second attempt succeeds
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: [] }),
        });
      }
    });

    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);

    // Should show error initially
    await expect(page.locator('[data-testid="error-state"]')).toBeVisible();

    // Click retry
    await clickButton(page, '[data-testid="retry-button"]');
    await waitForLoadingComplete(page);

    // Should recover and show normal state
    await expect(page.locator('[data-testid="error-state"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="workspace-sidebar"]')).toBeVisible();
  });

  test('should handle timeout errors', async ({ page }) => {
    // Mock very slow response
    await page.route('**/api/**', (route) => {
      // Never resolve to simulate timeout
      setTimeout(() => route.abort('timedout'), 30000);
    });

    await navigateToPortal(page, '/dashboard');

    // Should show timeout error
    await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 35000 });
    await verifyElementText(page, 'p', 'Request timed out');
  });

  test('should handle JavaScript runtime errors', async ({ page }) => {
    await navigateToPortal(page, '/');
    await waitForLoadingComplete(page);

    // Listen for uncaught errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // Trigger a runtime error
    await page.evaluate(() => {
      // Access undefined property to cause error
      (null as any).nonExistentProperty.access();
    });

    // Should catch and log the error
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Cannot read properties of null');
  });

  test('should provide helpful error messages to users', async ({ page }) => {
    // Mock specific error scenarios
    await page.route('**/api/agents', (route) => {
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Agents not found',
          message: 'The requested agents could not be found. They may have been deleted.',
        }),
      });
    });

    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);

    // Should show user-friendly error message
    await expect(page.locator('[data-testid="user-error-message"]')).toBeVisible();
    await verifyElementText(
      page,
      '[data-testid="error-description"]',
      'The requested agents could not be found'
    );

    // Should provide suggested actions
    await expect(page.locator('[data-testid="error-actions"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-new-agent-button"]')).toBeVisible();
  });
});
