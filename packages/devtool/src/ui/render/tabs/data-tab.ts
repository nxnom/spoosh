import type { OperationTrace } from "../../../types";
import { formatJson } from "../../utils";

export function renderDataTab(trace: OperationTrace): string {
  const isPending = trace.duration === undefined;

  if (isPending) {
    return `
      <div class="spoosh-empty-tab spoosh-pending-tab">
        <div class="spoosh-spinner"></div>
        <div>Fetching...</div>
      </div>
    `;
  }

  const response = trace.response;

  if (!response) {
    return `<div class="spoosh-empty-tab">No response data</div>`;
  }

  if (response.error) {
    return `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Error</div>
        <pre class="spoosh-json error">${formatJson(response.error)}</pre>
      </div>
    `;
  }

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">Response Data</div>
      <pre class="spoosh-json">${formatJson(response.data)}</pre>
    </div>
  `;
}
