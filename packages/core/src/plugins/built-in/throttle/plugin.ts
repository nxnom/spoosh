import type { EnlacePlugin } from "../../types";
import type {
  ThrottleReadOptions,
  ThrottleInfiniteReadOptions,
  ThrottleReadResult,
  ThrottleWriteOptions,
  ThrottleWriteResult,
} from "./types";

/**
 * Throttles requests to a maximum of 1 per X milliseconds.
 *
 * Useful for rate limiting expensive endpoints. Register this plugin LAST
 * to act as the final gatekeeper for all requests.
 *
 * @returns Throttle plugin instance
 *
 * @example
 * ```ts
 * const plugins = [
 *   cachePlugin(),
 *   throttlePlugin(),  // Register last
 * ];
 *
 * // Max 1 request per second
 * const { data } = useRead(
 *   (api) => api.expensive.$get(),
 *   { throttle: 1000 }
 * );
 * ```
 */
export function throttlePlugin(): EnlacePlugin<{
  readOptions: ThrottleReadOptions;
  writeOptions: ThrottleWriteOptions;
  infiniteReadOptions: ThrottleInfiniteReadOptions;
  readResult: ThrottleReadResult;
  writeResult: ThrottleWriteResult;
}> {
  const lastFetchTime = new Map<string, number>();

  return {
    name: "enlace:throttle",
    operations: ["read", "infiniteRead"],

    handlers: {
      beforeFetch(context) {
        const pluginOptions = context.pluginOptions as
          | ThrottleReadOptions
          | undefined;
        const throttleMs = pluginOptions?.throttle;

        if (!throttleMs || throttleMs <= 0) {
          return context;
        }

        const { queryKey } = context;
        const now = Date.now();
        const lastTime = lastFetchTime.get(queryKey) ?? 0;
        const elapsed = now - lastTime;

        if (elapsed < throttleMs) {
          context.forceRefetch = false;

          const cached = context.stateManager.getCache(queryKey);

          if (cached?.state?.data !== undefined) {
            context.cachedData = cached.state.data;
          } else {
            context.earlyResponse = { data: undefined, status: 0 };
          }

          return context;
        }

        lastFetchTime.set(queryKey, now);

        return context;
      },
    },
  };
}
