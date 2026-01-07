export { type EnlaceOptions, type EnlaceCallbacks } from "enlace-core";
import type {
  EnlaceCallbacks,
  EnlaceResponse,
  MethodOptionsMap,
  MutationOnlyClient,
  QueryOnlyClient,
  WildcardMutationClient,
  WildcardQueryClient,
} from "enlace-core";
import type {
  ApiClient,
  EnlaceHookOptions,
  MutationRequestOptions,
  QueryRequestOptions,
} from "../react/types";

export type ServerRevalidateHandler = (
  tags: string[],
  paths: string[]
) => void | Promise<void>;

export type NextOptions = Pick<
  EnlaceHookOptions,
  "autoGenerateTags" | "autoRevalidateTags"
> &
  EnlaceCallbacks & {
    serverRevalidator?: ServerRevalidateHandler;
    skipServerRevalidation?: boolean;
  };

export type NextHookOptions = EnlaceHookOptions &
  Pick<NextOptions, "serverRevalidator" | "skipServerRevalidation">;

export type NextQueryRequestOptions = QueryRequestOptions & {
  revalidate?: number | false;
};

export type NextMutationRequestOptions = MutationRequestOptions & {
  revalidatePaths?: string[];
  serverRevalidate?: boolean;
};

export type NextOptionsMap = MethodOptionsMap<
  NextQueryRequestOptions,
  NextMutationRequestOptions
>;

export type NextRequestOptionsBase = NextQueryRequestOptions &
  NextMutationRequestOptions;

export type NextApiClient<TSchema, TDefaultError = unknown> = ApiClient<
  TSchema,
  TDefaultError,
  NextOptionsMap
>;

export type NextReadApiClient<
  TSchema,
  TDefaultError = unknown,
> = unknown extends TSchema
  ? WildcardQueryClient<NextOptionsMap>
  : QueryOnlyClient<TSchema, TDefaultError, NextOptionsMap>;

export type NextWriteApiClient<
  TSchema,
  TDefaultError = unknown,
> = unknown extends TSchema
  ? WildcardMutationClient<NextOptionsMap>
  : MutationOnlyClient<TSchema, TDefaultError, NextOptionsMap>;

export type NextReadFn<TSchema, TData, TError, TDefaultError = unknown> = (
  api: NextReadApiClient<TSchema, TDefaultError>
) => Promise<EnlaceResponse<TData, TError>>;

export type NextWriteSelectorFn<TSchema, TMethod, TDefaultError = unknown> = (
  api: NextWriteApiClient<TSchema, TDefaultError>
) => TMethod;

export type NextUseRead<TSchema, TDefaultError = unknown> = <TData, TError>(
  readFn: NextReadFn<TSchema, TData, TError, TDefaultError>,
  options?: import("../react/types").UseEnlaceReadOptions<TData, TError>
) => import("../react/types").UseEnlaceReadResult<TData, TError>;

export type NextUseWrite<TSchema, TDefaultError = unknown> = <
  TMethod extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  selectorFn: NextWriteSelectorFn<TSchema, TMethod, TDefaultError>
) => import("../react/types").UseEnlaceWriteResult<TMethod>;

export type NextInfiniteReadFn<TSchema, TDefaultError = unknown> = (
  api: NextReadApiClient<TSchema, TDefaultError>
) => Promise<EnlaceResponse<unknown, unknown, unknown>>;

type InferData<T> =
  T extends Promise<EnlaceResponse<infer D, unknown, unknown>> ? D : unknown;

type InferError<T> =
  T extends Promise<EnlaceResponse<unknown, infer E, unknown>> ? E : unknown;

type PickOnlyRequestOptions<T> = Pick<
  T,
  Extract<keyof T, "query" | "params" | "body">
>;

type MakePartialRequest<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? Partial<T[K]> : T[K];
};

type InferRequest<T> =
  T extends Promise<EnlaceResponse<unknown, unknown, infer R>>
    ? PickOnlyRequestOptions<R>
    : import("../react/types").AnyInfiniteRequestOptions;

type InferPartialRequest<T> =
  T extends Promise<EnlaceResponse<unknown, unknown, infer R>>
    ? MakePartialRequest<PickOnlyRequestOptions<R>>
    : import("../react/types").AnyInfiniteRequestOptions;

export type NextUseInfiniteRead<TSchema, TDefaultError = unknown> = <
  TReturn extends Promise<EnlaceResponse<unknown, unknown, unknown>>,
  TData = InferData<TReturn>,
  TError = InferError<TReturn>,
  TRequest = InferRequest<TReturn>,
  TPartialRequest = InferPartialRequest<TReturn>,
  TItem = TData extends Array<infer U> ? U : TData,
>(
  readFn: (api: NextReadApiClient<TSchema, TDefaultError>) => TReturn,
  options: import("../react/types").UseEnlaceInfiniteReadOptions<
    TData,
    TItem,
    TRequest,
    TPartialRequest
  >
) => import("../react/types").UseEnlaceInfiniteReadResult<TData, TError, TItem>;

export type NextEnlaceHooks<TSchema, TDefaultError = unknown> = {
  useRead: NextUseRead<TSchema, TDefaultError>;
  useWrite: NextUseWrite<TSchema, TDefaultError>;
  useInfiniteRead: NextUseInfiniteRead<TSchema, TDefaultError>;
};
