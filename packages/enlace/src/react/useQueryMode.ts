import { useRef, useState, useEffect } from "react";
import type { EnlaceResponse } from "enlace-core";
import type { ApiClient, HookState, TrackedCall, UseEnlaceQueryResult } from "./types";
import { HTTP_METHODS } from "./types";

function createQueryKey(tracked: TrackedCall): string {
  return JSON.stringify({
    path: tracked.path,
    method: tracked.method,
    options: tracked.options,
  });
}

export function createTrackingProxy<TSchema>(
  onTrack: (tracked: TrackedCall) => void
): ApiClient<TSchema> {
  const createProxy = (path: string[] = []): unknown => {
    return new Proxy(() => {}, {
      get(_, prop: string) {
        if (HTTP_METHODS.includes(prop as (typeof HTTP_METHODS)[number])) {
          return (options?: unknown) => {
            onTrack({ path, method: prop, options });
            return Promise.resolve({ ok: true, data: undefined });
          };
        }
        return createProxy([...path, prop]);
      },
    });
  };
  return createProxy() as ApiClient<TSchema>;
}

export function useQueryMode<TSchema, TData, TError>(
  api: ApiClient<TSchema>,
  trackedCall: TrackedCall
): UseEnlaceQueryResult<TData, TError> {
  const [state, setState] = useState<HookState>({
    loading: false,
    ok: undefined,
    data: undefined,
    error: undefined,
  });

  const queryKey = createQueryKey(trackedCall);
  const prevKeyRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (isFetchingRef.current) return;
    if (prevKeyRef.current === queryKey) return;

    prevKeyRef.current = queryKey;
    isFetchingRef.current = true;

    setState((s) => ({ ...s, loading: true }));

    let current: unknown = api;
    for (const segment of trackedCall.path) {
      current = (current as Record<string, unknown>)[segment];
    }
    const method = (current as Record<string, unknown>)[trackedCall.method] as (
      opts?: unknown
    ) => Promise<EnlaceResponse<unknown, unknown>>;

    method(trackedCall.options).then((res) => {
      isFetchingRef.current = false;
      setState({
        loading: false,
        ok: res.ok,
        data: res.ok ? res.data : undefined,
        error: res.ok ? undefined : res.error,
      });
    });
  }, [queryKey]);

  return state as UseEnlaceQueryResult<TData, TError>;
}
