import {
  createMockContext,
  createStateManager,
  createState,
} from "@spoosh/test-utils";

import { transformPlugin } from "./plugin";

describe("transformPlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = transformPlugin();
      expect(plugin.name).toBe("spoosh:transform");
    });

    it("should operate on read, write, and queue operations", () => {
      const plugin = transformPlugin();
      expect(plugin.operations).toEqual(["read", "write", "queue"]);
    });
  });

  describe("response transformation (onResponse)", () => {
    it("should store transformedData in plugin result with sync function", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: (r: unknown) => {
            const response = r as { items: unknown[] };
            return {
              count: response.items.length,
              processed: true,
            };
          },
        },
      });
      const response = { data: { items: [{ id: 1 }, { id: 2 }] }, status: 200 };

      await plugin.afterResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({
        count: 2,
        processed: true,
      });
    });

    it("should store transformedData in plugin result with async function", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: async (r: unknown) => {
            const response = r as { value: number };
            const multiplier = await Promise.resolve(2);
            return { doubled: response.value * multiplier };
          },
        },
      });
      const response = { data: { value: 5 }, status: 200 };

      await plugin.afterResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({
        doubled: 10,
      });
    });

    it("should preserve original response data (not mutate it)", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: (r: unknown) => {
            const response = r as { items: unknown[] };
            return { count: response.items.length };
          },
        },
      });
      const originalData = { items: [{ id: 1 }, { id: 2 }] };
      const response = { data: originalData, status: 200 };

      await plugin.afterResponse!(context, response);

      expect(response.data).toEqual({ items: [{ id: 1 }, { id: 2 }] });
    });

    it("should not call transformer when data is undefined", async () => {
      const transformer = vi.fn();
      const plugin = transformPlugin();
      const context = createMockContext({
        pluginOptions: {
          transform: transformer,
        },
      });
      const response = { error: { message: "Not found" }, status: 404 };

      await plugin.afterResponse!(context, response);

      expect(transformer).not.toHaveBeenCalled();
    });

    it("should allow transformer to return completely different type", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: (r: unknown) => {
            const response = r as { items: { id: number }[] };
            return {
              ids: response.items.map((i) => i.id),
              total: response.items.length,
              hasMore: response.items.length >= 10,
            };
          },
        },
      });
      const response = {
        data: { items: [{ id: 1 }, { id: 2 }, { id: 3 }] },
        status: 200,
      };

      await plugin.afterResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({
        ids: [1, 2, 3],
        total: 3,
        hasMore: false,
      });
    });

    it("should not store transformedData when no response transformer provided", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({ stateManager, queryKey });
      const response = { data: { items: [{ id: 1 }] }, status: 200 };

      await plugin.afterResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toBeUndefined();
    });
  });

  describe("multiple transformations", () => {
    it("should store transformedData via response transformer in onResponse", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: (r: unknown) => ({
            ...(r as Record<string, unknown>),
            responseTransformed: true,
          }),
        },
      });
      const response = { data: { result: "success" }, status: 200 };

      await plugin.afterResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({
        result: "success",
        responseTransformed: true,
      });
    });
  });

  describe("edge cases", () => {
    it("should not store transformedData when no response transformer provided", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({ stateManager, queryKey });
      const response = { data: { items: [{ id: 1 }] }, status: 200 };

      await plugin.afterResponse!(context, response);

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toBeUndefined();
    });
  });

  describe("error handling", () => {
    it("should propagate response transformer errors", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: () => {
            throw new Error("Transform error");
          },
        },
      });
      const response = { data: { items: [] }, status: 200 };

      await expect(plugin.afterResponse!(context, response)).rejects.toThrow(
        "Transform error"
      );
    });

    it("should propagate async response transformer errors", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      stateManager.setCache(queryKey, { state: createState({ data: {} }) });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: async () => {
            await Promise.resolve();
            throw new Error("Async transform error");
          },
        },
      });
      const response = { data: { items: [] }, status: 200 };

      await expect(plugin.afterResponse!(context, response)).rejects.toThrow(
        "Async transform error"
      );
    });
  });

  describe("lifecycle hooks", () => {
    it("should have lifecycle hooks defined", () => {
      const plugin = transformPlugin();

      expect(plugin.lifecycle).toBeDefined();
      expect(plugin.lifecycle?.onMount).toBeDefined();
      expect(plugin.lifecycle?.onUpdate).toBeDefined();
      expect(plugin.lifecycle?.onUnmount).toBeDefined();
    });

    it("should register data change listener on mount when transform is provided", () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: (data: unknown) => ({ transformed: data }),
        },
      });

      const onDataChangeSpy = vi.spyOn(stateManager, "onDataChange");

      plugin.lifecycle?.onMount?.(context);

      expect(onDataChangeSpy).toHaveBeenCalledTimes(1);
    });

    it("should NOT register data change listener on mount when no transform is provided", () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';

      const context = createMockContext({
        stateManager,
        queryKey,
      });

      const onDataChangeSpy = vi.spyOn(stateManager, "onDataChange");

      plugin.lifecycle?.onMount?.(context);

      expect(onDataChangeSpy).not.toHaveBeenCalled();
    });

    it("should re-run transform when cache data changes", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';

      const transformer = vi.fn((data: unknown) => {
        const d = data as { value: number };
        return { doubled: d.value * 2 };
      });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: transformer,
        },
      });

      stateManager.setCache(queryKey, {
        state: createState({ data: { value: 5 } }),
      });
      plugin.lifecycle?.onMount?.(context);

      stateManager.setCache(queryKey, {
        state: createState({ data: { value: 10 } }),
      });

      await vi.waitFor(() => {
        expect(transformer).toHaveBeenCalledWith({ value: 10 });
      });

      const cached = stateManager.getCache(queryKey);
      expect(cached?.meta.get("transformedData")).toEqual({ doubled: 20 });
    });

    it("should NOT re-run transform when data changes for different queryKey", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';
      const otherKey = '{"method":"GET","path":["other"]}';

      const transformer = vi.fn((data: unknown) => ({ transformed: data }));

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: transformer,
        },
      });

      stateManager.setCache(queryKey, {
        state: createState({ data: { id: 1 } }),
      });
      plugin.lifecycle?.onMount?.(context);

      transformer.mockClear();

      stateManager.setCache(otherKey, {
        state: createState({ data: { id: 2 } }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(transformer).not.toHaveBeenCalled();
    });

    it("should unsubscribe from data change listener on unmount", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';

      const transformer = vi.fn((data: unknown) => ({ transformed: data }));

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: transformer,
        },
      });

      stateManager.setCache(queryKey, {
        state: createState({ data: { id: 1 } }),
      });
      plugin.lifecycle?.onMount?.(context);

      transformer.mockClear();

      plugin.lifecycle?.onUnmount?.(context);

      stateManager.setCache(queryKey, {
        state: createState({ data: { id: 2 } }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(transformer).not.toHaveBeenCalled();
    });

    it("should handle onUpdate when queryKey changes", () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const oldQueryKey = '{"method":"GET","path":["old"]}';
      const newQueryKey = '{"method":"GET","path":["new"]}';

      const transformer = vi.fn((data: unknown) => ({ transformed: data }));

      const oldContext = createMockContext({
        stateManager,
        queryKey: oldQueryKey,
        pluginOptions: {
          transform: transformer,
        },
      });

      const newContext = createMockContext({
        stateManager,
        queryKey: newQueryKey,
        pluginOptions: {
          transform: transformer,
        },
      });

      plugin.lifecycle?.onMount?.(oldContext);

      const onDataChangeSpy = vi.spyOn(stateManager, "onDataChange");

      plugin.lifecycle?.onUpdate?.(newContext, oldContext);

      expect(onDataChangeSpy).toHaveBeenCalledTimes(1);
    });

    it("should NOT re-run transform when newData is undefined", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';

      const transformer = vi.fn((data: unknown) => ({ transformed: data }));

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: transformer,
        },
      });

      stateManager.setCache(queryKey, {
        state: createState({ data: { id: 1 } }),
      });
      plugin.lifecycle?.onMount?.(context);

      transformer.mockClear();

      stateManager.setCache(queryKey, {
        state: createState({ data: undefined }),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(transformer).not.toHaveBeenCalled();
    });

    it("should silently handle transform errors in data change callback", async () => {
      const plugin = transformPlugin();
      const stateManager = createStateManager();
      const queryKey = '{"method":"GET","path":["test"]}';

      const transformer = vi.fn(() => {
        throw new Error("Transform error");
      });

      const context = createMockContext({
        stateManager,
        queryKey,
        pluginOptions: {
          transform: transformer,
        },
      });

      stateManager.setCache(queryKey, {
        state: createState({ data: { id: 1 } }),
      });
      plugin.lifecycle?.onMount?.(context);

      expect(() => {
        stateManager.setCache(queryKey, {
          state: createState({ data: { id: 2 } }),
        });
      }).not.toThrow();
    });
  });
});
