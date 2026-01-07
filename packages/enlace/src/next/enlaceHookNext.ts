"use client";

import type { EnlaceOptions, EnlaceResponse } from "enlace-core";
import { enlaceNext } from "./index";
import type {
  NextApiClient,
  NextEnlaceHooks,
  NextHookOptions,
  NextQueryFn,
  NextSelectorFn,
} from "./types";
import type {
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
} from "../react/types";
import {
  useAPIQueryImpl,
  type QueryModeOptions,
} from "../react/hooks/useAPIQuery";
import { useAPIMutationImpl } from "../react/hooks/useAPIMutation";
import {
  createTrackingProxy,
  type TrackingResult,
} from "../react/trackingProxy";

/**
 * Creates React hooks for making API calls in Next.js Client Components.
 * Returns a tuple of [useAPIQuery, useAPIMutation].
 *
 * @example
 * const [useAPIQuery, useAPIMutation] = enlaceHookNext<ApiSchema>('https://api.com', {}, {
 *   serverRevalidator: (tags) => revalidateTagsAction(tags),
 * });
 *
 * // Query - auto-fetch GET requests
 * const { loading, data, error } = useAPIQuery((api) => api.posts.$get());
 *
 * // Mutation - trigger-based mutations
 * const { trigger } = useAPIMutation((api) => api.posts.$delete);
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

  function useAPIQuery<TData, TError>(
    queryFn: NextQueryFn<TSchema, TData, TError, TDefaultError>,
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

    (queryFn as (api: NextApiClient<TSchema, TDefaultError>) => unknown)(
      trackingProxy as NextApiClient<TSchema, TDefaultError>
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
      api as unknown as import("../react/types").ApiClient<
        TSchema,
        TDefaultError
      >,
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
    selectorFn: NextSelectorFn<TSchema, TMethod, TDefaultError>
  ): UseEnlaceSelectorResult<TMethod> {
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

  return [useAPIQuery, useAPIMutation] as NextEnlaceHooks<
    TSchema,
    TDefaultError
  >;
}
