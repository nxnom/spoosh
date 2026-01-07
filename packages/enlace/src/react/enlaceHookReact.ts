import { enlace, type EnlaceOptions, type EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  EnlaceHookOptions,
  EnlaceHooks,
  ReadFn,
  WriteSelectorFn,
  UseEnlaceReadOptions,
  UseEnlaceReadResult,
  UseEnlaceWriteResult,
  InfiniteReadFn,
  UseEnlaceInfiniteReadOptions,
  UseEnlaceInfiniteReadResult,
} from "./types";
import { useReadImpl, type ReadModeOptions } from "./hooks/useRead";
import { useWriteImpl } from "./hooks/useWrite";
import {
  useInfiniteReadImpl,
  type InfiniteReadModeOptions,
} from "./hooks/useInfiniteRead";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";

/**
 * Creates React hooks for making API calls.
 * Returns { useRead, useWrite, useInfiniteRead }.
 *
 * @example
 * const { useRead, useWrite, useInfiniteRead } = enlaceHookReact<ApiSchema>('https://api.com');
 *
 * // Read - auto-fetch GET requests
 * const { loading, data, error } = useRead((api) => api.posts.$get({ query: { userId } }));
 *
 * // Write - trigger-based mutations
 * const { trigger, loading } = useWrite((api) => api.posts.$delete);
 * onClick={() => trigger({ body: { id: 1 } })}
 *
 * // Infinite Read - paginated data with fetchNext/fetchPrev
 * const { data, fetchNext, canFetchNext } = useInfiniteRead(
 *   (api) => api.posts.$get({ query: { limit: 10 } }),
 *   {
 *     canFetchNext: ({ response }) => response?.hasMore ?? false,
 *     nextPageRequest: ({ response }) => ({ query: { cursor: response?.nextCursor } }),
 *     merger: (allResponses) => allResponses.flatMap(r => r.items),
 *   }
 * );
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

  function useRead<TData, TError>(
    readFn: ReadFn<TSchema, TData, TError, TDefaultError>,
    readOptions?: UseEnlaceReadOptions<TData, TError>
  ): UseEnlaceReadResult<TData, TError> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (readFn as (api: ApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as ApiClient<TSchema, TDefaultError>
    );

    if (!trackingResult.trackedCall) {
      throw new Error(
        "useRead requires calling an HTTP method ($get). " +
          "Example: useRead((api) => api.posts.$get())"
      );
    }

    const options: ReadModeOptions<TData, TError> = {
      autoGenerateTags,
      staleTime,
      enabled: readOptions?.enabled ?? true,
      pollingInterval: readOptions?.pollingInterval,
      retry: readOptions?.retry ?? retry,
      retryDelay: readOptions?.retryDelay ?? retryDelay,
    };

    return useReadImpl<TSchema, TData, TError>(
      api as ApiClient<TSchema, TDefaultError>,
      trackingResult.trackedCall,
      options
    );
  }

  function useWrite<
    TMethod extends (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    selectorFn: WriteSelectorFn<TSchema, TMethod, TDefaultError>
  ): UseEnlaceWriteResult<TMethod> {
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

    return useWriteImpl<TMethod>({
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

  function useInfiniteRead<
    TData,
    TError,
    TItem = TData extends Array<infer U> ? U : TData,
    TRequest = unknown,
  >(
    readFn: InfiniteReadFn<TSchema, TDefaultError>,
    readOptions: UseEnlaceInfiniteReadOptions<TData, TItem, TRequest>
  ): UseEnlaceInfiniteReadResult<TData, TError, TItem> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (readFn as (api: ApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as ApiClient<TSchema, TDefaultError>
    );

    if (!trackingResult.trackedCall) {
      throw new Error(
        "useInfiniteRead requires calling an HTTP method ($get, $post, etc). " +
          "Example: useInfiniteRead((api) => api.posts.$get({ query: { limit: 10 } }), options)"
      );
    }

    const options = {
      autoGenerateTags,
      staleTime,
      ...readOptions,
      enabled: readOptions.enabled ?? true,
      retry: readOptions.retry ?? retry,
      retryDelay: readOptions.retryDelay ?? retryDelay,
    };

    return useInfiniteReadImpl<TSchema, TData, TError, TItem>(
      api as ApiClient<TSchema, TDefaultError>,
      trackingResult.trackedCall,
      options as unknown as InfiniteReadModeOptions<TData, TItem>
    );
  }

  return {
    useRead,
    useWrite,
    useInfiniteRead,
  } as EnlaceHooks<TSchema, TDefaultError>;
}
