import type { OperationTrace } from "../../../types";
import { formatJson } from "../../utils";

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
    const { kind, value } = spooshBody;

    return `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Body <span class="spoosh-body-type ${kind}">${kind}</span></div>
        <pre class="spoosh-json">${formatJson(value)}</pre>
      </div>
    `;
  }

  return `
    <div class="spoosh-data-section">
      <div class="spoosh-data-label">Body <span class="spoosh-body-type json">json</span></div>
      <pre class="spoosh-json">${formatJson(body)}</pre>
    </div>
  `;
}

export function renderRequestTab(trace: OperationTrace): string {
  const { query, body, params, headers } = trace.request;
  const isReadOperation = trace.method === "GET";

  const hasTags = isReadOperation && trace.tags.length > 0;
  const hasParams = params && Object.keys(params).length > 0;
  const hasQuery = query && Object.keys(query).length > 0;
  const hasBody = body !== undefined;
  const hasHeaders = headers && Object.keys(headers).length > 0;

  if (!hasTags && !hasParams && !hasQuery && !hasBody && !hasHeaders) {
    return `<div class="spoosh-empty-tab">No request data</div>`;
  }

  return `
    ${
      hasTags
        ? `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Tags</div>
        <pre class="spoosh-json">${formatJson(trace.tags)}</pre>
      </div>
    `
        : ""
    }

    ${
      hasParams
        ? `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Params</div>
        <pre class="spoosh-json">${formatJson(params)}</pre>
      </div>
    `
        : ""
    }

    ${
      hasQuery
        ? `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Query</div>
        <pre class="spoosh-json">${formatJson(query)}</pre>
      </div>
    `
        : ""
    }

    ${hasBody ? renderBody(body) : ""}

    ${
      hasHeaders
        ? `
      <div class="spoosh-data-section">
        <div class="spoosh-data-label">Headers</div>
        <pre class="spoosh-json">${formatJson(headers)}</pre>
      </div>
    `
        : ""
    }
  `;
}
