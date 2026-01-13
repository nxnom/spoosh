import type { SpooshResponse } from "@spoosh/core";
import {
  createMockContext,
  createStateManager,
  createEventEmitter,
} from "@spoosh/test-utils";

import { invalidationPlugin } from "./plugin";
import type { InvalidationPluginExports } from "./types";

describe("invalidationPlugin", () => {
  describe("plugin configuration", () => {
    it("should have correct name", () => {
      const plugin = invalidationPlugin();
      expect(plugin.name).toBe("spoosh:invalidation");
    });

    it("should operate on write operations only", () => {
      const plugin = invalidationPlugin();
      expect(plugin.operations).toEqual(["write"]);
    });
  });

  describe("exports", () => {
    it("should export setAutoInvalidateDefault function", () => {
      const plugin = invalidationPlugin();
      const context = createMockContext();
      const pluginExports = plugin.exports!(
        context
      ) as InvalidationPluginExports;

      expect(pluginExports.setAutoInvalidateDefault).toBeDefined();
      expect(typeof pluginExports.setAutoInvalidateDefault).toBe("function");
    });

    it("should store autoInvalidate default in metadata", () => {
      const plugin = invalidationPlugin();
      const metadata = new Map();
      const context = createMockContext({ metadata });
      const pluginExports = plugin.exports!(
        context
      ) as InvalidationPluginExports;

      pluginExports.setAutoInvalidateDefault("none");

      expect(metadata.get("invalidation:autoInvalidateDefault")).toBe("none");
    });
  });

  describe("autoInvalidate: all (default)", () => {
    it("should invalidate all context tags on successful mutation", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          loading: false,
          fetching: false,
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          loading: false,
          fetching: false,
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      const entry1 = stateManager.getCache('{"method":"GET","path":["users"]}');
      const entry2 = stateManager.getCache(
        '{"method":"GET","path":["users","1"]}'
      );
      expect(entry1?.stale).toBe(true);
      expect(entry2?.stale).toBe(true);
    });

    it("should emit invalidate event with tags", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      expect(invalidateHandler).toHaveBeenCalledWith(["users", "users/1"]);
    });
  });

  describe("autoInvalidate: self", () => {
    it("should only invalidate self tag", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "self" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          loading: false,
          fetching: false,
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      stateManager.setCache('{"method":"GET","path":["users","1"]}', {
        state: {
          loading: false,
          fetching: false,
          data: { id: 1 },
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users", "users/1"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        eventEmitter,
        path: ["users", "1"],
        tags: ["users", "users/1"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      const entry1 = stateManager.getCache('{"method":"GET","path":["users"]}');
      const entry2 = stateManager.getCache(
        '{"method":"GET","path":["users","1"]}'
      );
      expect(entry1?.stale).toBe(false);
      expect(entry2?.stale).toBe(true);
    });
  });

  describe("autoInvalidate: none", () => {
    it("should not invalidate any tags automatically", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          loading: false,
          fetching: false,
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      const entry = stateManager.getCache('{"method":"GET","path":["users"]}');
      expect(entry?.stale).toBe(false);
      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });

  describe("invalidate option with string array", () => {
    it("should invalidate specific tags from array", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["posts"]}', {
        state: {
          loading: false,
          fetching: false,
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["posts"],
        stale: false,
      });

      stateManager.setCache('{"method":"GET","path":["comments"]}', {
        state: {
          loading: false,
          fetching: false,
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["comments"],
        stale: false,
      });

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users"],
        pluginOptions: {
          invalidate: ["posts", "comments"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      const postsEntry = stateManager.getCache(
        '{"method":"GET","path":["posts"]}'
      );
      const commentsEntry = stateManager.getCache(
        '{"method":"GET","path":["comments"]}'
      );
      expect(postsEntry?.stale).toBe(true);
      expect(commentsEntry?.stale).toBe(true);
    });

    it("should combine invalidate array with autoInvalidate: all", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "all" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users"],
        pluginOptions: {
          invalidate: ["posts"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      expect(invalidateHandler).toHaveBeenCalledWith(["posts", "users"]);
    });
  });

  describe("per-request autoInvalidate override", () => {
    it("should override plugin default with request option", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "all" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
        pluginOptions: {
          autoInvalidate: "none",
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });

    it("should use metadata override when set via exports", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "all" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();
      const metadata = new Map();

      metadata.set("invalidation:autoInvalidateDefault", "none");

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        metadata,
        tags: ["users"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should not invalidate on error response", () => {
      const plugin = invalidationPlugin();
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      stateManager.setCache('{"method":"GET","path":["users"]}', {
        state: {
          loading: false,
          fetching: false,
          data: [{ id: 1 }],
          error: undefined,
          timestamp: Date.now(),
        },
        tags: ["users"],
        stale: false,
      });

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users"],
      });

      const response: SpooshResponse<unknown, unknown> = {
        error: { message: "Server error" },
        status: 500,
      };

      plugin.onResponse!(context, response);

      const entry = stateManager.getCache('{"method":"GET","path":["users"]}');
      expect(entry?.stale).toBe(false);
      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });

  describe("tag deduplication", () => {
    it("should deduplicate tags before invalidation", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "all" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: ["users", "users/1"],
        pluginOptions: {
          invalidate: ["users", "posts"],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      const calledTags = invalidateHandler.mock.calls[0]?.[0] as string[];
      expect(calledTags).toContain("users");
      expect(calledTags).toContain("users/1");
      expect(calledTags).toContain("posts");
      expect(calledTags.filter((t) => t === "users").length).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should not emit event when no tags to invalidate", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "none" });
      const stateManager = createStateManager();
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        stateManager,
        eventEmitter,
        tags: [],
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });

    it("should handle empty invalidate array", () => {
      const plugin = invalidationPlugin({ autoInvalidate: "none" });
      const eventEmitter = createEventEmitter();

      const invalidateHandler = vi.fn();
      eventEmitter.on("invalidate", invalidateHandler);

      const context = createMockContext({
        eventEmitter,
        pluginOptions: {
          invalidate: [],
        },
      });

      const response: SpooshResponse<unknown, unknown> = {
        data: { success: true },
        status: 200,
      };

      plugin.onResponse!(context, response);

      expect(invalidateHandler).not.toHaveBeenCalled();
    });
  });
});
