import type { OperationTrace } from "../../types";
import { escapeHtml, formatQueryParams } from "../utils";

export interface TraceRowContext {
  trace: OperationTrace;
  isSelected: boolean;
}

export function renderTraceRow(ctx: TraceRowContext): string {
  const { trace, isSelected } = ctx;
  const isPending = trace.duration === undefined;
  const hasError = !!trace.response?.error;
  const statusClass = isPending ? "pending" : hasError ? "error" : "success";
  const duration = trace.duration?.toFixed(0) ?? "...";
  const queryParams = formatQueryParams(
    trace.request.query as Record<string, unknown> | undefined
  );

  return `
    <div class="spoosh-trace ${isSelected ? "selected" : ""}" data-trace-id="${trace.id}">
      <div class="spoosh-trace-status ${statusClass}"></div>
      <div class="spoosh-trace-info">
        <span class="spoosh-trace-method method-${trace.method}">${trace.method}</span>
        <span class="spoosh-trace-path">${trace.path}${queryParams ? `<span class="spoosh-trace-query">?${escapeHtml(queryParams)}</span>` : ""}</span>
      </div>
      <span class="spoosh-trace-time">${duration}ms</span>
    </div>
  `;
}

export function renderTraceList(
  traces: OperationTrace[],
  selectedTraceId: string | null
): string {
  if (traces.length === 0) {
    return `<div class="spoosh-empty">No requests yet</div>`;
  }

  return `
    <div class="spoosh-traces">
      ${[...traces]
        .reverse()
        .map((trace) =>
          renderTraceRow({ trace, isSelected: trace.id === selectedTraceId })
        )
        .join("")}
    </div>
  `;
}
