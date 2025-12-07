import { useRef, useState, useEffect } from "react";
import type { EnlaceResponse } from "enlace-core";
import type {
  ApiClient,
  HookState,
  ReactRequestOptionsBase,
  TrackedCall,
  UseEnlaceQueryResult,
} from "./types";
import { HTTP_METHODS } from "./types";
import { generateTags } from "../utils/generateTags";
import { onRevalidate } from "./revalidator";
import {
  createQueryKey,
  getCache,
  setCache,
  subscribeCache,
  isStale,
} from "./cache";

export type TrackingResult = {
  trackedCall: TrackedCall | null;
  selectorPath: string[] | null;
  selectorMethod: string | null;
};

export function createTrackingProxy<TSchema>(
  onTrack: (result: TrackingResult) => void
): ApiClient<TSchema> {
  const createProxy = (path: string[] = []): unknown => {
    return new Proxy(() => {}, {
      get(_, prop: string) {
        if (HTTP_METHODS.includes(prop as (typeof HTTP_METHODS)[number])) {
          const methodFn = (options?: unknown) => {
            onTrack({
              trackedCall: { path, method: prop, options },
              selectorPath: null,
              selectorMethod: null,
            });
            return Promise.resolve({ ok: true, data: undefined });
          };
          onTrack({
            trackedCall: null,
            selectorPath: path,
            selectorMethod: prop,
          });
          return methodFn;
        }
        return createProxy([...path, prop]);
      },
    });
  };
  return createProxy() as ApiClient<TSchema>;
}

export type QueryModeOptions = {
  autoGenerateTags: boolean;
  staleTime: number;
};

export function useQueryMode<TSchema, TData, TError>(
  api: ApiClient<TSchema>,
  trackedCall: TrackedCall,
  options: QueryModeOptions
): UseEnlaceQueryResult<TData, TError> {
  const { autoGenerateTags, staleTime } = options;
  const queryKey = createQueryKey(trackedCall);

  const requestOptions = trackedCall.options as
    | ReactRequestOptionsBase
    | undefined;
  const queryTags =
    requestOptions?.tags ??
    (autoGenerateTags ? generateTags(trackedCall.path) : []);

  const getInitialState = (): HookState => {
    const cached = getCache<TData, TError>(queryKey);
    const hasCachedData = cached?.data !== undefined;
    const isFetching = !!cached?.promise;
    const needsFetch = !hasCachedData || isStale(queryKey, staleTime);
    return {
      loading: !hasCachedData && (isFetching || needsFetch),
      fetching: isFetching || needsFetch,
      ok: cached?.ok,
      data: cached?.data,
      error: cached?.error,
    };
  };

  const getCachedState = (): HookState => {
    const cached = getCache<TData, TError>(queryKey);
    const hasCachedData = cached?.data !== undefined;
    const isFetching = !!cached?.promise;
    return {
      loading: !hasCachedData && isFetching,
      fetching: isFetching,
      ok: cached?.ok,
      data: cached?.data,
      error: cached?.error,
    };
  };

  const [state, setState] = useState<HookState>(getInitialState);

  const mountedRef = useRef(true);
  const fetchRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    setState(getInitialState());

    const unsubscribe = subscribeCache(queryKey, () => {
      if (mountedRef.current) {
        setState(getCachedState());
      }
    });

    const doFetch = () => {
      const cached = getCache<TData, TError>(queryKey);

      if (cached?.promise) {
        return;
      }

      setState((s) => ({
        ...s,
        loading: s.data === undefined,
        fetching: true,
      }));

      let current: unknown = api;
      for (const segment of trackedCall.path) {
        current = (current as Record<string, unknown>)[segment];
      }
      const method = (current as Record<string, unknown>)[trackedCall.method] as (
        opts?: unknown
      ) => Promise<EnlaceResponse<TData, TError>>;

      const fetchPromise = method(trackedCall.options).then((res) => {
        if (mountedRef.current) {
          setCache<TData, TError>(queryKey, {
            data: res.ok ? res.data : undefined,
            error: res.ok ? undefined : res.error,
            ok: res.ok,
            timestamp: Date.now(),
            tags: queryTags,
          });
        }
      });

      setCache<TData, TError>(queryKey, {
        promise: fetchPromise,
        tags: queryTags,
      });
    };

    fetchRef.current = doFetch;

    const cached = getCache<TData, TError>(queryKey);
    if (cached?.data !== undefined && !isStale(queryKey, staleTime)) {
      setState(getCachedState());
    } else {
      doFetch();
    }

    return () => {
      mountedRef.current = false;
      fetchRef.current = null;
      unsubscribe();
    };
  }, [queryKey]);

  useEffect(() => {
    if (queryTags.length === 0) return;

    return onRevalidate((invalidatedTags) => {
      const hasMatch = invalidatedTags.some((tag) => queryTags.includes(tag));
      if (hasMatch && mountedRef.current && fetchRef.current) {
        fetchRef.current();
      }
    });
  }, [JSON.stringify(queryTags)]);

  return state as UseEnlaceQueryResult<TData, TError>;
}
