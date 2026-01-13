import { StateManager } from "@spoosh/core";
import { storePromiseInCache } from "./promise-cache";

declare const process: {
  listeners: (event: string) => Array<(...args: unknown[]) => void>;
  removeAllListeners: (event: string) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

function createMockStateManager(): StateManager & {
  getStoredPromise: (key: string) => unknown;
} {
  const promises = new Map<string, unknown>();

  return {
    setPendingPromise: vi.fn((key: string, promise: unknown) => {
      if (promise === undefined) {
        promises.delete(key);
      } else {
        promises.set(key, promise);
      }
    }),
    getPendingPromise: vi.fn((key: string) => promises.get(key)),
    getStoredPromise: (key: string) => promises.get(key),
  } as unknown as StateManager & { getStoredPromise: (key: string) => unknown };
}

function createRejectablePromise<T>(): {
  promise: Promise<T>;
  reject: (error: Error) => void;
} {
  let rejectFn: (error: Error) => void;

  const promise = new Promise<T>((_, reject) => {
    rejectFn = reject;
  });

  promise.catch(() => {});

  return {
    promise,
    reject: rejectFn!,
  };
}

describe("storePromiseInCache", () => {
  let originalListeners: Array<(...args: unknown[]) => void>;

  beforeEach(() => {
    vi.useFakeTimers();
    originalListeners = process.listeners("unhandledRejection");
    process.removeAllListeners("unhandledRejection");
    process.on("unhandledRejection", () => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    process.removeAllListeners("unhandledRejection");
    originalListeners.forEach((listener) => {
      process.on("unhandledRejection", listener);
    });
  });

  describe("basic promise storage and retrieval", () => {
    it("stores the promise with the provided key", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});
      const queryKey = "test-key";

      storePromiseInCache(promise, { stateManager, queryKey });

      expect(stateManager.setPendingPromise).toHaveBeenCalledWith(
        queryKey,
        promise
      );
    });

    it("returns an object with clearPromise function", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});

      const result = storePromiseInCache(promise, {
        stateManager,
        queryKey: "test-key",
      });

      expect(result).toHaveProperty("clearPromise");
      expect(typeof result.clearPromise).toBe("function");
    });
  });

  describe("clearPromise removes from pending promises", () => {
    it("clears the promise when called", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});
      const queryKey = "test-key";

      const { clearPromise } = storePromiseInCache(promise, {
        stateManager,
        queryKey,
      });

      clearPromise();

      expect(stateManager.setPendingPromise).toHaveBeenLastCalledWith(
        queryKey,
        undefined
      );
    });
  });

  describe("automatic cleanup after timeout", () => {
    it("clears the promise after default timeout (30000ms)", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});
      const queryKey = "test-key";

      storePromiseInCache(promise, { stateManager, queryKey });

      vi.advanceTimersByTime(29999);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
      expect(stateManager.setPendingPromise).toHaveBeenLastCalledWith(
        queryKey,
        undefined
      );
    });

    it("clears the promise after custom timeout", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});
      const queryKey = "test-key";
      const customTimeout = 5000;

      storePromiseInCache(promise, {
        stateManager,
        queryKey,
        timeout: customTimeout,
      });

      vi.advanceTimersByTime(4999);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
      expect(stateManager.setPendingPromise).toHaveBeenLastCalledWith(
        queryKey,
        undefined
      );
    });
  });

  describe("promise settlement clears before timeout", () => {
    it("clears the promise when it resolves before timeout", async () => {
      const stateManager = createMockStateManager();
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      const queryKey = "test-key";

      storePromiseInCache(promise, {
        stateManager,
        queryKey,
        timeout: 30000,
      });

      resolvePromise!("resolved value");
      await vi.runAllTimersAsync();

      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
      expect(stateManager.setPendingPromise).toHaveBeenLastCalledWith(
        queryKey,
        undefined
      );
    });

    it("clears the promise when it rejects before timeout", async () => {
      const stateManager = createMockStateManager();
      const { promise, reject } = createRejectablePromise<string>();
      const queryKey = "test-key";

      storePromiseInCache(promise, {
        stateManager,
        queryKey,
        timeout: 30000,
      });

      reject(new Error("test error"));
      await vi.runAllTimersAsync();

      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
      expect(stateManager.setPendingPromise).toHaveBeenLastCalledWith(
        queryKey,
        undefined
      );
    });

    it("cancels the timeout when promise settles", async () => {
      const stateManager = createMockStateManager();
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      const queryKey = "test-key";

      storePromiseInCache(promise, {
        stateManager,
        queryKey,
        timeout: 30000,
      });

      resolvePromise!("resolved value");
      await vi.runAllTimersAsync();

      const callCountAfterResolve = (
        stateManager.setPendingPromise as ReturnType<typeof vi.fn>
      ).mock.calls.length;

      vi.advanceTimersByTime(30000);

      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(
        callCountAfterResolve
      );
    });
  });

  describe("custom timeout values", () => {
    it("uses custom timeout of 1000ms", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});
      const queryKey = "test-key";

      storePromiseInCache(promise, {
        stateManager,
        queryKey,
        timeout: 1000,
      });

      vi.advanceTimersByTime(999);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
    });

    it("uses custom timeout of 60000ms", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});
      const queryKey = "test-key";

      storePromiseInCache(promise, {
        stateManager,
        queryKey,
        timeout: 60000,
      });

      vi.advanceTimersByTime(59999);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
    });
  });

  describe("multiple clearPromise calls (idempotent)", () => {
    it("only clears once when clearPromise is called multiple times", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});
      const queryKey = "test-key";

      const { clearPromise } = storePromiseInCache(promise, {
        stateManager,
        queryKey,
      });

      clearPromise();
      clearPromise();
      clearPromise();

      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
    });

    it("does not clear again if already cleared by timeout", () => {
      const stateManager = createMockStateManager();
      const promise = new Promise<string>(() => {});
      const queryKey = "test-key";

      const { clearPromise } = storePromiseInCache(promise, {
        stateManager,
        queryKey,
        timeout: 1000,
      });

      vi.advanceTimersByTime(1000);
      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);

      clearPromise();

      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
    });

    it("does not clear again if already cleared by promise settlement", async () => {
      const stateManager = createMockStateManager();
      let resolvePromise: (value: string) => void;
      const promise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });
      const queryKey = "test-key";

      const { clearPromise } = storePromiseInCache(promise, {
        stateManager,
        queryKey,
      });

      resolvePromise!("resolved");
      await vi.runAllTimersAsync();

      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);

      clearPromise();

      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(2);
    });
  });

  describe("promise rejection handling", () => {
    it("handles promise rejection without throwing", async () => {
      const stateManager = createMockStateManager();
      const { promise, reject } = createRejectablePromise<string>();
      const queryKey = "test-key";

      storePromiseInCache(promise, { stateManager, queryKey });

      expect(() => {
        reject(new Error("test error"));
      }).not.toThrow();

      await vi.runAllTimersAsync();
    });

    it("clears the pending promise even when promise rejects", async () => {
      const stateManager = createMockStateManager();
      const { promise, reject } = createRejectablePromise<string>();
      const queryKey = "test-key";

      storePromiseInCache(promise, { stateManager, queryKey });

      reject(new Error("test error"));
      await vi.runAllTimersAsync();

      expect(stateManager.setPendingPromise).toHaveBeenLastCalledWith(
        queryKey,
        undefined
      );
    });

    it("cancels timeout when promise rejects", async () => {
      const stateManager = createMockStateManager();
      const { promise, reject } = createRejectablePromise<string>();
      const queryKey = "test-key";

      storePromiseInCache(promise, {
        stateManager,
        queryKey,
        timeout: 30000,
      });

      reject(new Error("test error"));
      await vi.runAllTimersAsync();

      const callCountAfterReject = (
        stateManager.setPendingPromise as ReturnType<typeof vi.fn>
      ).mock.calls.length;

      vi.advanceTimersByTime(30000);

      expect(stateManager.setPendingPromise).toHaveBeenCalledTimes(
        callCountAfterReject
      );
    });
  });
});
