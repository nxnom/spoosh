import type { HeadersInitOrGetter } from "../types";

async function resolveHeaders(
  headers?: HeadersInitOrGetter
): Promise<HeadersInit | undefined> {
  if (!headers) return undefined;
  if (typeof headers === "function") {
    return await headers();
  }
  return headers;
}

export async function mergeHeaders(
  defaultHeaders?: HeadersInitOrGetter,
  requestHeaders?: HeadersInitOrGetter
): Promise<HeadersInit | undefined> {
  const resolved1 = await resolveHeaders(defaultHeaders);
  const resolved2 = await resolveHeaders(requestHeaders);

  if (!resolved1 && !resolved2) return undefined;
  if (!resolved1) return resolved2;
  if (!resolved2) return resolved1;

  return {
    ...Object.fromEntries(new Headers(resolved1)),
    ...Object.fromEntries(new Headers(resolved2)),
  };
}
