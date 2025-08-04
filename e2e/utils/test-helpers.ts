import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Common test helpers for E2E tests
 */

/**
 * Wait for the application to fully load
 */
export async function waitForAppLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle');

  // Wait for main app container to be visible
  await page.waitForSelector('#root, [data-testid="app"]', { timeout: 30000 });
}

/**
 * Navigate to a specific portal/route
 */
export async function navigateToPortal(page: Page, portal: string): Promise<void> {
  await page.goto(`/${portal}`);
  await waitForAppLoad(page);
}

/**
 * Wait for toast notification and verify its content
 */
export async function waitForToast(
  page: Page,
  expectedText?: string,
  type: 'success' | 'error' | 'info' = 'success'
): Promise<string> {
  const toastSelector = `[data-testid="${type}-toast"], [data-testid="toast"]`;
  await page.waitForSelector(toastSelector, { timeout: 10000 });

  const toast = page.locator(toastSelector).first();
  const toastText = (await toast.textContent()) ?? '';

  if (expectedText) {
    expect(toastText).toContain(expectedText);
  }

  return toastText;
}

/**
 * Fill form field with proper error handling
 */
export async function fillFormField(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector);
  await field.waitFor({ state: 'visible' });
  await field.clear();
  await field.fill(value);

  // Verify the value was set
  const actualValue = await field.inputValue();
  expect(actualValue).toBe(value);
}

/**
 * Click button with proper wait conditions
 */
export async function clickButton(page: Page, selector: string): Promise<void> {
  const button = page.locator(selector);
  await button.waitFor({ state: 'visible' });
  await button.waitFor({ state: 'attached' });
  await expect(button).toBeEnabled();
  await button.click();
}

/**
 * Select option from dropdown
 */
export async function selectOption(
  page: Page,
  triggerSelector: string,
  optionSelector: string
): Promise<void> {
  await clickButton(page, triggerSelector);
  await page.waitForSelector(optionSelector, { state: 'visible' });
  await clickButton(page, optionSelector);
}

/**
 * Wait for element to contain specific text
 */
export async function waitForText(
  page: Page,
  selector: string,
  text: string,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    ({ selector, text }) => {
      const element = document.querySelector(selector);
      return element?.textContent?.includes(text) ?? false;
    },
    { selector, text },
    { timeout }
  );
}

/**
 * Take screenshot with descriptive name
 */
export async function takeScreenshot(page: Page, name: string, fullPage = false): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage,
  });
}

/**
 * Wait for loading states to complete
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  // Wait for any loading spinners to disappear
  const loadingSelectors = [
    '[data-testid="loading"]',
    '[data-testid="spinner"]',
    '.loading',
    '.spinner',
    '[aria-label="Loading"]',
  ];

  for (const selector of loadingSelectors) {
    await page.waitForSelector(selector, { state: 'hidden', timeout: 5000 }).catch(() => {
      // Ignore if selector doesn't exist
    });
  }
}

/**
 * Verify element is visible and contains text
 */
export async function verifyElementText(
  page: Page,
  selector: string,
  expectedText: string
): Promise<void> {
  const element = page.locator(selector);
  await expect(element).toBeVisible();
  await expect(element).toContainText(expectedText);
}

/**
 * Check if element exists without throwing
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all form fields in a container
 */
export async function clearForm(page: Page, containerSelector: string): Promise<void> {
  const inputs = page.locator(`${containerSelector} input, ${containerSelector} textarea`);
  const count = await inputs.count();

  for (let i = 0; i < count; i++) {
    await inputs.nth(i).clear();
  }
}

/**
 * Wait for API call to complete
 */
export async function waitForApiCall(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}
