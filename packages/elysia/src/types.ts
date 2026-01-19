import type { Endpoint } from "@spoosh/core";

type Simplify<T> = { [K in keyof T]: T[K] } & {};

type IsNever<T> = [T] extends [never] ? true : false;

type ElysiaMethod = "get" | "post" | "put" | "patch" | "delete" | "head";

type BodyMethod = "post" | "put" | "patch" | "delete";

type SpooshMethod = "$get" | "$post" | "$put" | "$patch" | "$delete";

type MapMethodToSpoosh<M extends ElysiaMethod> = M extends "get" | "head"
  ? "$get"
  : M extends "post"
    ? "$post"
    : M extends "put"
      ? "$put"
      : M extends "patch"
        ? "$patch"
        : M extends "delete"
          ? "$delete"
          : never;

type ExtractTreatyData<T> = T extends { data: infer D; error: null }
  ? D
  : T extends { data: infer D }
    ? D
    : never;

type ExtractTreatyBody<T, M extends string> = M extends BodyMethod
  ? T extends (
      body: infer B,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options?: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => any
    ? IsNever<B> extends true
      ? never
      : undefined extends B
        ? never
        : B
    : never
  : never;

type ExtractTreatyOptions<T, M extends string> = M extends BodyMethod
  ? T extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: any,
      options?: infer O
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => any
    ? O
    : never
  : T extends (
        options?: infer O
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) => any
    ? O
    : T extends (
          options: infer O
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) => any
      ? O
      : never;

type ExtractTreatyQuery<T, M extends string> =
  ExtractTreatyOptions<T, M> extends infer O
    ? O extends { query: infer Q }
      ? undefined extends Q
        ? never
        : Q
      : never
    : never;

type BodyField<T> = IsNever<T> extends true ? object : { body: T };

type QueryField<T> = IsNever<T> extends true ? object : { query: T };

type ClientEndpointToSpoosh<TData, TBody, TQuery> = Endpoint<
  Simplify<{ data: TData } & BodyField<TBody> & QueryField<TQuery>>
>;

type MethodToSpooshEndpoint<T, M extends string> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => any
  ? ClientEndpointToSpoosh<
      ExtractTreatyData<Awaited<ReturnType<T>>>,
      ExtractTreatyBody<T, M>,
      ExtractTreatyQuery<T, M>
    >
  : never;

type TransformTreatyMethods<T> = {
  [K in keyof T as K extends ElysiaMethod
    ? MapMethodToSpoosh<K>
    : never]: K extends string ? MethodToSpooshEndpoint<T[K], K> : never;
};

type HasMethodKey<T, K extends ElysiaMethod> = K extends keyof T ? true : false;

type HasAnyMethod<T> =
  | HasMethodKey<T, "get">
  | HasMethodKey<T, "post">
  | HasMethodKey<T, "put">
  | HasMethodKey<T, "patch">
  | HasMethodKey<T, "delete"> extends false
  ? false
  : true;

type IsDynamicRouteFunction<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => any
  ? Parameters<T>[0] extends Record<string, string | number>
    ? true
    : false
  : false;

type ExtractDynamicRouteReturn<T> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => any
  ? ReturnType<T>
  : never;

type IsDynamicRoute<T> = IsDynamicRouteFunction<T>;

type FlattenIndex<T> = T extends { index: infer I } ? Omit<T, "index"> & I : T;

type NonIndexKeys<T> = {
  [K in keyof T]: K extends "index" | ElysiaMethod | SpooshMethod ? never : K;
}[keyof T];

type TransformTreatyClientImpl<T> = (HasAnyMethod<T> extends true
  ? TransformTreatyMethods<T>
  : object) &
  (IsDynamicRoute<T> extends true
    ? { _: TransformTreatyClient<ExtractDynamicRouteReturn<T>> }
    : object) &
  (NonIndexKeys<T> extends never
    ? object
    : {
        [K in NonIndexKeys<T>]: TransformTreatyClient<T[K]>;
      });

type TransformTreatyClient<T> = TransformTreatyClientImpl<FlattenIndex<T>>;

/**
 * Transforms Eden Treaty client type into Spoosh schema format.
 *
 * @example
 * ```typescript
 * import { treaty } from '@elysiajs/eden';
 * import type { ElysiaToSpoosh } from '@spoosh/elysia';
 * import type { App } from './server';
 *
 * type Client = ReturnType<typeof treaty<App>>;
 * type ApiSchema = ElysiaToSpoosh<Client>;
 * ```
 */
export type ElysiaToSpoosh<T> = Simplify<TransformTreatyClient<T>>;
