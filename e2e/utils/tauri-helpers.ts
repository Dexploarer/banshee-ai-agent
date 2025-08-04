import type { Page } from '@playwright/test';

/**
 * Tauri-specific test helpers
 */

/**
 * Check if we're running in Tauri environment
 */
export async function isTauriEnvironment(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return typeof window !== 'undefined' && '__TAURI__' in window;
  });
}

/**
 * Wait for Tauri API to be available
 */
export async function waitForTauriAPI(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      return typeof window !== 'undefined' && '__TAURI__' in window;
    },
    { timeout: 30000 }
  );
}

/**
 * Invoke Tauri command from test
 */
export async function invokeTauriCommand<T = unknown>(
  page: Page,
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  return await page.evaluate(
    async ({ command, args }) => {
      if (!('__TAURI__' in window)) {
        throw new Error('Tauri API not available');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tauri = (window as any).__TAURI__;
      return await tauri.invoke(command, args ?? {});
    },
    { command, args }
  );
}

/**
 * Listen for Tauri events during tests
 */
export async function listenToTauriEvent(
  page: Page,
  eventName: string,
  callback: (payload: unknown) => void
): Promise<() => Promise<void>> {
  return await page.evaluateHandle(
    async ({ eventName, callback }) => {
      if (!('__TAURI__' in window)) {
        throw new Error('Tauri API not available');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tauri = (window as any).__TAURI__;
      const unlisten = await tauri.event.listen(eventName, callback);

      return unlisten;
    },
    { eventName, callback }
  );
}

/**
 * Get Tauri app version
 */
export async function getTauriAppVersion(page: Page): Promise<string> {
  return await invokeTauriCommand<string>(page, 'get_version');
}

/**
 * Check Tauri app permissions
 */
export async function checkTauriPermissions(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    if (!('__TAURI__' in window)) {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tauri = (window as any).__TAURI__;
    return Object.keys(tauri);
  });
}

/**
 * Wait for Tauri window to be ready
 */
export async function waitForTauriWindow(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      return (
        document.readyState === 'complete' && typeof window !== 'undefined' && '__TAURI__' in window
      );
    },
    { timeout: 30000 }
  );
}

/**
 * Simulate Tauri menu action
 */
export async function triggerTauriMenuAction(page: Page, menuId: string): Promise<void> {
  await page.evaluate(async (menuId) => {
    if (!('__TAURI__' in window)) {
      throw new Error('Tauri API not available');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tauri = (window as any).__TAURI__;
    await tauri.event.emit('menu', { id: menuId });
  }, menuId);
}

/**
 * Get Tauri window properties
 */
export async function getTauriWindowProps(page: Page): Promise<{
  width: number;
  height: number;
  title: string;
  minimized: boolean;
  maximized: boolean;
  fullscreen: boolean;
}> {
  return await page.evaluate(async () => {
    if (!('__TAURI__' in window)) {
      throw new Error('Tauri API not available');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tauri = (window as any).__TAURI__;
    const appWindow = tauri.window.appWindow;

    const [size, title, minimized, maximized, fullscreen] = await Promise.all([
      appWindow.innerSize(),
      appWindow.title(),
      appWindow.isMinimized(),
      appWindow.isMaximized(),
      appWindow.isFullscreen(),
    ]);

    return {
      width: size.width,
      height: size.height,
      title,
      minimized,
      maximized,
      fullscreen,
    };
  });
}

/**
 * Resize Tauri window
 */
export async function resizeTauriWindow(page: Page, width: number, height: number): Promise<void> {
  await page.evaluate(
    async ({ width, height }) => {
      if (!('__TAURI__' in window)) {
        throw new Error('Tauri API not available');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tauri = (window as any).__TAURI__;
      const appWindow = tauri.window.appWindow;
      await appWindow.setSize({ width, height });
    },
    { width, height }
  );
}

/**
 * Take native screenshot using Tauri
 */
export async function takeTauriScreenshot(page: Page): Promise<Uint8Array> {
  return await invokeTauriCommand<Uint8Array>(page, 'take_screenshot');
}

/**
 * Get system info through Tauri
 */
export async function getTauriSystemInfo(page: Page): Promise<{
  os: string;
  version: string;
  arch: string;
}> {
  return await invokeTauriCommand(page, 'get_system_info');
}

/**
 * Handle Tauri file dialogs in tests
 */
export async function mockTauriFileDialog(page: Page, filePaths: string[]): Promise<void> {
  await page.evaluate((filePaths) => {
    if (!('__TAURI__' in window)) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tauri = (window as any).__TAURI__;

    // Mock file dialog responses
    tauri.dialog = tauri.dialog ?? {};
    tauri.dialog.open = async () => (filePaths.length === 1 ? filePaths[0] : filePaths);
    tauri.dialog.save = async () => filePaths[0];
  }, filePaths);
}
