import type { StandaloneEvent } from "@spoosh/core";
import { resolvePathString } from "@spoosh/core";

import { escapeHtml } from "../utils";

export type PathResolver = (queryKey: string) => string | undefined;

const COLOR_MAP: Record<string, string> = {
  success: "var(--spoosh-success)",
  warning: "var(--spoosh-warning)",
  error: "var(--spoosh-error)",
  info: "var(--spoosh-primary)",
  muted: "var(--spoosh-text-muted)",
};

function formatQueryKey(
  queryKey: string,
  resolvedPath: string | undefined
): string {
  if (resolvedPath) {
    return resolvedPath;
  }

  try {
    const parsed = JSON.parse(queryKey) as {
      path?: string;
      options?: { params?: Record<string, string | number> };
    };

    if (!parsed.path) {
      return queryKey;
    }

    const params = parsed.options?.params;

    return resolvePathString(parsed.path, params);
  } catch {
    return queryKey;
  }
}

export function renderEventRow(
  event: StandaloneEvent,
  pathResolver?: PathResolver
): string {
  const pluginName = event.plugin.replace("spoosh:", "");
  const time = new Date(event.timestamp).toLocaleTimeString();
  const dotColor = event.color
    ? COLOR_MAP[event.color]
    : "var(--spoosh-primary)";
  const resolvedPath = event.queryKey
    ? pathResolver?.(event.queryKey)
    : undefined;

  return `
    <div class="spoosh-event">
      <div class="spoosh-event-dot" style="background: ${dotColor}"></div>
      <div class="spoosh-event-info">
        <span class="spoosh-event-plugin">${pluginName}</span>
        <span class="spoosh-event-message">${escapeHtml(event.message)}</span>
        ${event.queryKey ? `<span class="spoosh-event-query">${formatQueryKey(event.queryKey, resolvedPath)}</span>` : ""}
      </div>
      <span class="spoosh-event-time">${time}</span>
    </div>
  `;
}

export function renderEventList(
  events: StandaloneEvent[],
  pathResolver?: PathResolver
): string {
  if (events.length === 0) {
    return `<div class="spoosh-empty">No events yet</div>`;
  }

  return `
    <div class="spoosh-events">
      ${[...events]
        .reverse()
        .map((event) => renderEventRow(event, pathResolver))
        .join("")}
    </div>
  `;
}
