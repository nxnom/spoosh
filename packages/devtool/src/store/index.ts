import type { SpooshResponse, TraceEvent } from "@spoosh/core";

import type {
  OperationTrace,
  InvalidationEvent,
  DevToolFilters,
  DevToolStoreInterface,
  TraceContext,
} from "../types";
import { createRingBuffer } from "./history";

export interface DevToolStoreConfig {
  maxHistory: number;
}

export class DevToolStore implements DevToolStoreInterface {
  private traces = createRingBuffer<OperationTrace>(50);
  private activeTraces = new Map<string, OperationTrace>();
  private invalidations: InvalidationEvent[] = [];
  private subscribers = new Set<() => void>();
  private filters: DevToolFilters = {
    operationTypes: new Set(["read", "write", "infiniteRead"]),
    showSkipped: true,
    showOnlyWithChanges: false,
  };

  constructor(config: DevToolStoreConfig) {
    this.traces = createRingBuffer<OperationTrace>(config.maxHistory);
  }

  startTrace(context: TraceContext): OperationTrace {
    const trace: OperationTrace = {
      id: crypto.randomUUID(),
      operationType: context.operationType,
      method: context.method,
      path: context.path,
      queryKey: context.queryKey,
      tags: context.tags,
      startTime: performance.now(),
      steps: [],
      response: undefined,

      addStep(event: TraceEvent, timestamp: number) {
        this.steps.push({
          traceId: this.id,
          plugin: event.plugin,
          stage: event.stage,
          timestamp,
          reason: event.meta?.reason,
          diff: event.meta?.diff,
          meta: event.meta,
        });
      },
    };

    this.activeTraces.set(context.queryKey, trace);
    return trace;
  }

  endTrace(
    queryKey: string,
    response?: SpooshResponse<unknown, unknown>
  ): void {
    const trace = this.activeTraces.get(queryKey);

    if (!trace) return;

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.response = response;

    this.traces.push(trace);
    this.activeTraces.delete(queryKey);
    this.notify();
  }

  getCurrentTrace(queryKey: string): OperationTrace | undefined {
    return this.activeTraces.get(queryKey);
  }

  getTrace(traceId: string): OperationTrace | undefined {
    return this.traces.toArray().find((t) => t.id === traceId);
  }

  getTraces(): OperationTrace[] {
    return this.traces.toArray();
  }

  getFilteredTraces(): OperationTrace[] {
    return this.traces
      .toArray()
      .filter((trace) => this.filters.operationTypes.has(trace.operationType));
  }

  getFilters(): DevToolFilters {
    return this.filters;
  }

  recordInvalidation(event: InvalidationEvent): void {
    this.invalidations.push(event);
    this.notify();
  }

  recordLifecycle(
    phase: "onMount" | "onUpdate" | "onUnmount",
    context: TraceContext,
    prevContext?: TraceContext
  ): void {
    const trace = this.getCurrentTrace(context.queryKey);

    if (trace) {
      trace.addStep(
        {
          plugin: "lifecycle",
          stage: phase === "onUnmount" ? "after" : "before",
          meta: {
            reason: `Lifecycle: ${phase}`,
            ...(prevContext ? { prevQueryKey: prevContext.queryKey } : {}),
          },
        },
        performance.now()
      );
    }
  }

  setFilter<K extends keyof DevToolFilters>(
    key: K,
    value: DevToolFilters[K]
  ): void {
    this.filters[key] = value;
    this.notify();
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify(): void {
    this.subscribers.forEach((cb) => cb());
  }

  clear(): void {
    this.traces.clear();
    this.invalidations = [];
    this.notify();
  }
}
