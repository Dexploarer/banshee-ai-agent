import { expect, test } from '@playwright/test';
import { waitForTauriWindow } from './utils/tauri-helpers';
import { createTestAgent, createTestConversation } from './utils/test-data';
import {
  clickButton,
  fillFormField,
  navigateToPortal,
  selectOption,
  verifyElementText,
  waitForApiCall,
  waitForAppLoad,
  waitForLoadingComplete,
  waitForToast,
} from './utils/test-helpers';

test.describe('Chat Portal E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/chat');
    await waitForLoadingComplete(page);
  });

  test('should display chat portal with agent selection', async ({ page }) => {
    // Check for main chat structure
    await expect(page.locator('[data-testid="chat-sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-main"]')).toBeVisible();

    // Check agent selection section
    await verifyElementText(page, 'h2', 'Chat Agent');
    await expect(page.locator('[data-testid="agent-selector"]')).toBeVisible();
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

    // Should show no agents message
    await verifyElementText(page, 'h2', 'No Agents Available');
    await verifyElementText(
      page,
      'p',
      'You need to create an agent first before you can start chatting.'
    );
    await verifyElementText(page, 'p', 'Go to the Workspace to create your first agent.');
  });

  test('should allow agent selection', async ({ page }) => {
    // Mock agents data
    const testAgents = [
      createTestAgent({ name: 'Assistant Agent', character_role: 'Assistant' }),
      createTestAgent({ name: 'Expert Agent', character_role: 'Expert' }),
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

    // Select an agent
    await selectOption(
      page,
      '[data-testid="agent-selector"]',
      '[data-testid="agent-option-assistant-agent"]'
    );

    // Verify agent is selected
    const selectedAgent = page.locator('[data-testid="selected-agent"]');
    await expect(selectedAgent).toContainText('Assistant Agent');
    await expect(selectedAgent).toContainText('Assistant');
  });

  test('should create new conversation', async ({ page }) => {
    // Mock agents and conversations
    const testAgent = createTestAgent({ name: 'Test Agent' });

    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents: [testAgent] }),
      });
    });

    await page.route('**/api/conversations/**', (route) => {
      if (route.request().method() === 'POST') {
        const newConversation = createTestConversation({
          title: 'New Conversation',
          agent_id: testAgent.id ?? 'test-id',
        });
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newConversation),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ conversations: [] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Create new conversation
    await clickButton(page, '[data-testid="create-conversation-button"]');
    await waitForApiCall(page, '/api/conversations');

    // Verify conversation was created
    await waitForToast(page, 'Conversation created', 'success');
    await expect(page.locator('[data-testid="conversation-item"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="conversation-title"]', 'New Conversation');
  });

  test('should display conversation list with search', async ({ page }) => {
    // Mock conversations data
    const testConversations = [
      createTestConversation({ title: 'Important Discussion' }),
      createTestConversation({ title: 'Project Planning' }),
      createTestConversation({ title: 'Code Review' }),
    ];

    await page.route('**/api/conversations/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversations: testConversations }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Verify conversations are displayed
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(3);

    // Test search functionality
    await fillFormField(page, '[data-testid="conversation-search"]', 'Important');
    await page.keyboard.press('Enter');

    // Should filter to only matching conversation
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(1);
    await verifyElementText(page, '[data-testid="conversation-title"]', 'Important Discussion');

    // Clear search
    await fillFormField(page, '[data-testid="conversation-search"]', '');
    await page.keyboard.press('Enter');

    // Should show all conversations again
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(3);
  });

  test('should select and display conversation', async ({ page }) => {
    const testConversation = createTestConversation({
      title: 'Test Conversation',
      summary: 'A test conversation for E2E testing',
    });

    await page.route('**/api/conversations/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversations: [testConversation] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Select conversation
    await clickButton(page, '[data-testid="conversation-item"]');

    // Verify conversation is selected
    const conversationItem = page.locator('[data-testid="conversation-item"]').first();
    await expect(conversationItem).toHaveClass(/ring-primary/);

    // Verify conversation details
    await verifyElementText(page, '[data-testid="conversation-title"]', 'Test Conversation');
    await verifyElementText(
      page,
      '[data-testid="conversation-summary"]',
      'A test conversation for E2E testing'
    );
  });

  test('should delete conversation with confirmation', async ({ page }) => {
    const testConversation = createTestConversation({ title: 'Conversation to Delete' });

    await page.route('**/api/conversations/**', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204 });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ conversations: [testConversation] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Hover over conversation to show delete button
    await page.locator('[data-testid="conversation-item"]').hover();

    // Click delete button
    await clickButton(page, '[data-testid="delete-conversation-button"]');

    // Confirm deletion
    await page.on('dialog', (dialog) => dialog.accept());

    await waitForApiCall(page, '/api/conversations');
    await waitForToast(page, 'Conversation deleted', 'success');

    // Verify conversation is removed
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(0);
  });

  test('should send and receive messages', async ({ page }) => {
    // Mock chat interface
    await page.route('**/api/chat/**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Hello! How can I help you today?',
            tokens: 25,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: [] }),
        });
      }
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Verify chat interface is present
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();

    // Send a message
    await fillFormField(page, '[data-testid="message-input"]', 'Hello, how are you?');
    await clickButton(page, '[data-testid="send-button"]');

    // Verify message was sent
    await expect(page.locator('[data-testid="user-message"]')).toContainText('Hello, how are you?');

    // Wait for response
    await waitForApiCall(page, '/api/chat');

    // Verify AI response
    await expect(page.locator('[data-testid="ai-message"]')).toContainText(
      'Hello! How can I help you today?'
    );
  });

  test('should show typing indicator during response', async ({ page }) => {
    // Mock delayed response
    await page.route('**/api/chat/**', (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Delayed response',
            tokens: 15,
          }),
        });
      }, 2000);
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Send message
    await fillFormField(page, '[data-testid="message-input"]', 'Test message');
    await clickButton(page, '[data-testid="send-button"]');

    // Should show typing indicator
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();

    // Wait for response
    await waitForApiCall(page, '/api/chat');

    // Typing indicator should disappear
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible();
  });

  test('should display token count', async ({ page }) => {
    await page.route('**/api/chat/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Response with token count',
          tokens: 42,
        }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Send message and get response
    await fillFormField(page, '[data-testid="message-input"]', 'Count my tokens');
    await clickButton(page, '[data-testid="send-button"]');

    await waitForApiCall(page, '/api/chat');

    // Verify token count is displayed
    await expect(page.locator('[data-testid="token-count"]')).toContainText('42');
  });

  test('should handle conversation pagination', async ({ page }) => {
    // Mock large conversation list
    const conversations = Array.from({ length: 25 }, (_, i) =>
      createTestConversation({ title: `Conversation ${i + 1}` })
    );

    await page.route('**/api/conversations/**', (route) => {
      const url = new URL(route.request().url());
      const page_num = Number.parseInt(url.searchParams.get('page') ?? '1');
      const pageSize = 10;
      const start = (page_num - 1) * pageSize;
      const end = start + pageSize;

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          conversations: conversations.slice(start, end),
          total: conversations.length,
          page: page_num,
          pages: Math.ceil(conversations.length / pageSize),
        }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should show first 10 conversations
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(10);

    // Should show pagination controls
    await expect(page.locator('[data-testid="pagination-controls"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-page-button"]')).toBeVisible();

    // Go to next page
    await clickButton(page, '[data-testid="next-page-button"]');
    await waitForApiCall(page, '/api/conversations');

    // Should show next 10 conversations
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(10);
    await verifyElementText(page, '[data-testid="conversation-title"]', 'Conversation 11');
  });

  test('should handle empty conversation state', async ({ page }) => {
    await page.route('**/api/conversations/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ conversations: [] }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Should show empty state
    await verifyElementText(page, 'p', 'No conversations yet');
    await expect(page.locator('[data-testid="start-first-chat-button"]')).toBeVisible();

    // Clicking should create new conversation
    await clickButton(page, '[data-testid="start-first-chat-button"]');
    // Would trigger conversation creation
  });

  test('should handle chat errors gracefully', async ({ page }) => {
    // Mock chat error
    await page.route('**/api/chat/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Chat service unavailable' }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Send message that will fail
    await fillFormField(page, '[data-testid="message-input"]', 'This will fail');
    await clickButton(page, '[data-testid="send-button"]');

    // Should show error message
    await waitForToast(page, 'Failed to send message', 'error');

    // Should show retry option
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should maintain conversation state when switching agents', async ({ page }) => {
    const agents = [createTestAgent({ name: 'Agent 1' }), createTestAgent({ name: 'Agent 2' })];

    await page.route('**/api/agents/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agents }),
      });
    });

    await page.reload();
    await waitForLoadingComplete(page);

    // Select first agent
    await selectOption(page, '[data-testid="agent-selector"]', '[data-testid="agent-option-0"]');

    // Create conversation
    await clickButton(page, '[data-testid="create-conversation-button"]');

    // Switch to second agent
    await selectOption(page, '[data-testid="agent-selector"]', '[data-testid="agent-option-1"]');

    // Should clear current conversation when switching agents
    await expect(page.locator('[data-testid="selected-conversation"]')).not.toBeVisible();
  });
});
