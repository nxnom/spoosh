import qs from "query-string";

function getOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function buildUrl(
  baseUrl: string,
  path: string[],
  query?: Record<string, string | number | boolean | undefined>
): string {
  let normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

  const isRelative =
    !normalizedBase.startsWith("http://") &&
    !normalizedBase.startsWith("https://");

  if (isRelative) {
    const origin = getOrigin();
    if (origin) {
      const prefix = normalizedBase.startsWith("/") ? "" : "/";
      normalizedBase = `${origin}${prefix}${normalizedBase}`;
    }
  }

  const url = new URL(path.join("/"), normalizedBase);

  if (query) {
    url.search = qs.stringify(query, { skipNull: true, skipEmptyString: true });
  }

  return url.toString();
}
