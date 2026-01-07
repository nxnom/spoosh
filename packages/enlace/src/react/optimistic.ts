import type { CacheConfig, ResolvedCacheConfig } from "enlace-core";

export type { ResolvedCacheConfig };

/**
 * Helper to create an optimistic update config with proper type inference.
 * Used in trigger options to update cache before/after mutation.
 *
 * @example
 * trigger({
 *   optimistic: (cache, api) => cache({
 *     for: api.posts.$get,
 *     match: (request) => request.query?.page === 1,
 *     //                  ^^^^^^^ properly typed based on endpoint
 *     updater: (posts) => posts.filter(p => p.id !== deletedId),
 *     //        ^^^^^ properly typed as Post[]
 *   })
 * })
 */
export function cache<TData, TResponse = unknown, TRequest = unknown>(
  config: CacheConfig<TData, TResponse, TRequest>
): ResolvedCacheConfig {
  return config as ResolvedCacheConfig;
}
