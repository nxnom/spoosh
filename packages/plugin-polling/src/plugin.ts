import type {
  SpooshPlugin,
  PluginContext,
  SpooshResponse,
  PluginTracer,
} from "@spoosh/core";

import type {
  PollingReadOptions,
  PollingWriteOptions,
  PollingInfiniteReadOptions,
  PollingReadResult,
  PollingWriteResult,
} from "./types";

const PLUGIN_NAME = "spoosh:polling";

/**
 * Enables automatic polling for queries at configurable intervals.
 *
 * Automatically refetches data at specified intervals to keep it fresh.
 * Supports dynamic intervals based on current data or error state.
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/polling | Polling Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     pollingPlugin(),
 *   ]);
 *
 * // Poll every 5 seconds
 * useRead((api) => api("posts").GET(), {
 *   pollingInterval: 5000,
 * });
 *
 * // Dynamic interval based on data
 * useRead((api) => api("posts").GET(), {
 *   pollingInterval: (data, error) => error ? 10000 : 5000,
 * });
 * ```
 */
export function pollingPlugin(): SpooshPlugin<{
  readOptions: PollingReadOptions;
  writeOptions: PollingWriteOptions;
  infiniteReadOptions: PollingInfiniteReadOptions;
  readResult: PollingReadResult;
  writeResult: PollingWriteResult;
}> {
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  const tracers = new Map<string, PluginTracer>();

  const clearPolling = (queryKey: string, reason?: string) => {
    const timeout = timeouts.get(queryKey);

    if (timeout) {
      clearTimeout(timeout);
      timeouts.delete(queryKey);

      const t = tracers.get(queryKey);

      if (t && reason) {
        t.event(reason, { queryKey });
      }

      tracers.delete(queryKey);
    }
  };

  const scheduleNextPoll = (
    context: PluginContext,
    response?: SpooshResponse<unknown, unknown>
  ) => {
    const { queryKey, eventEmitter } = context;
    const t = context.tracer?.(PLUGIN_NAME);

    const pluginOptions = context.pluginOptions as
      | PollingReadOptions
      | undefined;
    const pollingInterval = pluginOptions?.pollingInterval;

    if (!pollingInterval) return;

    const source = response ?? context.stateManager.getCache(queryKey)?.state;

    const resolvedInterval =
      typeof pollingInterval === "function"
        ? pollingInterval(source?.data, source?.error)
        : pollingInterval;

    if (resolvedInterval === false || resolvedInterval <= 0) {
      t?.event("Polling disabled", { queryKey, color: "muted" });
      return;
    }

    clearPolling(queryKey);

    if (t) {
      tracers.set(queryKey, t);
    }

    t?.event(`Scheduled next poll in ${resolvedInterval}ms`, {
      queryKey,
      color: "info",
      meta: { interval: resolvedInterval },
    });

    const timeout = setTimeout(() => {
      timeouts.delete(queryKey);

      const storedTracer = tracers.get(queryKey);

      storedTracer?.event("Poll triggered", { queryKey, color: "success" });

      eventEmitter.emit("refetch", {
        queryKey,
        reason: "polling",
      });
    }, resolvedInterval);

    timeouts.set(queryKey, timeout);
  };

  return {
    name: PLUGIN_NAME,
    operations: ["read", "infiniteRead"],

    afterResponse(context, response) {
      scheduleNextPoll(context, response);
    },

    lifecycle: {
      onUpdate(context, previousContext) {
        if (previousContext.queryKey !== context.queryKey) {
          clearPolling(previousContext.queryKey, "Query key changed");
        }

        const { queryKey } = context;

        const pluginOptions = context.pluginOptions as
          | PollingReadOptions
          | undefined;
        const pollingInterval = pluginOptions?.pollingInterval;

        if (!pollingInterval) {
          clearPolling(queryKey, "Polling disabled");
          return;
        }

        const currentTimeout = timeouts.get(queryKey);

        if (!currentTimeout) {
          scheduleNextPoll(context);
        }
      },

      onUnmount(context) {
        clearPolling(context.queryKey, "Component unmounted");
      },
    },
  };
}
