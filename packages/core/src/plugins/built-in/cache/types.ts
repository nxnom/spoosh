/**
 * Configuration for the cache plugin.
 */
export interface CachePluginConfig {
  /** Default stale time in milliseconds. Data older than this is considered stale. Defaults to 0. */
  staleTime?: number;
}

/**
 * Options available in useRead when cache plugin is enabled.
 */
export interface CacheReadOptions {
  /** Time in milliseconds before cached data is considered stale. Overrides plugin default. */
  staleTime?: number;
}

export type CacheWriteOptions = object;

/**
 * Options available in useInfiniteRead when cache plugin is enabled.
 */
export interface CacheInfiniteReadOptions {
  /** Time in milliseconds before cached data is considered stale. Overrides plugin default. */
  staleTime?: number;
}

/**
 * Result properties added by cache plugin to useRead return value.
 */
export type CacheReadResult = object;

export type CacheWriteResult = object;
