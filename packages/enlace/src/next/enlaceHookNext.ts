"use client";

import type { EnlaceOptions, EnlaceResponse } from "enlace-core";
import { enlaceNext } from "./index";
import type {
  NextApiClient,
  NextEnlaceHooks,
  NextHookOptions,
  NextReadFn,
  NextWriteSelectorFn,
  NextInfiniteReadFn,
} from "./types";
import type {
  UseEnlaceReadOptions,
  UseEnlaceReadResult,
  UseEnlaceWriteResult,
  UseEnlaceInfiniteReadOptions,
  UseEnlaceInfiniteReadResult,
} from "../react/types";
import { useReadImpl, type ReadModeOptions } from "../react/hooks/useRead";
import { useWriteImpl } from "../react/hooks/useWrite";
import {
  useInfiniteReadImpl,
  type InfiniteReadModeOptions,
} from "../react/hooks/useInfiniteRead";
import {
  createTrackingProxy,
  type TrackingResult,
} from "../react/trackingProxy";

/**
 * Creates React hooks for making API calls in Next.js Client Components.
 * Returns { useRead, useWrite, useInfiniteRead }.
 *
 * @example
 * const { useRead, useWrite, useInfiniteRead } = enlaceHookNext<ApiSchema>('https://api.com', {}, {
 *   serverRevalidator: (tags) => revalidateTagsAction(tags),
 * });
 *
 * // Read - auto-fetch GET requests
 * const { loading, data, error } = useRead((api) => api.posts.$get());
 *
 * // Write - trigger-based mutations
 * const { trigger } = useWrite((api) => api.posts.$delete);
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
export function enlaceHookNext<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: NextHookOptions = {}
): NextEnlaceHooks<TSchema, TDefaultError> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    retry,
    retryDelay,
    ...nextOptions
  } = hookOptions;

  const api = enlaceNext<TSchema, TDefaultError>(baseUrl, defaultOptions, {
    autoGenerateTags,
    autoRevalidateTags,
    ...nextOptions,
  });

  function useRead<TData, TError>(
    readFn: NextReadFn<TSchema, TData, TError, TDefaultError>,
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

    (readFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as NextApiClient<TSchema, TDefaultError>
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
      api as unknown as import("../react/types").ApiClient<
        TSchema,
        TDefaultError
      >,
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
    selectorFn: NextWriteSelectorFn<TSchema, TMethod, TDefaultError>
  ): UseEnlaceWriteResult<TMethod> {
    let trackingResult: TrackingResult = {
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    };

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResult = result;
    });

    (selectorFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as NextApiClient<TSchema, TDefaultError>
    );

    const actualMethod = (
      selectorFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown
    )(api as NextApiClient<TSchema, TDefaultError>);

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
    readFn: NextInfiniteReadFn<TSchema, TDefaultError>,
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

    (readFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as NextApiClient<TSchema, TDefaultError>
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
      api as unknown as import("../react/types").ApiClient<
        TSchema,
        TDefaultError
      >,
      trackingResult.trackedCall,
      options as unknown as InfiniteReadModeOptions<TData, TItem>
    );
  }

  return {
    useRead,
    useWrite,
    useInfiniteRead,
  } as NextEnlaceHooks<TSchema, TDefaultError>;
}
