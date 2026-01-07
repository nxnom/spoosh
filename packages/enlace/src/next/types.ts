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

export type NextQueryApiClient<
  TSchema,
  TDefaultError = unknown,
> = unknown extends TSchema
  ? WildcardQueryClient<NextOptionsMap>
  : QueryOnlyClient<TSchema, TDefaultError, NextOptionsMap>;

export type NextMutationApiClient<
  TSchema,
  TDefaultError = unknown,
> = unknown extends TSchema
  ? WildcardMutationClient<NextOptionsMap>
  : MutationOnlyClient<TSchema, TDefaultError, NextOptionsMap>;

export type NextQueryFn<TSchema, TData, TError, TDefaultError = unknown> = (
  api: NextQueryApiClient<TSchema, TDefaultError>
) => Promise<EnlaceResponse<TData, TError>>;

export type NextSelectorFn<TSchema, TMethod, TDefaultError = unknown> = (
  api: NextMutationApiClient<TSchema, TDefaultError>
) => TMethod;

export type NextUseAPIQuery<TSchema, TDefaultError = unknown> = <TData, TError>(
  queryFn: NextQueryFn<TSchema, TData, TError, TDefaultError>,
  options?: import("../react/types").UseEnlaceQueryOptions<TData, TError>
) => import("../react/types").UseEnlaceQueryResult<TData, TError>;

export type NextUseAPIMutation<TSchema, TDefaultError = unknown> = <
  TMethod extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  selectorFn: NextSelectorFn<TSchema, TMethod, TDefaultError>
) => import("../react/types").UseEnlaceSelectorResult<TMethod>;

export type NextEnlaceHooks<TSchema, TDefaultError = unknown> = [
  NextUseAPIQuery<TSchema, TDefaultError>,
  NextUseAPIMutation<TSchema, TDefaultError>,
];
