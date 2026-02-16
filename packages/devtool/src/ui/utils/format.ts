export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatQueryParams(
  query?: Record<string, unknown>
): string | null {
  if (!query) return null;

  const entries = Object.entries(query);

  if (entries.length === 0) return null;

  return entries
    .map(
      ([k, v]) =>
        `${encodeURIComponent(k)}=${encodeURIComponent(String(v ?? ""))}`
    )
    .join("&");
}

const BASE64_THRESHOLD = 100;
const BASE64_REGEX = /^data:([^;]+)?;base64,/;
const PURE_BASE64_REGEX = /^[A-Za-z0-9+/]{100,}={0,2}$/;

function isBase64String(value: unknown): boolean {
  if (typeof value !== "string" || value.length < BASE64_THRESHOLD) {
    return false;
  }

  if (BASE64_REGEX.test(value)) {
    return true;
  }

  return PURE_BASE64_REGEX.test(value);
}

function getBase64Placeholder(value: string): string {
  const dataUrlMatch = value.match(BASE64_REGEX);

  if (dataUrlMatch) {
    const mimeType = dataUrlMatch[1] || "unknown";
    const base64Part = value.slice(dataUrlMatch[0].length);
    const estimatedSize = Math.round((base64Part.length * 3) / 4);
    return `[Base64 ${mimeType}: ~${formatBytes(estimatedSize)}]`;
  }

  const estimatedSize = Math.round((value.length * 3) / 4);
  return `[Base64 Data: ~${formatBytes(estimatedSize)}]`;
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (value instanceof File) {
    return `[File: ${value.name} (${formatBytes(value.size)}, ${value.type || "unknown type"})]`;
  }

  if (value instanceof Blob) {
    return `[Blob: ${formatBytes(value.size)}, ${value.type || "unknown type"}]`;
  }

  if (value instanceof FormData) {
    const entries: Record<string, string> = {};
    value.forEach((v, k) => {
      if (v instanceof File) {
        entries[k] = `[File: ${v.name}]`;
      } else {
        entries[k] = String(v);
      }
    });
    return entries;
  }

  if (value instanceof ArrayBuffer) {
    return `[ArrayBuffer: ${formatBytes(value.byteLength)}]`;
  }

  if (typeof value === "function") {
    return `[Function: ${value.name || "anonymous"}]`;
  }

  return value;
}

export function highlightJson(json: string): string {
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|(\b\d+\.?\d*\b)|(\btrue\b|\bfalse\b)|(\bnull\b)/g,
    (match, key, str, num, bool, nil) => {
      if (key) return `<span class="spoosh-syn-key">${escapeHtml(key)}</span>:`;
      if (str) return `<span class="spoosh-syn-str">${escapeHtml(str)}</span>`;
      if (num) return `<span class="spoosh-syn-num">${num}</span>`;
      if (bool) return `<span class="spoosh-syn-bool">${bool}</span>`;
      if (nil) return `<span class="spoosh-syn-null">${nil}</span>`;
      return match;
    }
  );
}

export function formatJson(data: unknown): string {
  if (data === undefined)
    return '<span class="spoosh-syn-null">undefined</span>';
  if (data === null) return '<span class="spoosh-syn-null">null</span>';

  try {
    const json = JSON.stringify(data, jsonReplacer, 2);
    return highlightJson(json);
  } catch {
    return escapeHtml(String(data));
  }
}

export function sanitizeForExport(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (isBase64String(data)) {
    return getBase64Placeholder(data as string);
  }

  if (data instanceof File) {
    return `[File: ${data.name} (${formatBytes(data.size)}, ${data.type || "unknown type"})]`;
  }

  if (data instanceof Blob) {
    return `[Blob: ${formatBytes(data.size)}, ${data.type || "unknown type"}]`;
  }

  if (data instanceof FormData) {
    const entries: Record<string, unknown> = {};
    data.forEach((v, k) => {
      entries[k] = sanitizeForExport(v);
    });
    return entries;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeForExport);
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeForExport(value);
    }

    return sanitized;
  }

  return data;
}
