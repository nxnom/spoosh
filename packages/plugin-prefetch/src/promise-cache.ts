import { StateManager } from "@spoosh/core";

const DEFAULT_PROMISE_TIMEOUT = 30000;

export type PromiseCacheOptions = {
  stateManager: StateManager;
  queryKey: string;
  timeout?: number;
};

export type PromiseCacheResult = {
  clearPromise: () => void;
};

/**
 * Stores a promise in the pending promises map with automatic cleanup and timeout safety.
 * Prevents memory leaks from promises that never settle.
 */
export function storePromiseInCache<T>(
  promise: Promise<T>,
  options: PromiseCacheOptions
): PromiseCacheResult {
  const { stateManager, queryKey, timeout = DEFAULT_PROMISE_TIMEOUT } = options;

  let promiseCleared = false;

  const clearPromise = () => {
    if (promiseCleared) return;

    promiseCleared = true;
    stateManager.setPendingPromise(queryKey, undefined);
  };

  stateManager.setPendingPromise(queryKey, promise);

  const timeoutId = setTimeout(() => {
    clearPromise();
  }, timeout);

  promise.finally(() => {
    clearTimeout(timeoutId);
    clearPromise();
  });

  return { clearPromise };
}
