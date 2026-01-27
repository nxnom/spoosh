import type { Simplify } from "@spoosh/core";

type IsNever<T> = [T] extends [never] ? true : false;

type ElysiaMethod = "get" | "post" | "put" | "patch" | "delete" | "head";

type BodyMethod = "post" | "put" | "patch" | "delete";

type SpooshMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type MapMethodToSpoosh<M extends ElysiaMethod> = M extends "get" | "head"
  ? "GET"
  : M extends "post"
    ? "POST"
    : M extends "put"
      ? "PUT"
      : M extends "patch"
        ? "PATCH"
        : M extends "delete"
          ? "DELETE"
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

type ClientEndpointToFlat<TData, TBody, TQuery> = Simplify<
  { data: TData } & BodyField<TBody> & QueryField<TQuery>
>;

type MethodToFlatEndpoint<T, M extends string> = T extends (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => any
  ? ClientEndpointToFlat<
      ExtractTreatyData<Awaited<ReturnType<T>>>,
      ExtractTreatyBody<T, M>,
      ExtractTreatyQuery<T, M>
    >
  : never;

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

type TransformTreatyMethods<T> = {
  [K in keyof T as K extends ElysiaMethod
    ? MapMethodToSpoosh<K>
    : never]: K extends string ? MethodToFlatEndpoint<T[K], K> : never;
};

type JoinPath<A extends string, B extends string> = A extends ""
  ? B
  : `${A}/${B}`;

type TransformTreatyToFlatImpl<
  T,
  Path extends string = "",
> = (HasAnyMethod<T> extends true
  ? { [P in Path]: TransformTreatyMethods<T> }
  : object) &
  (IsDynamicRoute<T> extends true
    ? TransformTreatyToFlat<ExtractDynamicRouteReturn<T>, JoinPath<Path, ":id">>
    : object) &
  (NonIndexKeys<T> extends never
    ? object
    : UnionToIntersection<
        {
          [K in NonIndexKeys<T>]: TransformTreatyToFlat<
            T[K],
            JoinPath<Path, K & string>
          >;
        }[NonIndexKeys<T>]
      >);

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type TransformTreatyToFlat<
  T,
  Path extends string = "",
> = TransformTreatyToFlatImpl<FlattenIndex<T>, Path>;

/**
 * Transforms Eden Treaty client type into Spoosh flat schema format.
 *
 * @example
 * ```typescript
 * import { treaty } from '@elysiajs/eden';
 * import type { ElysiaToSpoosh } from '@spoosh/elysia';
 * import type { App } from './server';
 *
 * type Client = ReturnType<typeof treaty<App>>;
 * type ApiSchema = ElysiaToSpoosh<Client>;
 *
 * const api = createClient<ApiSchema>({ baseUrl: "/api" });
 * await api("users").GET();
 * await api("users/:id").GET({ params: { id: 123 } });
 * ```
 */
export type ElysiaToSpoosh<T> = Simplify<TransformTreatyToFlat<T>>;
