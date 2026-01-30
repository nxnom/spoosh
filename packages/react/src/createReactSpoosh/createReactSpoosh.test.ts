/**
 * @vitest-environment jsdom
 */
import { vi, describe, it, expect } from "vitest";
import { createStateManager, createEventEmitter } from "@spoosh/test-utils";
import { createPluginExecutor, type SpooshPlugin } from "@spoosh/core";
import { createReactSpoosh } from "./index";

function createMockApi() {
  return (path: string) => ({
    GET: () => Promise.resolve({ data: { path }, status: 200 }),
    POST: () => Promise.resolve({ data: { path }, status: 201 }),
  });
}

function createTestInstance(plugins: SpooshPlugin[] = []) {
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor(plugins);
  const api = createMockApi();

  return {
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
    _types: {
      schema: {} as unknown,
      defaultError: {} as unknown,
      plugins: [] as const,
    },
  };
}

describe("createReactSpoosh", () => {
  describe("Hook Creation", () => {
    it("returns useRead hook", () => {
      const instance = createTestInstance();
      const result = createReactSpoosh(instance);

      expect(result.useRead).toBeDefined();
      expect(typeof result.useRead).toBe("function");
    });

    it("returns useWrite hook", () => {
      const instance = createTestInstance();
      const result = createReactSpoosh(instance);

      expect(result.useWrite).toBeDefined();
      expect(typeof result.useWrite).toBe("function");
    });

    it("returns useInfiniteRead hook", () => {
      const instance = createTestInstance();
      const result = createReactSpoosh(instance);

      expect(result.useInfiniteRead).toBeDefined();
      expect(typeof result.useInfiniteRead).toBe("function");
    });
  });

  describe("Instance APIs", () => {
    it("includes plugin instance APIs", () => {
      const mockInstanceApi = vi.fn().mockReturnValue({
        customMethod: vi.fn(),
        anotherMethod: vi.fn(),
      });

      const plugin: SpooshPlugin = {
        name: "test-plugin",
        operations: ["read"],
        instanceApi: mockInstanceApi,
      };

      const instance = createTestInstance([plugin]);
      const result = createReactSpoosh(instance);

      expect(mockInstanceApi).toHaveBeenCalled();
      expect(result).toHaveProperty("customMethod");
      expect(result).toHaveProperty("anotherMethod");
    });

    it("instance APIs work correctly", () => {
      const customMethodImpl = vi.fn().mockReturnValue("custom-result");

      const plugin: SpooshPlugin = {
        name: "test-plugin",
        operations: ["read"],
        instanceApi: () => ({
          customMethod: customMethodImpl,
        }),
      };

      const instance = createTestInstance([plugin]);
      const result = createReactSpoosh(instance) as ReturnType<
        typeof createReactSpoosh
      > & {
        customMethod: typeof customMethodImpl;
      };

      const methodResult = result.customMethod();

      expect(customMethodImpl).toHaveBeenCalled();
      expect(methodResult).toBe("custom-result");
    });
  });
});
