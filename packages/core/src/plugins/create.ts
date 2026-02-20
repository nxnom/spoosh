import type { SpooshPlugin, PluginTypeConfig, PluginContext } from "./types";

/**
 * Check for exact type equality using function type assignability.
 * Two types are equal if functions returning them are mutually assignable.
 */
type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

/**
 * Convert bare `object` type to `never` to exclude it from the union.
 * Preserves all other types including interfaces and types with actual properties.
 */
type FilterObjectType<T> = Equals<T, object> extends true ? never : T;

/**
 * Convert a union type to an intersection type.
 * This merges all properties from all types in the union.
 */
type UnionToIntersection<U> = (
  U extends unknown ? (arg: U) => void : never
) extends (arg: infer I) => void
  ? I
  : never;

/**
 * Extract all option types from plugin configuration and create a union, then intersect.
 * This allows middleware to access all properties from all option types.
 * object types are converted to unknown which doesn't affect the intersection.
 */
type ExtractPluginOptionsUnion<T extends PluginTypeConfig> =
  UnionToIntersection<
    | FilterObjectType<T extends { readOptions: infer R } ? R : never>
    | FilterObjectType<T extends { writeOptions: infer W } ? W : never>
    | FilterObjectType<T extends { writeTriggerOptions: infer WT } ? WT : never>
    | FilterObjectType<T extends { queueTriggerOptions: infer QT } ? QT : never>
    | FilterObjectType<T extends { pagesOptions: infer P } ? P : never>
    | FilterObjectType<T extends { queueOptions: infer Q } ? Q : never>
  >;

/**
 * Plugin context with typed pluginOptions based on plugin configuration.
 */
export type TypedPluginContext<T extends PluginTypeConfig> = Omit<
  PluginContext,
  "pluginOptions"
> & {
  pluginOptions?: ExtractPluginOptionsUnion<T>;
};

/**
 * Plugin definition with typed context for middleware and handlers.
 */
export type TypedPluginDefinition<T extends PluginTypeConfig> = Omit<
  SpooshPlugin<T>,
  "middleware" | "afterResponse" | "lifecycle"
> & {
  middleware?: (
    context: TypedPluginContext<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    next: () => Promise<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<any>;

  afterResponse?: (
    context: TypedPluginContext<T>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => any;

  lifecycle?: {
    onMount?: (context: TypedPluginContext<T>) => void | Promise<void>;
    onUpdate?: (
      context: TypedPluginContext<T>,
      previousContext: TypedPluginContext<T>
    ) => void | Promise<void>;
    onUnmount?: (context: TypedPluginContext<T>) => void | Promise<void>;
  };
};

/**
 * Helper to create a Spoosh plugin with automatic type inference for plugin options.
 *
 * This eliminates the need for manual type assertions in middleware by automatically
 * intersecting all option types, making all properties accessible:
 *
 * ```ts
 * // Before:
 * const pluginOptions = context.pluginOptions as CacheReadOptions | undefined;
 * const staleTime = pluginOptions?.staleTime ?? defaultStaleTime;
 *
 * // After (with createSpooshPlugin):
 * const staleTime = context.pluginOptions?.staleTime ?? defaultStaleTime;
 * ```
 *
 * @typeParam T - Plugin type configuration (readOptions, writeOptions, etc.)
 * @param definition - Plugin definition with typed context
 * @returns Typed Spoosh plugin
 *
 * @example
 * ```ts
 * export const cachePlugin = (config: CachePluginConfig = {}) =>
 *   createSpooshPlugin<{
 *     readOptions: CacheReadOptions;
 *     writeOptions: CacheWriteOptions;
 *     pagesOptions: CachePagesOptions;
 *   }>({
 *     name: "spoosh:cache",
 *     operations: ["read", "write", "pages"],
 *     middleware: async (context, next) => {
 *       // context.pluginOptions is automatically typed as an intersection:
 *       // CacheReadOptions & CachePagesOptions (CacheWriteOptions filtered as it's just 'object')
 *       // All properties from all option types are accessible:
 *       const staleTime = context.pluginOptions?.staleTime ?? defaultStaleTime;
 *       return next();
 *     },
 *   });
 * ```
 */
export function createSpooshPlugin<T extends PluginTypeConfig>(
  definition: TypedPluginDefinition<T>
): SpooshPlugin<T> {
  return definition as SpooshPlugin<T>;
}
