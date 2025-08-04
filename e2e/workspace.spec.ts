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
import { createTestAgent } from './utils/test-data';

test.describe('Workspace Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);
  });

  test('should display workspace with sidebar and main content', async ({ page }) => {
    await expect(page.locator('[data-testid="workspace-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-main"]')).toBeVisible();
    await expect(page.locator('[data-testid="workspace-tabs"]')).toBeVisible();
  });

  test('should show empty state when no agents exist', async ({ page }) => {
    // Mock empty agents response
    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should show empty state in sidebar
    await verifyElementText(page, '[data-testid="empty-agents"]', 'No agents yet');
    await expect(page.locator('[data-testid="create-first-agent-button"]')).toBeVisible();
  });

  test('should display agent list in sidebar', async ({ page }) => {
    const testAgents = [
      createTestAgent({ name: 'Assistant Agent', character_role: 'Assistant' }),
      createTestAgent({ name: 'Expert Agent', character_role: 'Expert' }),
      createTestAgent({ name: 'Specialist Agent', character_role: 'Specialist' }),
    ];

    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: testAgents }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Verify all agents are displayed
    await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3);

    // Verify agent details
    await verifyElementText(page, '[data-testid="agent-name"]', 'Assistant Agent');
    await verifyElementText(page, '[data-testid="agent-role"]', 'Assistant');
  });

  test('should select agent from sidebar', async ({ page }) => {
    const testAgent = createTestAgent({
      name: 'Test Agent',
      character_role: 'Assistant',
      description: 'A test agent for E2E testing',
    });

    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [testAgent] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Select the agent
    await clickButton(page, '[data-testid="agent-card"]');

    // Verify agent is selected (highlighted)
    const agentCard = page.locator('[data-testid="agent-card"]').first();
    await expect(agentCard).toHaveClass(/ring-primary/);

    // Verify agent details are loaded in builder
    await expect(page.locator('[data-testid="agent-builder"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-name-field"]')).toHaveValue('Test Agent');
  });

  test('should create new agent', async ({ page }) => {
    await page.route('**/api/agents/**', (route) => {
      if (route.request().method() === 'POST') {
        const newAgent = createTestAgent({
          name: 'New Test Agent',
          character_role: 'Assistant',
        });
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newAgent),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: [] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Click create agent button
    await clickButton(page, '[data-testid="create-agent-button"]');

    // Should switch to build tab and clear form
    await expect(page.locator('[data-testid="build-tab"]')).toHaveAttribute('data-state', 'active');
    await expect(page.locator('[data-testid="agent-name-field"]')).toHaveValue('');

    // Fill agent form
    await fillFormField(page, '[data-testid="agent-name-field"]', 'New Test Agent');
    await fillFormField(
      page,
      '[data-testid="agent-description-field"]',
      'A new agent created via E2E test'
    );
    await selectOption(
      page,
      '[data-testid="character-role-select"]',
      '[data-testid="role-assistant"]'
    );
    await fillFormField(
      page,
      '[data-testid="system-prompt-field"]',
      'You are a helpful assistant.'
    );

    // Save agent
    await clickButton(page, '[data-testid="save-agent-button"]');
    await waitForApiCall(page, '/api/agents');

    // Verify success
    await waitForToast(page, 'Agent saved successfully', 'success');

    // Verify agent appears in sidebar
    await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(1);
    await verifyElementText(page, '[data-testid="agent-name"]', 'New Test Agent');
  });

  test('should edit existing agent', async ({ page }) => {
    const testAgent = createTestAgent({
      name: 'Original Agent',
      description: 'Original description',
    });

    await page.route('**/api/agents/**', (route) => {
      if (route.request().method() === 'PUT') {
        const updatedAgent = { ...testAgent, name: 'Updated Agent' };
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updatedAgent),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: [testAgent] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Select agent to edit
    await clickButton(page, '[data-testid="agent-card"]');

    // Click edit button
    await clickButton(page, '[data-testid="edit-agent-button"]');

    // Should be in build tab with agent data loaded
    await expect(page.locator('[data-testid="build-tab"]')).toHaveAttribute('data-state', 'active');
    await expect(page.locator('[data-testid="agent-name-field"]')).toHaveValue('Original Agent');

    // Update agent name
    await fillFormField(page, '[data-testid="agent-name-field"]', 'Updated Agent');

    // Save changes
    await clickButton(page, '[data-testid="save-agent-button"]');
    await waitForApiCall(page, '/api/agents');

    // Verify success
    await waitForToast(page, 'Agent saved successfully', 'success');
    await verifyElementText(page, '[data-testid="agent-name"]', 'Updated Agent');
  });

  test('should delete agent with confirmation', async ({ page }) => {
    const testAgent = createTestAgent({ name: 'Agent to Delete' });

    await page.route('**/api/agents/**', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204 });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: [testAgent] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Select agent
    await clickButton(page, '[data-testid="agent-card"]');

    // Click delete button
    await clickButton(page, '[data-testid="delete-agent-button"]');

    // Handle confirmation dialog
    page.on('dialog', (dialog) => dialog.accept());

    await waitForApiCall(page, '/api/agents');
    await waitForToast(page, 'Agent deleted successfully', 'success');

    // Verify agent is removed
    await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(0);
  });

  test('should validate agent form fields', async ({ page }) => {
    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Try to save empty form
    await clickButton(page, '[data-testid="save-agent-button"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="system-prompt-error"]')).toContainText(
      'System prompt is required'
    );

    // Fill required fields
    await fillFormField(page, '[data-testid="agent-name-field"]', 'Test Agent');
    await fillFormField(page, '[data-testid="system-prompt-field"]', 'You are helpful.');

    // Errors should disappear
    await expect(page.locator('[data-testid="name-error"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="system-prompt-error"]')).not.toBeVisible();
  });

  test('should switch between workspace tabs', async ({ page }) => {
    const testAgent = createTestAgent({ name: 'Test Agent' });

    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [testAgent] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Select an agent first
    await clickButton(page, '[data-testid="agent-card"]');

    // Test Build tab (should be active by default)
    await expect(page.locator('[data-testid="build-tab"]')).toHaveAttribute('data-state', 'active');
    await expect(page.locator('[data-testid="agent-builder"]')).toBeVisible();

    // Switch to Test tab
    await clickButton(page, '[data-testid="test-tab"]');
    await expect(page.locator('[data-testid="test-tab"]')).toHaveAttribute('data-state', 'active');
    await expect(page.locator('[data-testid="agent-tester"]')).toBeVisible();

    // Switch to Analytics tab
    await clickButton(page, '[data-testid="analytics-tab"]');
    await expect(page.locator('[data-testid="analytics-tab"]')).toHaveAttribute(
      'data-state',
      'active'
    );
    await verifyElementText(page, 'h3', 'Analytics Dashboard');
    await verifyElementText(page, 'p', 'Coming soon');
  });

  test('should show empty state in test tab when no agent selected', async ({ page }) => {
    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Switch to Test tab without selecting agent
    await clickButton(page, '[data-testid="test-tab"]');

    // Should show empty state
    await verifyElementText(page, 'h3', 'No Agent Selected');
    await verifyElementText(page, 'p', 'Select an agent from the sidebar to test its behavior');
  });

  test('should test agent in test lab', async ({ page }) => {
    const testAgent = createTestAgent({ name: 'Test Agent' });

    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [testAgent] }),
      });
    });

    // Mock agent testing endpoint
    await page.route('**/api/agents/*/test', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Hello! I am your test agent.',
          tokens: 24,
          latency: 1200,
        }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Select agent and go to test tab
    await clickButton(page, '[data-testid="agent-card"]');
    await clickButton(page, '[data-testid="test-tab"]');

    // Enter test prompt
    await fillFormField(page, '[data-testid="test-prompt-field"]', 'Hello, introduce yourself');

    // Run test
    await clickButton(page, '[data-testid="run-test-button"]');
    await waitForApiCall(page, '/api/agents/*/test');

    // Verify response
    await expect(page.locator('[data-testid="test-response"]')).toContainText(
      'Hello! I am your test agent.'
    );
    await expect(page.locator('[data-testid="token-count"]')).toContainText('24');
    await expect(page.locator('[data-testid="response-time"]')).toContainText('1200ms');
  });

  test('should handle agent save errors', async ({ page }) => {
    await page.route('**/api/agents/**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid agent configuration' }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: [] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Fill form and try to save
    await fillFormField(page, '[data-testid="agent-name-field"]', 'Invalid Agent');
    await fillFormField(page, '[data-testid="system-prompt-field"]', 'Invalid prompt');
    await clickButton(page, '[data-testid="save-agent-button"]');

    // Should show error toast
    await waitForToast(page, 'Failed to save agent', 'error');
  });

  test('should search and filter agents', async ({ page }) => {
    const testAgents = [
      createTestAgent({ name: 'Assistant Agent', character_role: 'Assistant' }),
      createTestAgent({ name: 'Expert Agent', character_role: 'Expert' }),
      createTestAgent({ name: 'Helper Agent', character_role: 'Assistant' }),
    ];

    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: testAgents }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // All agents should be visible initially
    await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3);

    // Search for specific agent
    await fillFormField(page, '[data-testid="agent-search-field"]', 'Assistant');

    // Should filter to matching agents
    await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(1);
    await verifyElementText(page, '[data-testid="agent-name"]', 'Assistant Agent');

    // Clear search
    await fillFormField(page, '[data-testid="agent-search-field"]', '');

    // Should show all agents again
    await expect(page.locator('[data-testid="agent-card"]')).toHaveCount(3);
  });

  test('should handle loading states properly', async ({ page }) => {
    // Mock slow response
    await page.route('**/api/agents/**', (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ agents: [] }),
        });
      }, 2000);
    });

    await page.reload();

    // Should show loading state
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await verifyElementText(page, 'p', 'Loading workspace...');

    // Wait for loading to complete
    await waitForLoadingComplete(page);

    // Loading should disappear
    await expect(page.locator('[data-testid="loading-spinner"]')).not.toBeVisible();
  });

  test('should handle agent configuration fields', async ({ page }) => {
    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Test all configuration fields
    await fillFormField(page, '[data-testid="agent-name-field"]', 'Config Test Agent');
    await fillFormField(page, '[data-testid="agent-description-field"]', 'Testing configuration');

    // Test model selection
    await selectOption(
      page,
      '[data-testid="model-select"]',
      '[data-testid="model-claude-3-sonnet"]'
    );

    // Test provider selection
    await selectOption(
      page,
      '[data-testid="provider-select"]',
      '[data-testid="provider-anthropic"]'
    );

    // Test temperature slider
    const temperatureSlider = page.locator('[data-testid="temperature-slider"]');
    await temperatureSlider.fill('0.8');
    await expect(temperatureSlider).toHaveValue('0.8');

    // Test max tokens field
    await fillFormField(page, '[data-testid="max-tokens-field"]', '2000');

    // Test tools selection
    await clickButton(page, '[data-testid="tools-checkbox-filesystem"]');
    await expect(page.locator('[data-testid="tools-checkbox-filesystem"]')).toBeChecked();

    // All fields should maintain their values
    await expect(page.locator('[data-testid="agent-name-field"]')).toHaveValue('Config Test Agent');
    await expect(page.locator('[data-testid="max-tokens-field"]')).toHaveValue('2000');
  });
});
