import type { OperationTrace } from "../../../types";
import { escapeHtml, formatJson } from "../../utils";

const copyIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
</svg>`;

function renderDataSection(
  label: string,
  data: unknown,
  badge?: string
): string {
  const jsonStr = JSON.stringify(data, null, 2);

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">${label}${badge ? ` <span class="spoosh-body-type ${badge}">${badge}</span>` : ""}</div>
      <div class="spoosh-code-block">
        <button class="spoosh-code-copy-btn" data-action="copy" data-copy-content="${escapeHtml(jsonStr)}" title="Copy">
          ${copyIcon}
        </button>
        <pre class="spoosh-json">${formatJson(data)}</pre>
      </div>
    </div>
  `;
}

function renderBody(body: unknown): string {
  const spooshBody = body as {
    __spooshBody?: boolean;
    kind?: "form" | "json" | "urlencoded";
    value?: unknown;
  };

  if (
    spooshBody?.__spooshBody &&
    spooshBody.kind &&
    spooshBody.value !== undefined
  ) {
    return renderDataSection("Body", spooshBody.value, spooshBody.kind);
  }

  return renderDataSection("Body", body, "json");
}

function redactHeaders(
  headers: Record<string, string>,
  sensitiveHeaders: Set<string>
): Record<string, string> {
  const redacted: Record<string, string> = {};

  for (const [name, value] of Object.entries(headers)) {
    redacted[name] = sensitiveHeaders.has(name.toLowerCase())
      ? "••••••"
      : value;
  }

  return redacted;
}

export function renderRequestTab(
  trace: OperationTrace,
  sensitiveHeaders: Set<string>
): string {
  const { query, body, params } = trace.request;
  const headers =
    trace.finalHeaders ??
    (trace.request.headers as Record<string, string> | undefined);
  const isReadOperation = trace.method === "GET";

  const hasTags = isReadOperation && trace.tags.length > 0;
  const hasParams = params && Object.keys(params).length > 0;
  const hasQuery = query && Object.keys(query).length > 0;
  const hasBody = body !== undefined;
  const hasHeaders = headers && Object.keys(headers).length > 0;

  if (!hasTags && !hasParams && !hasQuery && !hasBody && !hasHeaders) {
    return `<div class="spoosh-empty-tab">No request data</div>`;
  }

  const redactedHeaders = hasHeaders
    ? redactHeaders(headers, sensitiveHeaders)
    : undefined;

  return `
    ${redactedHeaders ? renderDataSection("Headers", redactedHeaders) : ""}
    ${hasTags ? renderDataSection("Tags", trace.tags) : ""}
    ${hasParams ? renderDataSection("Params", params) : ""}
    ${hasQuery ? renderDataSection("Query", query) : ""}
    ${hasBody ? renderBody(body) : ""}
  `;
}
