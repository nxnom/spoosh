import type {
  Trace,
  TraceStage,
  TraceOptions,
  PluginTracer,
} from "../plugins/types";

/**
 * Creates a scoped tracer for a plugin.
 *
 * @example
 * ```ts
 * const t = createTracer("spoosh:cache", context.trace);
 * t.return("Cache hit", { color: "success" });
 * t.log("Cached response", { color: "info", diff: { before, after } });
 * t.skip("No query params", { color: "muted" });
 * ```
 */
export function createTracer(
  plugin: string,
  trace: Trace | undefined
): PluginTracer {
  const step = (stage: TraceStage, reason: string, options?: TraceOptions) => {
    trace?.step(() => ({
      plugin,
      stage,
      reason,
      color: options?.color,
      diff: options?.diff,
    }));
  };

  return {
    return: (msg, options) => step("return", msg, options),
    log: (msg, options) => step("log", msg, options),
    skip: (msg, options) => step("skip", msg, options),
  };
}
