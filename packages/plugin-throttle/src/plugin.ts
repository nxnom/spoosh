import type { SpooshPlugin } from "@spoosh/core";

import type {
  ThrottleReadOptions,
  ThrottleInfiniteReadOptions,
  ThrottleReadResult,
  ThrottleWriteOptions,
  ThrottleWriteResult,
} from "./types";

/**
 * Enables throttling for read operations.
 *
 * Limits how frequently a query can be executed, returning cached data
 * if the throttle window hasn't elapsed.
 *
 * This plugin runs with priority 100, meaning it executes last in the middleware chain
 * to block all requests (including force fetches) that exceed the throttle limit.
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/throttle | Throttle Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     throttlePlugin(),
 *     // ... other plugins
 *   ]);
 *
 * // Throttle to max once per second
 * useRead((api) => api("posts").GET(), {
 *   throttle: 1000,
 * });
 * ```
 */
export function throttlePlugin(): SpooshPlugin<{
  readOptions: ThrottleReadOptions;
  writeOptions: ThrottleWriteOptions;
  infiniteReadOptions: ThrottleInfiniteReadOptions;
  readResult: ThrottleReadResult;
  writeResult: ThrottleWriteResult;
}> {
  const lastFetchTime = new Map<string, number>();

  return {
    name: "spoosh:throttle",
    operations: ["read", "infiniteRead"],
    priority: 100,

    middleware: async (context, next) => {
      const pluginOptions = context.pluginOptions as
        | ThrottleReadOptions
        | undefined;
      const throttleMs = pluginOptions?.throttle;

      if (!throttleMs || throttleMs <= 0) {
        return next();
      }

      const { path, method } = context;
      const stableKey = `${path}:${method}`;
      const now = Date.now();
      const lastTime = lastFetchTime.get(stableKey) ?? 0;
      const elapsed = now - lastTime;

      if (elapsed < throttleMs) {
        return { data: undefined, status: 0 };
      }

      lastFetchTime.set(stableKey, now);

      return next();
    },
  };
}
