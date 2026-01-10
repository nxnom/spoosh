import { createProxyHandler } from "./proxy";
import type { EnlaceClient } from "./types/client.types";
import type { EnlaceOptions } from "./types/request.types";
import type { EnlaceMiddleware } from "./types/middleware.types";

export type EnlaceClientConfig = {
  baseUrl: string;
  defaultOptions?: EnlaceOptions;
  middlewares?: EnlaceMiddleware[];
};

/**
 * Creates a lightweight type-safe API client for vanilla JavaScript/TypeScript usage.
 *
 * This is a simpler alternative to `createEnlace` for users who don't need
 * the full plugin system, state management, or React integration.
 *
 * @param config - Client configuration
 * @returns Type-safe API client
 *
 * @example
 * ```ts
 * type ApiSchema = {
 *   posts: {
 *     $get: Endpoint<Post[]>;
 *     $post: Endpoint<Post, CreatePostBody>;
 *     _: {
 *       $get: Endpoint<Post>;
 *       $delete: Endpoint<void>;
 *     };
 *   };
 * };
 *
 * type ApiError = {
 *   message: string;
 * }
 *
 * const api = createClient<ApiSchema, ApiError>({
 *   baseUrl: "/api",
 * });
 *
 * // Type-safe API calls
 * const { data } = await api.posts.$get();
 * const { data: post } = await api.posts[123].$get();
 * ```
 */
export function createClient<TSchema, TDefaultError = unknown>(
  config: EnlaceClientConfig
): EnlaceClient<TSchema, TDefaultError> {
  const { baseUrl, defaultOptions = {}, middlewares = [] } = config;

  const optionsWithMiddlewares = { ...defaultOptions, middlewares };

  return createProxyHandler<EnlaceClient<TSchema, TDefaultError>>(
    baseUrl,
    optionsWithMiddlewares
  );
}
