import type { ResolverContext } from "@spoosh/core";

export type MaybePromise<T> = T | Promise<T>;

/** Suggests keys from TIn but all optional and any type, plus allows extra keys */
type FlexibleOutput<TIn> = { [K in keyof TIn]?: unknown } & Record<
  string,
  unknown
>;

export type QueryTransformer<TIn = unknown> = (
  query: TIn
) => MaybePromise<FlexibleOutput<TIn> | undefined>;

export type BodyTransformer<TIn = unknown> = (
  body: TIn
) => MaybePromise<FlexibleOutput<TIn> | undefined>;

export type FormDataTransformer<TIn = unknown> = (
  formData: TIn
) => MaybePromise<FlexibleOutput<TIn> | undefined>;

export type UrlEncodedTransformer<TIn = unknown> = (
  urlEncoded: TIn
) => MaybePromise<FlexibleOutput<TIn> | undefined>;

export type ResponseTransformer<TIn = unknown, TOut = unknown> = (
  response: TIn
) => MaybePromise<TOut>;

export interface TransformConfig {
  /** Transform query parameters before request. Return undefined to remove query. */
  query?: QueryTransformer;

  /** Transform JSON body before request. Return undefined to remove body. */
  body?: BodyTransformer;

  /** Transform form data before request. Return undefined to remove formData. */
  formData?: FormDataTransformer;

  /** Transform URL-encoded data before request. Return undefined to remove urlEncoded. */
  urlEncoded?: UrlEncodedTransformer;

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
  /** Transform query parameters before request. Return undefined to remove query. */
  query?: QueryTransformer<TContext["input"]["query"]>;

  /** Transform JSON body before request. Return undefined to remove body. */
  body?: BodyTransformer<TContext["input"]["body"]>;

  /** Transform form data before request. Return undefined to remove formData. */
  formData?: FormDataTransformer<TContext["input"]["formData"]>;

  /** Transform URL-encoded data before request. Return undefined to remove urlEncoded. */
  urlEncoded?: UrlEncodedTransformer<TContext["input"]["urlEncoded"]>;

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
