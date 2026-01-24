import type { ResolverContext } from "@spoosh/core";

export type MaybePromise<T> = T | Promise<T>;

export type ResponseTransformer<TIn = unknown, TOut = unknown> = (
  response: TIn
) => MaybePromise<TOut>;

export interface TransformConfig {
  /** Transform response data after request. Returns transformedData (can be any type). */
  response?: ResponseTransformer<unknown, unknown>;
}

/**
 * Plugin-level config. All transforms are per-request only for type inference.
 */
export type TransformPluginConfig = object;

export interface TransformReadOptions {
  /** Per-request transform functions. */
  transform?: TransformConfig;
}

export interface TransformWriteOptions {
  /** Per-request transform functions. */
  transform?: TransformConfig;
}

export interface TransformInfiniteReadOptions {
  /** Per-request transform functions. */
  transform?: TransformConfig;
}

export type TransformReadResult = object;

export type TransformWriteResult = object;

export type TransformOptions =
  | TransformReadOptions
  | TransformWriteOptions
  | TransformInfiniteReadOptions;

/**
 * Extracts the return type of a response transformer from hook options.
 * Returns `never` if no response transformer is provided.
 */
export type InferTransformedData<TOptions> = TOptions extends {
  transform: { response: (data: never) => MaybePromise<infer R> };
}
  ? R
  : never;

/**
 * Conditionally adds `transformedData` field to hook result.
 * Only present when a response transformer is provided.
 */
export type TransformResultField<TOptions> = [
  InferTransformedData<TOptions>,
] extends [never]
  ? object
  : { transformedData: InferTransformedData<TOptions> | undefined };

type ResolvedTransformConfig<TContext extends ResolverContext> = {
  /** Transform response data after request. Returns transformedData (can be any type). */
  response?: ResponseTransformer<TContext["data"], unknown>;
};

declare module "@spoosh/core" {
  interface PluginResolvers<TContext extends ResolverContext> {
    transform: ResolvedTransformConfig<TContext> | undefined;
  }

  interface PluginResultResolvers<TOptions> {
    transformedData: TOptions extends {
      transform: { response: (data: never) => MaybePromise<infer R> };
    }
      ? Awaited<R> | undefined
      : never;
  }
}
