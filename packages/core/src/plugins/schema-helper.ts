import type { SpooshResponse } from "../types/response.types";
import type {
  FindMatchingKey,
  ExtractData,
  ExtractQuery,
  ExtractBody,
  ExtractParamNames,
  HasParams,
  ReadPaths,
  WritePaths,
  HasReadMethod,
  HasWriteMethod,
} from "../types/schema.types";
import type { Simplify, WriteMethod } from "../types/common.types";

type IsNever<T> = [T] extends [never] ? true : false;

type EndpointRequestOptions<TEndpoint, TPath extends string> = (IsNever<
  ExtractBody<TEndpoint>
> extends true
  ? object
  : { body: ExtractBody<TEndpoint> }) &
  (IsNever<ExtractQuery<TEndpoint>> extends true
    ? object
    : { query: ExtractQuery<TEndpoint> }) &
  (HasParams<TPath> extends true
    ? { params: Record<ExtractParamNames<TPath>, string | number> }
    : object);

type EndpointMethodFn<TEndpoint, TPath extends string> = (
  options?: Simplify<EndpointRequestOptions<TEndpoint, TPath>>
) => Promise<
  SpooshResponse<
    ExtractData<TEndpoint>,
    unknown,
    EndpointRequestOptions<TEndpoint, TPath>
  >
>;

type ReadPathMethods<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? "GET" extends keyof TSchema[TKey]
        ? Simplify<{ GET: EndpointMethodFn<TSchema[TKey]["GET"], TPath> }>
        : never
      : never
    : never;

/**
 * Schema navigation helper for plugins that need type-safe API schema access.
 *
 * This type transforms the API schema into a callable function where:
 * - Path strings are used to select endpoints
 * - Only GET methods are exposed (for query operations)
 *
 * Use this in plugin option types that need to reference API endpoints:
 *
 * @example
 * ```ts
 * // Define your plugin's callback type
 * type MyCallbackFn<TSchema = unknown> = (
 *   api: ReadSchemaHelper<TSchema>
 * ) => unknown;
 *
 * // Usage in plugin options
 * interface MyPluginWriteOptions {
 *   myCallback?: MyCallbackFn<unknown>;
 * }
 *
 * // Register for schema resolution
 * declare module '@spoosh/core' {
 *   interface SchemaResolvers<TSchema> {
 *     myCallback: MyCallbackFn<TSchema> | undefined;
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * // User's code - paths are type-checked!
 * trigger({
 *   myCallback: (api) => [
 *     api("posts").GET,           // ✓ Valid
 *     api("posts/:id").GET,       // ✓ Dynamic segment
 *     api("nonexistent").GET,     // ✗ Type error
 *   ],
 * });
 * ```
 */
export type ReadSchemaHelper<TSchema> = <
  TPath extends ReadPaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasReadMethod<TSchema, TPath> extends true
  ? ReadPathMethods<TSchema, TPath>
  : never;

type WritePathMethods<TSchema, TPath extends string> =
  FindMatchingKey<TSchema, TPath> extends infer TKey
    ? TKey extends keyof TSchema
      ? Simplify<{
          [M in WriteMethod as M extends keyof TSchema[TKey]
            ? M
            : never]: M extends keyof TSchema[TKey]
            ? EndpointMethodFn<TSchema[TKey][M], TPath>
            : never;
        }>
      : never
    : never;

/**
 * Schema navigation helper for plugins that need type-safe API schema access for mutations.
 *
 * Similar to ReadSchemaHelper but exposes write methods (POST, PUT, PATCH, DELETE).
 */
export type WriteSchemaHelper<TSchema> = <
  TPath extends WritePaths<TSchema> | (string & {}),
>(
  path: TPath
) => HasWriteMethod<TSchema, TPath> extends true
  ? WritePathMethods<TSchema, TPath>
  : never;
