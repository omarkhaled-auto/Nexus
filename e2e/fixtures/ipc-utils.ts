import type { Page } from '@playwright/test';

/**
 * IPC Testing Utilities
 *
 * Utilities for testing Electron IPC communication in E2E tests.
 * These functions help with waiting for IPC responses and injecting
 * test data through the main process.
 */

/**
 * Wait for an IPC event to be emitted from the renderer.
 *
 * @param page - Playwright Page instance
 * @param eventName - Name of the IPC event to wait for
 * @param timeout - Maximum wait time in ms (default: 5000)
 * @returns Promise that resolves when the event is received
 */
export async function waitForIPCEvent(
  page: Page,
  eventName: string,
  timeout = 5000
): Promise<void> {
  await page.evaluate(
    ({ event, ms }) => {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for IPC event: ${event}`));
        }, ms);

        // Listen for the event via window.electron.ipcRenderer
        const domWindow = window as unknown as {
          electron?: { ipcRenderer: { on: (event: string, callback: () => void) => void } };
        };

        if (domWindow.electron?.ipcRenderer) {
          domWindow.electron.ipcRenderer.on(event, () => {
            clearTimeout(timer);
            resolve();
          });
        } else {
          clearTimeout(timer);
          reject(new Error('electron.ipcRenderer not available'));
        }
      });
    },
    { event: eventName, ms: timeout }
  );
}

/**
 * Wait for an IPC response with a specific result.
 *
 * @param page - Playwright Page instance
 * @param channel - IPC channel name
 * @param expectedResult - Expected result value or predicate function
 * @param timeout - Maximum wait time in ms (default: 5000)
 * @returns Promise that resolves with the result
 */
export async function waitForIPCResponse<T = unknown>(
  page: Page,
  channel: string,
  expectedResult?: T | ((result: T) => boolean),
  timeout = 5000
): Promise<T> {
  return page.evaluate(
    ({ ch, expected, ms }) => {
      return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for IPC response on channel: ${ch}`));
        }, ms);

        // Mock IPC response listener
        const domWindow = window as unknown as {
          electron?: { ipcRenderer: { once: (event: string, callback: (_: unknown, result: T) => void) => void } };
        };

        if (domWindow.electron?.ipcRenderer) {
          domWindow.electron.ipcRenderer.once(ch, (_, result: T) => {
            clearTimeout(timer);

            // Check if result matches expected
            if (expected !== undefined) {
              if (typeof expected === 'function') {
                if ((expected as (result: T) => boolean)(result)) {
                  resolve(result);
                } else {
                  reject(new Error(`IPC response did not match predicate on channel: ${ch}`));
                }
              } else if (result === expected) {
                resolve(result);
              } else {
                reject(new Error(`IPC response mismatch on channel: ${ch}`));
              }
            } else {
              resolve(result);
            }
          });
        } else {
          clearTimeout(timer);
          reject(new Error('electron.ipcRenderer not available'));
        }
      });
    },
    { ch: channel, expected: expectedResult, ms: timeout }
  );
}

/**
 * Inject test data via the test bridge.
 *
 * @param page - Playwright Page instance
 * @param dataType - Type of data to inject ('features', 'requirements', 'checkpoints')
 * @param data - Data to inject
 */
export async function injectTestData<T>(
  page: Page,
  dataType: 'features' | 'requirements' | 'checkpoints' | 'agents',
  data: T[]
): Promise<void> {
  await page.evaluate(
    ({ type, items }) => {
      const domWindow = window as unknown as {
        testBridge?: {
          seedFeatures?: (data: unknown[]) => void;
          seedRequirements?: (data: unknown[]) => void;
          seedCheckpoints?: (data: unknown[]) => void;
          seedAgents?: (data: unknown[]) => void;
        };
      };

      const testBridge = domWindow.testBridge;
      if (!testBridge) {
        console.warn('[Test] testBridge not available');
        return;
      }

      switch (type) {
        case 'features':
          if (testBridge.seedFeatures) {
            testBridge.seedFeatures(items);
          }
          break;
        case 'requirements':
          if (testBridge.seedRequirements) {
            testBridge.seedRequirements(items);
          }
          break;
        case 'checkpoints':
          if (testBridge.seedCheckpoints) {
            testBridge.seedCheckpoints(items);
          }
          break;
        case 'agents':
          if (testBridge.seedAgents) {
            testBridge.seedAgents(items);
          }
          break;
        default:
          console.warn(`[Test] Unknown data type: ${type}`);
      }
    },
    { type: dataType, items: data }
  );
}

