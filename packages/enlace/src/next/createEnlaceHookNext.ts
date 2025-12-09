"use client";

import type { EnlaceOptions, EnlaceResponse } from "enlace-core";
import { createEnlaceNext } from "./index";
import type {
  NextApiClient,
  NextEnlaceHook,
  NextHookOptions,
  NextQueryFn,
  NextSelectorFn,
} from "./types";
import type {
  TrackedCall,
  UseEnlaceQueryOptions,
  UseEnlaceQueryResult,
  UseEnlaceSelectorResult,
} from "../react/types";
import { useQueryMode } from "../react/useQueryMode";
import { useSelectorMode } from "../react/useSelectorMode";
import { createTrackingProxy } from "../react/trackingProxy";

/**
 * Creates a React hook for making API calls in Next.js Client Components.
 * Uses Next.js-specific features like revalidator for server-side cache invalidation.
 *
 * @example
 * const useAPI = createEnlaceHookNext<ApiSchema>('https://api.com', {}, {
 *   revalidator: (tags) => revalidateTagsAction(tags),
 *   staleTime: 5000,
 * });
 *
 * // Query mode - auto-fetch
 * const { loading, data, error } = useAPI((api) => api.posts.get());
 *
 * // Selector mode - trigger for mutations
 * const { trigger } = useAPI((api) => api.posts.delete);
 */
export function createEnlaceHookNext<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {},
  hookOptions: NextHookOptions = {}
): NextEnlaceHook<TSchema> {
  const {
    autoGenerateTags = true,
    autoRevalidateTags = true,
    staleTime = 0,
    ...nextOptions
  } = hookOptions;
  const api = createEnlaceNext<TSchema>(baseUrl, defaultOptions, {
    autoGenerateTags,
    autoRevalidateTags,
    ...nextOptions,
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
      | NextSelectorFn<TSchema, TMethod>
      | NextQueryFn<TSchema, TData, TError>,
    queryOptions?: UseEnlaceQueryOptions
  ): UseEnlaceSelectorResult<TMethod> | UseEnlaceQueryResult<TData, TError> {
    let trackedCall: TrackedCall | null = null;
    let selectorPath: string[] | null = null;
    let selectorMethod: string | null = null;

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackedCall = result.trackedCall;
      selectorPath = result.selectorPath;
      selectorMethod = result.selectorMethod;
    });

    const result = (
      selectorOrQuery as (api: NextApiClient<TSchema>) => unknown
    )(trackingProxy as NextApiClient<TSchema>);

    if (typeof result === "function") {
      const actualResult = (
        selectorOrQuery as (api: NextApiClient<TSchema>) => unknown
      )(api as NextApiClient<TSchema>);
      return useSelectorMode<TMethod>({
        method: actualResult as (
          ...args: unknown[]
        ) => Promise<EnlaceResponse<unknown, unknown>>,
        api,
        path: selectorPath ?? [],
        methodName: selectorMethod ?? "",
        autoRevalidateTags,
      });
    }

    return useQueryMode<TSchema, TData, TError>(
      api as unknown as import("../react/types").ApiClient<TSchema>,
      trackedCall!,
      { autoGenerateTags, staleTime, enabled: queryOptions?.enabled ?? true }
    );
  }

  return useEnlaceHook as NextEnlaceHook<TSchema>;
}
