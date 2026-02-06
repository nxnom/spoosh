import { createProxyHandler } from "./proxy";
import type { SpooshClient } from "./types/client.types";
import type { SpooshOptions, SpooshOptionsInput } from "./types/request.types";

/**
 * Creates a lightweight type-safe API instance for vanilla JavaScript/TypeScript usage.
 *
 * This is a simpler alternative to `Spoosh` for users who don't need
 * the full plugin system, state management, or React integration.
 *
 * @param baseUrl - Base URL for all API requests
 * @param defaultOptions - Default fetch options (headers, credentials, etc.)
 * @returns Type-safe API instance
 *
 * @example
 * ```ts
 * type ApiSchema = SpooshSchema<{
 *   "posts": {
 *     GET: { data: Post[] };
 *     POST: { data: Post; body: CreatePostBody };
 *   };
 *   "posts/:id": {
 *     GET: { data: Post };
 *     PUT: { data: Post; body: UpdatePostBody };
 *     DELETE: { data: void };
 *   };
 * }>;
 *
 * type ApiError = {
 *   message: string;
 * }
 *
 * const api = createClient<ApiSchema, ApiError>("/api");
 *
 * // Type-safe API calls with path strings
 * const { data } = await api("posts").GET();
 * const { data: post } = await api("posts/123").GET();
 * await api("posts/:id").GET({ params: { id: 123 } });
 *
 * // With custom options
 * const api = createClient<ApiSchema, ApiError>("/api", {
 *   headers: { Authorization: "Bearer token" },
 *   transport: "xhr",
 * });
 * ```
 */
export function createClient<TSchema, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions?: SpooshOptionsInput
): SpooshClient<TSchema, TDefaultError> {
  return createProxyHandler<TSchema, TDefaultError>({
    baseUrl,
    defaultOptions: (defaultOptions as SpooshOptions) || {},
    nextTags: true,
  });
}