/**
 * Wait for the store to be updated with new data.
 *
 * @param page - Playwright Page instance
 * @param storeName - Name of the Zustand store
 * @param predicate - Function to check if store state is as expected
 * @param timeout - Maximum wait time in ms (default: 5000)
 */
export async function waitForStoreUpdate<T>(
  page: Page,
  storeName: string,
  predicate: (state: T) => boolean,
  timeout = 5000
): Promise<void> {
  await page.evaluate(
    ({ store, check, ms }) => {
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for store update: ${store}`));
        }, ms);

        // Access the Zustand store
        const domWindow = window as unknown as {
          [key: string]: {
            getState: () => T;
            subscribe: (callback: (state: T) => void) => () => void;
          };
        };

        const storeInstance = domWindow[store];
        if (!storeInstance) {
          clearTimeout(timer);
          reject(new Error(`Store not found: ${store}`));
          return;
        }

        // Check current state first
        const currentState = storeInstance.getState();
        // eslint-disable-next-line no-eval
        if (eval(`(${check})`)(currentState)) {
          clearTimeout(timer);
          resolve();
          return;
        }

        // Subscribe to changes
        const unsubscribe = storeInstance.subscribe((state: T) => {
          // eslint-disable-next-line no-eval
          if (eval(`(${check})`)(state)) {
            clearTimeout(timer);
            unsubscribe();
            resolve();
          }
        });
      });
    },
    { store: storeName, check: predicate.toString(), ms: timeout }
  );
}

/**
 * Mock an IPC handler for testing.
 *
 * @param page - Playwright Page instance
 * @param channel - IPC channel to mock
 * @param handler - Mock handler function
 */
export async function mockIPCHandler<T, R>(
  page: Page,
  channel: string,
  handler: (args: T) => R | Promise<R>
): Promise<void> {
  await page.evaluate(
    ({ ch, fn }) => {
      const domWindow = window as unknown as {
        electron?: {
          ipcRenderer: {
            invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
          };
        };
        __mockIPC?: Map<string, (args: unknown) => unknown>;
      };

      if (!domWindow.__mockIPC) {
        domWindow.__mockIPC = new Map();
      }

      // eslint-disable-next-line no-eval
      domWindow.__mockIPC.set(ch, eval(`(${fn})`));

      // Override ipcRenderer.invoke for this channel
      if (domWindow.electron?.ipcRenderer) {
        const originalInvoke = domWindow.electron.ipcRenderer.invoke;
        domWindow.electron.ipcRenderer.invoke = async (channel: string, ...args: unknown[]) => {
          const mockHandler = domWindow.__mockIPC?.get(channel);
          if (mockHandler) {
            return mockHandler(args);
          }
          return originalInvoke.call(domWindow.electron.ipcRenderer, channel, ...args);
        };
      }
    },
    { ch: channel, fn: handler.toString() }
  );
}

/**
 * Clear all mocked IPC handlers.
 *
 * @param page - Playwright Page instance
 */
export async function clearIPCMocks(page: Page): Promise<void> {
  await page.evaluate(() => {
    const domWindow = window as unknown as { __mockIPC?: Map<string, unknown> };
    if (domWindow.__mockIPC) {
      domWindow.__mockIPC.clear();
    }
  });
}

/**
 * Trigger an IPC event from the main process (simulated).
 *
 * @param page - Playwright Page instance
 * @param eventName - Name of the event to trigger
 * @param data - Event data
 */
export async function triggerIPCEvent<T>(page: Page, eventName: string, data?: T): Promise<void> {
  await page.evaluate(
    ({ event, eventData }) => {
      const domWindow = window as unknown as {
        electron?: {
          ipcRenderer: {
            send: (channel: string, ...args: unknown[]) => void;
          };
        };
      };

      if (domWindow.electron?.ipcRenderer) {
        domWindow.electron.ipcRenderer.send(event, eventData);
      }
    },
    { event: eventName, eventData: data }
  );
}
