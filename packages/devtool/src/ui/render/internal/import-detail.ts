import type { ExportedTrace } from "../../../types";
import { escapeHtml, formatJson, formatTime } from "../../utils";

export interface ImportDetailContext {
  trace: ExportedTrace | null;
}

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

function renderDataSection(
  label: string,
  data: unknown,
  isError = false
): string {
  const jsonStr = JSON.stringify(data, null, 2);

  return `
    <div class="spoosh-tab-section">
      <div class="spoosh-data-label">${label}</div>
      <div class="spoosh-code-block">
        <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
          ${copyIcon}
        </button>
        <pre class="spoosh-json${isError ? " error" : ""}">${formatJson(data)}</pre>
      </div>
    </div>
  `;
}

function renderImportedSteps(trace: ExportedTrace): string {
  if (trace.steps.length === 0) {
    return `<div class="spoosh-empty">No plugin steps recorded</div>`;
  }

  return `
    <div class="spoosh-tab-section">
      <div class="spoosh-data-label">Plugin Steps (${trace.steps.length})</div>
      ${trace.steps
        .map(
          (step) => `
        <div class="spoosh-cache-info-row">
          <span class="spoosh-cache-info-label">${escapeHtml(step.plugin)}</span>
          <span class="spoosh-cache-info-value">${escapeHtml(step.stage)}${step.reason ? ` — ${escapeHtml(step.reason)}` : ""}${step.duration !== undefined ? ` (${step.duration.toFixed(0)}ms)` : ""}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

export function renderImportDetail(ctx: ImportDetailContext): string {
  const { trace } = ctx;

  if (!trace) {
    return `
      <div class="spoosh-detail-panel">
        <div class="spoosh-detail-empty">
          <div class="spoosh-detail-empty-icon">📋</div>
          <div class="spoosh-detail-empty-text">Select an imported trace to inspect</div>
        </div>
      </div>
    `;
  }

  const hasError =
    trace.response !== undefined &&
    typeof trace.response === "object" &&
    trace.response !== null &&
    "error" in trace.response &&
    !!(trace.response as Record<string, unknown>).error;

  const statusClass = hasError ? "error" : "success";
  const statusLabel = hasError ? "Error" : "Success";

  return `
    <div class="spoosh-detail-panel">
      <div class="spoosh-detail-header">
        <div class="spoosh-detail-title">
          <span class="spoosh-trace-method method-${trace.method}">${trace.method}</span>
          <span class="spoosh-detail-path">${escapeHtml(trace.path)}</span>
        </div>
        <div class="spoosh-detail-meta">
          <span class="spoosh-badge ${statusClass}">${statusLabel}</span>
          <span class="spoosh-badge neutral">${trace.duration?.toFixed(0) ?? "..."}ms</span>
          <span class="spoosh-badge neutral">${formatTime(trace.timestamp)}</span>
          <span class="spoosh-badge neutral">imported</span>
        </div>
      </div>

      <div class="spoosh-tab-content">
        ${hasError && trace.response ? renderDataSection("Error", (trace.response as Record<string, unknown>).error, true) : ""}
        ${trace.response && !hasError ? renderDataSection("Response Data", (trace.response as Record<string, unknown>).data ?? trace.response) : ""}
        ${trace.request ? renderDataSection("Request", trace.request) : ""}
        ${trace.meta ? renderDataSection("Meta", trace.meta) : ""}
        ${renderImportedSteps(trace)}
      </div>
    </div>
  `;
}
