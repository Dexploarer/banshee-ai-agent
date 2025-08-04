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
  waitForApiCall,
} from './utils/test-helpers';
import { waitForTauriWindow } from './utils/tauri-helpers';
import { createTestMCPServer } from './utils/test-data';

test.describe('MCP Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/mcp');
    await waitForLoadingComplete(page);
  });

  test('should display MCP portal with server management', async ({ page }) => {
    await verifyElementText(page, 'h1', 'MCP Servers');
    await expect(page.locator('[data-testid="mcp-server-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-server-button"]')).toBeVisible();
  });

  test('should show empty state when no servers configured', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: [] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    await verifyElementText(page, 'h3', 'No MCP Servers');
    await verifyElementText(page, 'p', 'Get started by adding your first MCP server');
    await expect(page.locator('[data-testid="add-first-server-button"]')).toBeVisible();
  });

  test('should display list of MCP servers', async ({ page }) => {
    const testServers = [
      createTestMCPServer({ name: 'Filesystem', status: 'connected' }),
      createTestMCPServer({ name: 'Web Scraper', status: 'disconnected' }),
      createTestMCPServer({ name: 'Database', status: 'connecting' }),
    ];

    await page.route('**/api/mcp/servers', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: testServers }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Verify all servers are displayed
    await expect(page.locator('[data-testid="server-card"]')).toHaveCount(3);

    // Verify server details
    await verifyElementText(page, '[data-testid="server-name"]', 'Filesystem');
    await expect(page.locator('[data-testid="server-status-connected"]')).toBeVisible();
    await expect(page.locator('[data-testid="server-status-disconnected"]')).toBeVisible();
    await expect(page.locator('[data-testid="server-status-connecting"]')).toBeVisible();
  });

  test('should add new MCP server', async ({ page }) => {
    await page.route('**/api/mcp/servers', (route) => {
      if (route.request().method() === 'POST') {
        const newServer = createTestMCPServer({
          name: 'New Test Server',
          url: 'http://localhost:3001',
          status: 'connected',
        });
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newServer),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ servers: [] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Open add server dialog
    await clickButton(page, '[data-testid="add-server-button"]');
    await expect(page.locator('[data-testid="add-server-dialog"]')).toBeVisible();

    // Fill server details
    await fillFormField(page, '[data-testid="server-name-field"]', 'New Test Server');
    await fillFormField(page, '[data-testid="server-url-field"]', 'http://localhost:3001');
    await fillFormField(page, '[data-testid="server-description-field"]', 'A test MCP server');

    // Select connection type
    await selectOption(page, '[data-testid="connection-type-select"]', '[data-testid="type-http"]');

    // Save server
    await clickButton(page, '[data-testid="save-server-button"]');
    await waitForApiCall(page, '/api/mcp/servers');

    // Verify success
    await waitForToast(page, 'MCP server added', 'success');
    await expect(page.locator('[data-testid="server-card"]')).toHaveCount(1);
    await verifyElementText(page, '[data-testid="server-name"]', 'New Test Server');
  });

  test('should connect and disconnect servers', async ({ page }) => {
    const testServer = createTestMCPServer({
      name: 'Test Server',
      status: 'disconnected',
    });

    await page.route('**/api/mcp/servers', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: [testServer] }),
      });
    });

    await page.route('**/api/mcp/servers/*/connect', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'connected' }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Server should be disconnected initially
    await expect(page.locator('[data-testid="server-status-disconnected"]')).toBeVisible();

    // Click connect button
    await clickButton(page, '[data-testid="connect-server-button"]');
    await waitForApiCall(page, '/api/mcp/servers/*/connect');

    // Should show connecting state temporarily
    await expect(page.locator('[data-testid="server-status-connecting"]')).toBeVisible();

    // Then connected state
    await waitForToast(page, 'Server connected', 'success');
    await expect(page.locator('[data-testid="server-status-connected"]')).toBeVisible();
  });

  test('should edit server configuration', async ({ page }) => {
    const testServer = createTestMCPServer({
      name: 'Editable Server',
      url: 'http://localhost:3001',
    });

    await page.route('**/api/mcp/servers', (route) => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...testServer, name: 'Updated Server' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ servers: [testServer] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Click edit button
    await clickButton(page, '[data-testid="edit-server-button"]');
    await expect(page.locator('[data-testid="edit-server-dialog"]')).toBeVisible();

    // Update server name
    await fillFormField(page, '[data-testid="server-name-field"]', 'Updated Server');

    // Save changes
    await clickButton(page, '[data-testid="save-server-button"]');
    await waitForApiCall(page, '/api/mcp/servers');

    // Verify update
    await waitForToast(page, 'Server updated', 'success');
    await verifyElementText(page, '[data-testid="server-name"]', 'Updated Server');
  });

  test('should delete server with confirmation', async ({ page }) => {
    const testServer = createTestMCPServer({ name: 'Server to Delete' });

    await page.route('**/api/mcp/servers', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204 });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ servers: [testServer] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Click delete button
    await clickButton(page, '[data-testid="delete-server-button"]');

    // Confirm deletion
    page.on('dialog', (dialog) => dialog.accept());

    await waitForApiCall(page, '/api/mcp/servers');
    await waitForToast(page, 'Server deleted', 'success');

    // Verify server is removed
    await expect(page.locator('[data-testid="server-card"]')).toHaveCount(0);
  });

  test('should display server tools and capabilities', async ({ page }) => {
    const testServer = createTestMCPServer({
      name: 'Tool Server',
      tools: ['read_file', 'write_file', 'list_directory'],
      capabilities: ['filesystem', 'text_processing'],
    });

    await page.route('**/api/mcp/servers', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: [testServer] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Click on server to view details
    await clickButton(page, '[data-testid="server-card"]');
    await expect(page.locator('[data-testid="server-details"]')).toBeVisible();

    // Verify tools are listed
    await expect(page.locator('[data-testid="server-tools"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="tool-name"]', 'read_file');
    await verifyElementText(page, '[data-testid="tool-name"]', 'write_file');

    // Verify capabilities
    await expect(page.locator('[data-testid="server-capabilities"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="capability-name"]', 'filesystem');
  });

  test('should handle connection errors', async ({ page }) => {
    const testServer = createTestMCPServer({ name: 'Failing Server' });

    await page.route('**/api/mcp/servers', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: [testServer] }),
      });
    });

    await page.route('**/api/mcp/servers/*/connect', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Connection failed' }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Try to connect
    await clickButton(page, '[data-testid="connect-server-button"]');
    await waitForApiCall(page, '/api/mcp/servers/*/connect');

    // Should show error
    await waitForToast(page, 'Failed to connect', 'error');
    await expect(page.locator('[data-testid="server-status-error"]')).toBeVisible();
  });

  test('should validate server configuration', async ({ page }) => {
    await page.reload();
    await waitForLoadingComplete(page);

    // Open add server dialog
    await clickButton(page, '[data-testid="add-server-button"]');

    // Try to save without required fields
    await clickButton(page, '[data-testid="save-server-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="url-error"]')).toContainText('URL is required');

    // Fill invalid URL
    await fillFormField(page, '[data-testid="server-name-field"]', 'Test Server');
    await fillFormField(page, '[data-testid="server-url-field"]', 'invalid-url');
    await clickButton(page, '[data-testid="save-server-button"]');

    // Should show URL validation error
    await expect(page.locator('[data-testid="url-error"]')).toContainText('Invalid URL format');
  });

  test('should search and filter servers', async ({ page }) => {
    const testServers = [
      createTestMCPServer({ name: 'Filesystem Server', type: 'filesystem' }),
      createTestMCPServer({ name: 'Web Server', type: 'web' }),
      createTestMCPServer({ name: 'Database Server', type: 'database' }),
    ];

    await page.route('**/api/mcp/servers', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: testServers }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // All servers should be visible
    await expect(page.locator('[data-testid="server-card"]')).toHaveCount(3);

    // Search for specific server
    await fillFormField(page, '[data-testid="server-search"]', 'Filesystem');

    // Should filter to matching server
    await expect(page.locator('[data-testid="server-card"]')).toHaveCount(1);
    await verifyElementText(page, '[data-testid="server-name"]', 'Filesystem Server');

    // Clear search
    await fillFormField(page, '[data-testid="server-search"]', '');

    // Should show all servers again
    await expect(page.locator('[data-testid="server-card"]')).toHaveCount(3);
  });

  test('should test server connection', async ({ page }) => {
    const testServer = createTestMCPServer({ name: 'Test Connection Server' });

    await page.route('**/api/mcp/servers', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ servers: [testServer] }),
      });
    });

    await page.route('**/api/mcp/servers/*/test', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          latency: 150,
          capabilities: ['filesystem', 'text'],
        }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Click test connection button
    await clickButton(page, '[data-testid="test-connection-button"]');
    await waitForApiCall(page, '/api/mcp/servers/*/test');

    // Should show test results
    await waitForToast(page, 'Connection test successful', 'success');
    await expect(page.locator('[data-testid="test-results"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="latency"]', '150ms');
  });
});
