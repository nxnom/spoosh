import type { EnlacePlugin } from "../../types";
import type {
  DebounceReadOptions,
  DebounceInfiniteReadOptions,
  DebounceReadResult,
  DebounceWriteOptions,
  DebounceWriteResult,
  DebounceContext,
  DebounceValue,
} from "./types";

type RequestOptionsSnapshot = {
  query?: Record<string, unknown>;
  params?: Record<string, string | number>;
  body?: unknown;
};

function resolveDebounceMs(
  debounce: DebounceValue | undefined,
  context: DebounceContext
): number {
  if (debounce === undefined) return 0;
  if (typeof debounce === "number") return debounce;

  return debounce(context);
}

/**
 * Debounces requests by waiting for inactivity before fetching.
 *
 * Useful for search inputs where you want to wait for the user to stop typing.
 *
 * @returns Debounce plugin instance
 *
 * @example
 * ```ts
 * const plugins = [debouncePlugin()];
 *
 * // Wait 300ms after typing stops before fetching
 * const { data } = useRead(
 *   (api) => api.search.$get({ query: { q: searchTerm } }),
 *   { debounce: 300 }
 * );
 *
 * // Conditional debounce - only debounce when search query changes
 * const { data } = useRead(
 *   (api) => api.search.$get({ query: { q: searchTerm, page } }),
 *   { debounce: ({ query, prevQuery }) => query?.q !== prevQuery?.q ? 300 : 0 }
 * );
 * ```
 */
export function debouncePlugin(): EnlacePlugin<{
  readOptions: DebounceReadOptions;
  writeOptions: DebounceWriteOptions;
  infiniteReadOptions: DebounceInfiniteReadOptions;
  readResult: DebounceReadResult;
  writeResult: DebounceWriteResult;
}> {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const latestQueryKeys = new Map<string, string>();
  const prevRequests = new Map<string, RequestOptionsSnapshot>();

  return {
    name: "enlace:debounce",
    operations: ["read", "infiniteRead"],

    handlers: {
      beforeFetch(context) {
        const pluginOptions = context.pluginOptions as
          | DebounceReadOptions
          | undefined;
        const debounceOption = pluginOptions?.debounce;

        if (debounceOption === undefined) {
          return context;
        }

        if (context.forceRefetch) {
          return context;
        }

        const { queryKey, requestOptions, path, method } = context;

        const stableKey = `${path.join("/")}:${method}`;

        const opts = requestOptions as
          | (RequestOptionsSnapshot & Record<string, unknown>)
          | undefined;

        const currentRequest: RequestOptionsSnapshot = {
          query: opts?.query,
          params: opts?.params,
          body: opts?.body,
        };

        const prevRequest = prevRequests.get(stableKey);

        const debounceContext: DebounceContext = {
          query: currentRequest.query,
          params: currentRequest.params,
          body: currentRequest.body,
          prevQuery: prevRequest?.query,
          prevParams: prevRequest?.params,
          prevBody: prevRequest?.body,
        };

        const debounceMs = resolveDebounceMs(debounceOption, debounceContext);

        prevRequests.set(stableKey, currentRequest);

        if (!debounceMs || debounceMs <= 0) {
          return context;
        }

        // Check if queryKey changed - if not, don't reset the timer
        const existingQueryKey = latestQueryKeys.get(stableKey);

        if (existingQueryKey === queryKey) {
          if (context.cachedData !== undefined) {
            return context;
          }

          context.earlyResponse = {
            data: undefined,
            status: 0,
          };

          return context;
        }

        // Clear existing timer for this endpoint
        const existingTimer = timers.get(stableKey);

        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Store latest queryKey for this endpoint
        latestQueryKeys.set(stableKey, queryKey);

        const cached = context.stateManager.getCache(queryKey);

        if (cached?.state?.data !== undefined) {
          context.cachedData = cached.state.data;
        }

        const timer = setTimeout(() => {
          timers.delete(stableKey);
          const latestKey = latestQueryKeys.get(stableKey);

          if (latestKey) {
            context.eventEmitter.emit("refetch", {
              queryKey: latestKey,
              reason: "invalidate",
            });
          }
        }, debounceMs);

        timers.set(stableKey, timer);

        if (context.cachedData !== undefined) {
          return context;
        }

        context.earlyResponse = {
          data: undefined,
          status: 0,
        };

        return context;
      },
    },
  };
}
