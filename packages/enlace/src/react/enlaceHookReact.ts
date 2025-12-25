import {
  enlace,
  type EnlaceOptions,
  type EnlaceResponse,
} from "enlace-core";
import type {
  ApiClient,
  EnlaceHook,
  EnlaceHookOptions,
  QueryFn,
  SelectorFn,
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
} from "./types";
import { useQueryMode } from "./useQueryMode";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";
import { useSelectorMode } from "./useSelectorMode";

/**
 * Creates a React hook for making API calls.
 * Called at module level to create a reusable hook.
 *
 * @example
 * const useAPI = enlaceHookReact<ApiSchema>('https://api.com');
 *
 * // Query mode - auto-fetch (auto-tracks changes, no deps array needed)
 * const { loading, data, error } = useAPI((api) => api.posts.get({ query: { userId } }));
 *
 * // Selector mode - typed trigger for lazy calls
 * const { trigger, loading, data, error } = useAPI((api) => api.posts.delete);
 * onClick={() => trigger({ body: { id: 1 } })}
 */
export function enlaceHookReact<
  TSchema = unknown,
  TDefaultError = unknown,
>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: EnlaceHookOptions = {}
): EnlaceHook<TSchema, TDefaultError> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    onSuccess,
    onError,
  } = hookOptions;
  const api = enlace<TSchema, TDefaultError>(baseUrl, defaultOptions, {
    onSuccess,
    onError,
  });

  function useEnlaceHook<
    TData,
    TError,
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for method type inference
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selectorOrQuery:
      | SelectorFn<TSchema, TMethod, TDefaultError>
      | QueryFn<TSchema, TData, TError, TDefaultError>,
    queryOptions?: UseEnlaceQueryOptions<TData, TError>
  ): UseEnlaceSelectorResult<TMethod> | UseEnlaceQueryResult<TData, TError> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };
    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    const result = (
      selectorOrQuery as (api: ApiClient<TSchema, TDefaultError>) => unknown
    )(trackingProxy as ApiClient<TSchema, TDefaultError>);

    if (typeof result === "function") {
      const actualResult = (
        selectorOrQuery as (api: ApiClient<TSchema, TDefaultError>) => unknown
      )(api as ApiClient<TSchema, TDefaultError>);
      return useSelectorMode<TMethod>({
        method: actualResult as (
          ...args: unknown[]
        ) => Promise<EnlaceResponse<unknown, unknown>>,
        api,
        path: trackingResult.selectorPath ?? [],
        methodName: trackingResult.selectorMethod ?? "",
        autoRevalidateTags,
      });
    }

    if (!trackingResult.trackedCall) {
      throw new Error(
        "useAPI query mode requires calling an HTTP method (get, post, etc.). " +
          "Did you mean to use selector mode? Example: useAPI((api) => api.posts.get())"
      );
    }

    return useQueryMode<TSchema, TData, TError>(
      api as ApiClient<TSchema, TDefaultError>,
      trackingResult.trackedCall,
      {
        autoGenerateTags,
        staleTime,
        enabled: queryOptions?.enabled ?? true,
        pollingInterval: queryOptions?.pollingInterval,
      }
    );
  }

  return useEnlaceHook as EnlaceHook<TSchema, TDefaultError>;
}
