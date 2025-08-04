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

test.describe('Wallet Integration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/');
    await waitForLoadingComplete(page);
  });

  test('should display wallet connection status', async ({ page }) => {
    await expect(page.locator('[data-testid="wallet-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-connect-button"]')).toBeVisible();
  });

  test('should show disconnected state initially', async ({ page }) => {
    await expect(page.locator('[data-testid="wallet-status-disconnected"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="wallet-status-text"]', 'Not Connected');
  });

  test('should initiate Phantom wallet connection', async ({ page }) => {
    // Mock Phantom wallet availability
    await page.addInitScript(() => {
      (window as any).phantom = {
        solana: {
          isPhantom: true,
          connect: async () => {
            return {
              publicKey: {
                toString: () => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
              },
            };
          },
          disconnect: async () => ({}),
          signTransaction: async () => ({}),
          signAllTransactions: async () => [],
        },
      };
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Click connect wallet button
    await clickButton(page, '[data-testid="wallet-connect-button"]');

    // Should show connection process
    await expect(page.locator('[data-testid="wallet-connecting"]')).toBeVisible();

    // Should show connected state
    await waitForToast(page, 'Wallet connected', 'success');
    await expect(page.locator('[data-testid="wallet-status-connected"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-address"]')).toContainText('7xKXtg2C');
  });

  test('should handle wallet connection errors', async ({ page }) => {
    // Mock Phantom wallet with error
    await page.addInitScript(() => {
      (window as any).phantom = {
        solana: {
          isPhantom: true,
          connect: async () => {
            throw new Error('User rejected connection');
          },
        },
      };
    });

    await page.reload();
    await waitForLoadingComplete(page);

    await clickButton(page, '[data-testid="wallet-connect-button"]');

    // Should show error message
    await waitForToast(page, 'Connection failed', 'error');
    await expect(page.locator('[data-testid="wallet-status-disconnected"]')).toBeVisible();
  });

  test('should disconnect wallet', async ({ page }) => {
    // Mock connected wallet
    await page.addInitScript(() => {
      (window as any).phantom = {
        solana: {
          isPhantom: true,
          isConnected: true,
          publicKey: {
            toString: () => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          },
          disconnect: async () => ({}),
        },
      };
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should show connected state
    await expect(page.locator('[data-testid="wallet-status-connected"]')).toBeVisible();

    // Click disconnect button
    await clickButton(page, '[data-testid="wallet-disconnect-button"]');

    // Should show disconnected state
    await waitForToast(page, 'Wallet disconnected', 'success');
    await expect(page.locator('[data-testid="wallet-status-disconnected"]')).toBeVisible();
  });

  test('should handle missing Phantom wallet', async ({ page }) => {
    // Ensure no phantom wallet
    await page.addInitScript(() => {
      delete (window as any).phantom;
    });

    await page.reload();
    await waitForLoadingComplete(page);

    await clickButton(page, '[data-testid="wallet-connect-button"]');

    // Should show install prompt
    await expect(page.locator('[data-testid="install-phantom-dialog"]')).toBeVisible();
    await verifyElementText(page, 'h3', 'Install Phantom Wallet');
    await expect(page.locator('[data-testid="phantom-install-link"]')).toBeVisible();
  });

  test('should display wallet balance', async ({ page }) => {
    // Mock connected wallet with balance
    await page.route('**/api/wallet/balance/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balance: 1.5, currency: 'SOL' }),
      });
    });

    await page.addInitScript(() => {
      (window as any).phantom = {
        solana: {
          isPhantom: true,
          isConnected: true,
          publicKey: {
            toString: () => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          },
        },
      };
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should display balance
    await expect(page.locator('[data-testid="wallet-balance"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="balance-amount"]', '1.5 SOL');
  });

  test('should handle transaction signing', async ({ page }) => {
    // Mock transaction signing
    await page.addInitScript(() => {
      (window as any).phantom = {
        solana: {
          isPhantom: true,
          isConnected: true,
          publicKey: {
            toString: () => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          },
          signTransaction: async (transaction: any) => {
            return { ...transaction, signature: 'mock-signature' };
          },
        },
      };
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Trigger a test transaction
    await clickButton(page, '[data-testid="test-transaction-button"]');

    // Should show signing process
    await expect(page.locator('[data-testid="transaction-signing"]')).toBeVisible();

    // Should show success
    await waitForToast(page, 'Transaction signed', 'success');
  });

  test('should handle OAuth wallet connection', async ({ page }) => {
    // Mock OAuth wallet flow
    await page.route('**/oauth/wallet/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          auth_url: 'https://phantom.app/oauth',
          state: 'test-state',
        }),
      });
    });

    await clickButton(page, '[data-testid="wallet-oauth-button"]');

    // Should initiate OAuth flow
    await waitForToast(page, 'Opening wallet authentication', 'info');
    await expect(page.locator('[data-testid="oauth-wallet-pending"]')).toBeVisible();
  });

  test('should persist wallet connection state', async ({ page }) => {
    // Mock connected wallet
    await page.addInitScript(() => {
      (window as any).phantom = {
        solana: {
          isPhantom: true,
          isConnected: true,
          publicKey: {
            toString: () => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          },
        },
      };
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should show connected state
    await expect(page.locator('[data-testid="wallet-status-connected"]')).toBeVisible();

    // Navigate to different page and back
    await clickButton(page, '[data-testid="nav-settings"]');
    await clickButton(page, '[data-testid="nav-dashboard"]');

    // Should maintain connection state
    await expect(page.locator('[data-testid="wallet-status-connected"]')).toBeVisible();
  });

  test('should show wallet network status', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).phantom = {
        solana: {
          isPhantom: true,
          isConnected: true,
          publicKey: {
            toString: () => '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          },
        },
      };
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should display network information
    await expect(page.locator('[data-testid="wallet-network"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-name"]')).toContainText('Solana');
  });
});
