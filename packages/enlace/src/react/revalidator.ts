import { clearCacheByTags } from "./cache";

type Listener = (tags: string[]) => void;

const listeners = new Set<Listener>();

/**
 * Manually invalidate cache entries and trigger refetch for queries matching the specified tags.
 *
 * @param tags - Array of cache tags to invalidate
 *
 * @example
 * ```ts
 * import { invalidateTags } from 'enlace/hook';
 *
 * // Invalidate all queries tagged with 'posts'
 * invalidateTags(['posts']);
 *
 * // Invalidate multiple tags
 * invalidateTags(['posts', 'users']);
 * ```
 */
export function invalidateTags(tags: string[]): void {
  clearCacheByTags(tags);
  listeners.forEach((listener) => listener(tags));
}

export function onRevalidate(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
