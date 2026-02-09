import type { OperationTrace } from "../../../types";
import { formatJson } from "../../utils";

export function getMetaFromCache(
  trace: OperationTrace
): Record<string, unknown> | null {
  const cacheEntry = trace.stateManager.getCache(trace.queryKey);

  if (!cacheEntry?.meta || cacheEntry.meta.size === 0) {
    return null;
  }

  return Object.fromEntries(cacheEntry.meta);
}

export function getMetaCount(trace: OperationTrace): number {
  const meta = getMetaFromCache(trace);
  return meta ? Object.keys(meta).length : 0;
}

export function renderMetaTab(trace: OperationTrace): string {
  const isPending = trace.duration === undefined;

  if (isPending) {
    return `
      <div class="spoosh-empty-tab spoosh-pending-tab">
        <div class="spoosh-spinner"></div>
        <div>Fetching...</div>
      </div>
    `;
  }

  const meta = getMetaFromCache(trace);

  if (!meta || Object.keys(meta).length === 0) {
    return `<div class="spoosh-empty-tab">No meta data from plugins</div>`;
  }

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">Plugin Meta</div>
      <pre class="spoosh-json">${formatJson(meta)}</pre>
    </div>
  `;
}
