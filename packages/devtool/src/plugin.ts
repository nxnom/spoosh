import type {
  SpooshPlugin,
  SpooshResponse,
  Trace,
  TraceEvent,
} from "@spoosh/core";

import { DevToolStore } from "./store";
import { DevToolPanel } from "./ui/panel";
import type { DevToolConfig, DevToolInstanceApi, DevToolTheme } from "./types";

export function devtool(
  config: DevToolConfig = {}
): SpooshPlugin<{ instanceApi: DevToolInstanceApi }> {
  const {
    enabled = true,
    theme = "dark",
    position = "bottom-right",
    maxHistory = 50,
  } = config;

  if (!enabled || typeof window === "undefined") {
    return {
      name: "spoosh:devtool",
      operations: ["read", "write", "infiniteRead"],
    };
  }

  const store = new DevToolStore({ maxHistory });
  let panel: DevToolPanel | null = null;

  return {
    name: "spoosh:devtool",
    operations: ["read", "write", "infiniteRead"],
    priority: -100,

    middleware: async (context, next) => {
      const trace = store.startTrace({
        operationType: context.operationType,
        method: context.method,
        path: context.path,
        queryKey: context.queryKey,
        tags: context.tags,
      });

      const traceApi: Trace = {
        step: (eventOrFn: TraceEvent | (() => TraceEvent)) => {
          const event =
            typeof eventOrFn === "function" ? eventOrFn() : eventOrFn;
          trace.addStep(event, performance.now());
        },
      };

      (context as { trace: Trace }).trace = traceApi;

      const response = await next();

      store.endTrace(
        context.queryKey,
        response as SpooshResponse<unknown, unknown>
      );

      return response;
    },

    lifecycle: {
      onMount(context) {
        store.recordLifecycle("onMount", {
          operationType: context.operationType,
          method: context.method,
          path: context.path,
          queryKey: context.queryKey,
          tags: context.tags,
        });
      },

      onUpdate(context, prevContext) {
        store.recordLifecycle(
          "onUpdate",
          {
            operationType: context.operationType,
            method: context.method,
            path: context.path,
            queryKey: context.queryKey,
            tags: context.tags,
          },
          {
            operationType: prevContext.operationType,
            method: prevContext.method,
            path: prevContext.path,
            queryKey: prevContext.queryKey,
            tags: prevContext.tags,
          }
        );
      },

      onUnmount(context) {
        store.recordLifecycle("onUnmount", {
          operationType: context.operationType,
          method: context.method,
          path: context.path,
          queryKey: context.queryKey,
          tags: context.tags,
        });
      },
    },

    instanceApi(ctx) {
      if (!panel) {
        panel = new DevToolPanel({
          store,
          theme,
          position,
          stateManager: ctx.stateManager,
          eventEmitter: ctx.eventEmitter,
        });
        panel.mount();
      }

      ctx.eventEmitter.on("invalidate", (tags: string[]) => {
        const affectedKeys = ctx.stateManager.getCacheEntriesByTags(tags);
        const listenerCounts = affectedKeys.map(({ key }) => ({
          key,
          count: ctx.stateManager.getSubscribersCount(key),
        }));

        store.recordInvalidation({
          tags,
          affectedKeys: listenerCounts,
          totalListeners: listenerCounts.reduce((sum, k) => sum + k.count, 0),
          timestamp: Date.now(),
        });
      });

      return {
        getHistory: () => store.getTraces(),
        clearHistory: () => store.clear(),
        setEnabled: (value: boolean) => panel?.setVisible(value),
        setTheme: (newTheme: "light" | "dark" | DevToolTheme) =>
          panel?.setTheme(newTheme),
        open: () => panel?.open(),
        close: () => panel?.close(),
        toggle: () => panel?.toggle(),
      };
    },
  };
}
