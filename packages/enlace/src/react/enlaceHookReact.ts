import { enlace, type EnlaceOptions, type EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  EnlaceHookOptions,
  EnlaceHooks,
  QueryFn,
  SelectorFn,
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
} from "./types";
import { useAPIQueryImpl, type QueryModeOptions } from "./hooks/useAPIQuery";
import { useAPIMutationImpl } from "./hooks/useAPIMutation";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";

/**
 * Creates React hooks for making API calls.
 * Returns a tuple of [useAPIQuery, useAPIMutation].
 *
 * @example
 * const [useAPIQuery, useAPIMutation] = enlaceHookReact<ApiSchema>('https://api.com');
 *
 * // Query - auto-fetch GET requests
 * const { loading, data, error } = useAPIQuery((api) => api.posts.$get({ query: { userId } }));
 *
 * // Mutation - trigger-based mutations
 * const { trigger, loading } = useAPIMutation((api) => api.posts.$delete);
 * onClick={() => trigger({ body: { id: 1 } })}
 */
export function enlaceHookReact<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: EnlaceHookOptions = {}
): EnlaceHooks<TSchema, TDefaultError> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    onSuccess,
    onError,
    retry,
    retryDelay,
  } = hookOptions;

  const api = enlace<TSchema, TDefaultError>(baseUrl, defaultOptions, {
    onSuccess,
    onError,
  });

  function useAPIQuery<TData, TError>(
    queryFn: QueryFn<TSchema, TData, TError, TDefaultError>,
    queryOptions?: UseEnlaceQueryOptions<TData, TError>
  ): UseEnlaceQueryResult<TData, TError> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (queryFn as (api: ApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as ApiClient<TSchema, TDefaultError>
    );

    if (!trackingResult.trackedCall) {
      throw new Error(
        "useAPIQuery requires calling an HTTP method ($get). " +
          "Example: useAPIQuery((api) => api.posts.$get())"
      );
    }

    const options: QueryModeOptions<TData, TError> = {
      autoGenerateTags,
      staleTime,
      enabled: queryOptions?.enabled ?? true,
      pollingInterval: queryOptions?.pollingInterval,
      retry: queryOptions?.retry ?? retry,
      retryDelay: queryOptions?.retryDelay ?? retryDelay,
    };

    return useAPIQueryImpl<TSchema, TData, TError>(
      api as ApiClient<TSchema, TDefaultError>,
      trackingResult.trackedCall,
      options
    );
  }

  function useAPIMutation<
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selectorFn: SelectorFn<TSchema, TMethod, TDefaultError>
  ): UseEnlaceSelectorResult<TMethod> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (selectorFn as (api: ApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as ApiClient<TSchema, TDefaultError>
    );

    const actualMethod = (
      selectorFn as (api: ApiClient<TSchema, TDefaultError>) => unknown
    )(api as ApiClient<TSchema, TDefaultError>);

    return useAPIMutationImpl<TMethod>({
      method: actualMethod as (
        ...args: unknown[]
      ) => Promise<EnlaceResponse<unknown, unknown>>,
      api,
      path: trackingResult.selectorPath ?? [],
      methodName: trackingResult.selectorMethod ?? "",
      autoRevalidateTags,
      retry,
      retryDelay,
    });
  }

  return [useAPIQuery, useAPIMutation] as EnlaceHooks<TSchema, TDefaultError>;
}
