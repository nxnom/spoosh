import { createMockContext, createStateManager } from "@spoosh/test-utils";

import { throttlePlugin } from "./plugin";

describe("throttlePlugin", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = throttlePlugin();
      expect(plugin.name).toBe("spoosh:throttle");
    });

    it("should operate on read and infiniteRead operations", () => {
      const plugin = throttlePlugin();
      expect(plugin.operations).toEqual(["read", "infiniteRead"]);
    });
  });

  describe("allows first request immediately", () => {
    it("should allow first request without throttling", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: { throttle: 1000 },
      });
      const expectedResponse = { data: { id: 1 }, status: 200 };
      const next = vi.fn().mockResolvedValue(expectedResponse);

      const result = await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedResponse);
    });

    it("should allow first request with different query keys", async () => {
      const plugin = throttlePlugin();
      const context1 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
      });
      const context2 = createMockContext({
        queryKey: '{"method":"GET","path":["users","2"]}',
        pluginOptions: { throttle: 1000 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context1, next);
      await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe("throttles subsequent requests within interval", () => {
    it("should throttle second request within interval", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1, name: "cached" },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const context1 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });
      const context2 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { id: 1, name: "fresh" }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(500);
      const result = await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: { id: 1, name: "cached" }, status: 200 });
    });

    it("should throttle multiple requests within interval", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { cached: true },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const createCtx = () =>
        createMockContext({
          queryKey: '{"method":"GET","path":["users","1"]}',
          pluginOptions: { throttle: 2000 },
          stateManager,
        });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { fresh: true }, status: 200 });

      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("returns cached data when throttled", () => {
    it("should return cached data when throttled", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();
      const cachedData = { id: 1, name: "John", email: "john@example.com" };

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: cachedData,
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: Date.now(),
        },
      });

      const context1 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });
      const context2 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { id: 1, name: "Fresh" }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(100);
      const result = await plugin.middleware!(context2, next);

      expect(result).toEqual({ data: cachedData, status: 200 });
    });

    it("should return undefined data with status 0 when no cache exists", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      const context1 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });
      const context2 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(100);
      const result = await plugin.middleware!(context2, next);

      expect(result).toEqual({ data: undefined, status: 0 });
    });

    it("should return undefined when cache data is undefined", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: undefined,
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const context1 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });
      const context2 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(100);
      const result = await plugin.middleware!(context2, next);

      expect(result).toEqual({ data: undefined, status: 0 });
    });
  });

  describe("allows request after interval passes", () => {
    it("should allow request after throttle interval passes", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { cached: true },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const context1 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });
      const context2 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { fresh: true }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(1000);
      const result = await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ data: { fresh: true }, status: 200 });
    });

    it("should allow request after interval passes (exactly at boundary)", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      const createCtx = () =>
        createMockContext({
          queryKey: '{"method":"GET","path":["users","1"]}',
          pluginOptions: { throttle: 500 },
          stateManager,
        });

      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should reset throttle timer after each successful request", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { cached: true },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const createCtx = () =>
        createMockContext({
          queryKey: '{"method":"GET","path":["users","1"]}',
          pluginOptions: { throttle: 1000 },
          stateManager,
        });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { fresh: true }, status: 200 });

      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(1000);
      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(500);
      await plugin.middleware!(createCtx(), next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe("cleanup on unmount", () => {
    it("should cleanup throttle state on unmount", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { cached: true },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const context = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      vi.advanceTimersByTime(500);

      plugin.lifecycle!.onUnmount!(context);

      const contextAfterUnmount = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      await plugin.middleware!(contextAfterUnmount, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should have lifecycle.onUnmount defined", () => {
      const plugin = throttlePlugin();
      expect(plugin.lifecycle).toBeDefined();
      expect(plugin.lifecycle!.onUnmount).toBeDefined();
    });

    it("should not affect other query keys on unmount", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { id: 1 },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });
      stateManager.setCache('{"method":"GET","path":["users","2"]}', {
        state: {
          data: { id: 2 },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const context1 = createMockContext({
        queryKey: '{"method":"GET","path":["users","1"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });
      const context2 = createMockContext({
        queryKey: '{"method":"GET","path":["users","2"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      const next = vi.fn().mockResolvedValue({ data: {}, status: 200 });

      await plugin.middleware!(context1, next);
      await plugin.middleware!(context2, next);

      plugin.lifecycle!.onUnmount!(context1);

      vi.advanceTimersByTime(500);

      const context2AfterUnmount = createMockContext({
        queryKey: '{"method":"GET","path":["users","2"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      await plugin.middleware!(context2AfterUnmount, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });

  describe("edge cases", () => {
    it("should pass through when throttle is not set", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: {},
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should pass through when throttle is 0", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: { throttle: 0 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should pass through when throttle is negative", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: { throttle: -1000 },
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should pass through when pluginOptions is undefined", async () => {
      const plugin = throttlePlugin();
      const context = createMockContext({
        pluginOptions: undefined,
      });
      const next = vi.fn().mockResolvedValue({ data: { id: 1 }, status: 200 });

      await plugin.middleware!(context, next);
      await plugin.middleware!(context, next);

      expect(next).toHaveBeenCalledTimes(2);
    });

    it("should handle very large throttle values", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          data: { cached: true },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const createCtx = () =>
        createMockContext({
          queryKey: '{"method":"GET","path":["users","1"]}',
          pluginOptions: { throttle: 999999999 },
          stateManager,
        });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { fresh: true }, status: 200 });

      await plugin.middleware!(createCtx(), next);
      vi.advanceTimersByTime(1000000);
      await plugin.middleware!(createCtx(), next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("infiniteRead operations", () => {
    it("should throttle infiniteRead operations", async () => {
      const plugin = throttlePlugin();
      const stateManager = createStateManager();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          data: { items: [1, 2, 3] },
          loading: false,
          fetching: false,
          error: undefined,
          timestamp: 0,
        },
      });

      const context1 = createMockContext({
        operationType: "infiniteRead",
        queryKey: '{"method":"GET","path":["users"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });
      const context2 = createMockContext({
        operationType: "infiniteRead",
        queryKey: '{"method":"GET","path":["users"]}',
        pluginOptions: { throttle: 1000 },
        stateManager,
      });

      const next = vi
        .fn()
        .mockResolvedValue({ data: { items: [1, 2, 3, 4] }, status: 200 });

      await plugin.middleware!(context1, next);
      vi.advanceTimersByTime(500);
      const result = await plugin.middleware!(context2, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: { items: [1, 2, 3] }, status: 200 });
    });
  });
});
