import type { PluginStepEvent } from "../../../types";
import { escapeHtml } from "../../utils";
import { renderPluginDiff } from "./diff-view";

export interface TimelineStepContext {
  traceId: string;
  step: PluginStepEvent;
  isExpanded: boolean;
  fullDiffViews: ReadonlySet<string>;
}

const COLOR_MAP: Record<string, string> = {
  success: "var(--spoosh-success)",
  warning: "var(--spoosh-warning)",
  error: "var(--spoosh-error)",
  info: "var(--spoosh-primary)",
  muted: "var(--spoosh-text-muted)",
};

const STAGE_COLORS: Record<string, string> = {
  return: "var(--spoosh-success)",
  log: "var(--spoosh-primary)",
  skip: "var(--spoosh-text-muted)",
  fetch: "var(--spoosh-warning)",
};

export function renderTimelineStep(ctx: TimelineStepContext): string {
  const { traceId, step, isExpanded, fullDiffViews } = ctx;
  const isFetch = step.plugin === "fetch";
  const isSkip = step.stage === "skip";
  const stepKey = `${traceId}:${step.plugin}:${step.timestamp}`;
  const hasDiff =
    step.diff &&
    JSON.stringify(step.diff.before) !== JSON.stringify(step.diff.after);

  const dotColor = step.color
    ? COLOR_MAP[step.color]
    : STAGE_COLORS[step.stage] || "var(--spoosh-text-muted)";

  const displayName = step.plugin.replace("spoosh:", "");

  if (isFetch) {
    return `
      <div class="spoosh-timeline-fetch">
        <div class="spoosh-fetch-line"></div>
        <div class="spoosh-fetch-label">⚡ Fetch</div>
        <div class="spoosh-fetch-line"></div>
      </div>
    `;
  }

  return `
    <div class="spoosh-timeline-step ${isSkip ? "skipped" : ""} ${isExpanded ? "expanded" : ""}" data-step-key="${stepKey}">
      <div class="spoosh-timeline-step-header" ${hasDiff ? 'data-action="toggle-step"' : ""}>
        <div class="spoosh-timeline-dot" style="background: ${dotColor}"></div>
        <span class="spoosh-timeline-plugin">${displayName}</span>
        <span class="spoosh-timeline-stage">${step.stage}</span>
        ${step.reason ? `<span class="spoosh-timeline-reason">${escapeHtml(step.reason)}</span>` : ""}
        ${hasDiff ? `<span class="spoosh-plugin-expand">${isExpanded ? "▼" : "▶"}</span>` : ""}
      </div>
      ${isExpanded && step.diff ? renderPluginDiff({ stepKey, diff: step.diff, showFull: fullDiffViews.has(stepKey) }) : ""}
    </div>
  `;
}

export function renderPassedPlugin(pluginName: string): string {
  const displayName = pluginName.replace("spoosh:", "");

  return `
    <div class="spoosh-timeline-step skipped">
      <div class="spoosh-timeline-step-header">
        <div class="spoosh-timeline-dot" style="background: var(--spoosh-border)"></div>
        <span class="spoosh-timeline-plugin">${displayName}</span>
      </div>
    </div>
  `;
}
