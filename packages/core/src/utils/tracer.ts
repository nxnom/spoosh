import type {
  Trace,
  TraceStage,
  TraceOptions,
  PluginTracer,
  EventOptions,
} from "../plugins/types";
import type { EventEmitter } from "../events/emitter";

/**
 * Creates a scoped tracer for a plugin.
 *
 * @example
 * ```ts
 * const t = createTracer("spoosh:cache", context.trace);
 * t.return("Cache hit", { color: "success" });
 * t.log("Cached response", { color: "info", diff: { before, after } });
 * t.skip("No query params", { color: "muted" });
 * t.event("Polling scheduled", { queryKey, meta: { interval: 5000 } });
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
    // No-op in core - actual implementation in devtool plugin
    event: () => {},
  };
}

/**
 * Emits a standalone trace event via the event emitter.
 * Use this for lifecycle-only plugins that don't have access to context.tracer.
 *
 * @example
 * ```ts
 * // In a lifecycle hook or timer callback
 * emitTraceEvent(eventEmitter, "spoosh:refetch", "Triggered on focus", {
 *   queryKey,
 *   color: "success",
 * });
 * ```
 */
export function emitTraceEvent(
  eventEmitter: EventEmitter,
  plugin: string,
  message: string,
  options?: EventOptions
): void {
  eventEmitter.emit("devtool:event", {
    plugin,
    message,
    color: options?.color,
    queryKey: options?.queryKey,
    meta: options?.meta,
    timestamp: Date.now(),
  });
}
