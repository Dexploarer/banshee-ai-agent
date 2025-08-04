import { expect, test } from '@playwright/test';
import { waitForTauriWindow } from './utils/tauri-helpers';
import {
  clickButton,
  fillFormField,
  navigateToPortal,
  verifyElementText,
  waitForAppLoad,
  waitForLoadingComplete,
} from './utils/test-helpers';

test.describe('Keyboard Shortcuts E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await waitForTauriWindow(page);
    await navigateToPortal(page, '/');
    await waitForLoadingComplete(page);
  });

  test('should open command palette with Cmd+K', async ({ page }) => {
    // Press Cmd+K (or Ctrl+K on Windows/Linux)
    await page.keyboard.press('Meta+k');

    // Command palette should appear
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
    await expect(page.locator('[data-testid="command-search"]')).toBeFocused();
  });

  test('should close command palette with Escape', async ({ page }) => {
    // Open command palette
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('should search and execute commands in palette', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Search for dashboard command
    await fillFormField(page, '[data-testid="command-search"]', 'dashboard');

    // Should show dashboard command
    await expect(page.locator('[data-testid="command-item"]')).toBeVisible();
    await verifyElementText(page, '[data-testid="command-title"]', 'Go to Dashboard');

    // Execute command with Enter
    await page.keyboard.press('Enter');

    // Should navigate to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();
  });

  test('should navigate with arrow keys in command palette', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Search for commands that return multiple results
    await fillFormField(page, '[data-testid="command-search"]', 'go');

    // Should have multiple command options
    const commands = page.locator('[data-testid="command-item"]');
    await expect(commands).toHaveCount(4); // Dashboard, Workspace, Chat, Settings

    // First item should be selected by default
    await expect(commands.first()).toHaveClass(/selected/);

    // Navigate down with arrow key
    await page.keyboard.press('ArrowDown');
    await expect(commands.nth(1)).toHaveClass(/selected/);

    // Navigate up with arrow key
    await page.keyboard.press('ArrowUp');
    await expect(commands.first()).toHaveClass(/selected/);
  });

  test('should support navigation shortcuts', async ({ page }) => {
    // Test Cmd+1 for Dashboard
    await page.keyboard.press('Meta+1');
    await expect(page).toHaveURL('/dashboard');

    // Test Cmd+2 for Workspace
    await page.keyboard.press('Meta+2');
    await expect(page).toHaveURL('/workspace');

    // Test Cmd+3 for Chat
    await page.keyboard.press('Meta+3');
    await expect(page).toHaveURL('/chat');

    // Test Cmd+4 for Settings
    await page.keyboard.press('Meta+4');
    await expect(page).toHaveURL('/settings');
  });

  test('should support agent creation shortcut', async ({ page }) => {
    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);

    // Press Cmd+N to create new agent
    await page.keyboard.press('Meta+n');

    // Should open agent builder
    await expect(page.locator('[data-testid="build-tab"]')).toHaveAttribute('data-state', 'active');
    await expect(page.locator('[data-testid="agent-name-field"]')).toBeFocused();
  });

  test('should support save shortcut in forms', async ({ page }) => {
    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);

    // Fill agent form
    await fillFormField(page, '[data-testid="agent-name-field"]', 'Test Agent');
    await fillFormField(page, '[data-testid="system-prompt-field"]', 'Test prompt');

    // Press Cmd+S to save
    await page.keyboard.press('Meta+s');

    // Should trigger save (same as clicking save button)
    // Note: This would need proper API mocking to test fully
  });

  test('should support search shortcut', async ({ page }) => {
    await navigateToPortal(page, '/chat');
    await waitForLoadingComplete(page);

    // Press Cmd+F to focus search
    await page.keyboard.press('Meta+f');

    // Should focus conversation search field
    await expect(page.locator('[data-testid="conversation-search"]')).toBeFocused();
  });

  test('should support help shortcut', async ({ page }) => {
    // Press F1 or Cmd+? to open help
    await page.keyboard.press('F1');

    // Should open help dialog or navigate to help
    await expect(page.locator('[data-testid="help-dialog"]')).toBeVisible();
  });

  test('should display available shortcuts in command palette', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Should show keyboard shortcuts as hints
    const commands = page.locator('[data-testid="command-item"]');
    const firstCommand = commands.first();

    // Should display shortcut hint
    await expect(firstCommand.locator('[data-testid="shortcut-hint"]')).toBeVisible();
    await expect(firstCommand.locator('[data-testid="shortcut-hint"]')).toContainText('⌘1');
  });

  test('should support theme toggle shortcut', async ({ page }) => {
    // Press Cmd+Shift+T to toggle theme
    await page.keyboard.press('Meta+Shift+t');

    // Should toggle between light and dark themes
    const htmlElement = page.locator('html');
    const hadDarkClass = await htmlElement.getAttribute('class');

    await page.keyboard.press('Meta+Shift+t');

    const newClass = await htmlElement.getAttribute('class');
    expect(newClass).not.toBe(hadDarkClass);
  });

  test('should support text editing shortcuts in text areas', async ({ page }) => {
    await navigateToPortal(page, '/workspace');
    await waitForLoadingComplete(page);

    const promptField = page.locator('[data-testid="system-prompt-field"]');
    await promptField.click();

    // Type some text
    await promptField.fill('You are a helpful assistant. You should be polite and professional.');

    // Test Cmd+A (select all)
    await page.keyboard.press('Meta+a');

    // Test Cmd+C (copy) and Cmd+V (paste)
    await page.keyboard.press('Meta+c');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Meta+v');

    // Should have duplicated the text
    const value = await promptField.inputValue();
    expect(value.split('You are a helpful assistant').length).toBe(3); // Original + duplicate
  });

  test('should handle shortcut conflicts appropriately', async ({ page }) => {
    await navigateToPortal(page, '/chat');
    await waitForLoadingComplete(page);

    // Focus on message input
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.click();

    // Press Cmd+K while in text input
    await page.keyboard.press('Meta+k');

    // Command palette should NOT open when typing in input field
    await expect(page.locator('[data-testid="command-palette"]')).not.toBeVisible();

    // But should work when focus is elsewhere
    await page.locator('body').click();
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();
  });

  test('should support accessibility shortcuts', async ({ page }) => {
    // Tab navigation
    await page.keyboard.press('Tab');

    // Should focus first interactive element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Shift+Tab for reverse navigation
    await page.keyboard.press('Shift+Tab');

    // Should focus previous element
    const newFocusedElement = page.locator(':focus');
    expect(await newFocusedElement.getAttribute('data-testid')).not.toBe(
      await focusedElement.getAttribute('data-testid')
    );
  });

  test('should show shortcut tooltips on hover', async ({ page }) => {
    // Hover over navigation item
    await page.locator('[data-testid="nav-dashboard"]').hover();

    // Should show tooltip with shortcut
    await expect(page.locator('[data-testid="tooltip"]')).toBeVisible();
    await expect(page.locator('[data-testid="tooltip"]')).toContainText('⌘1');
  });

  test('should handle global shortcuts from any page', async ({ page }) => {
    // Navigate to settings
    await navigateToPortal(page, '/settings');
    await waitForLoadingComplete(page);

    // Global shortcut should still work
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-palette"]')).toBeVisible();

    // Navigation shortcuts should work
    await page.keyboard.press('Escape');
    await page.keyboard.press('Meta+2');
    await expect(page).toHaveURL('/workspace');
  });
});
