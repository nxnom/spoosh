import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { EnlaceResponse } from "enlace-core";
import type { ApiClient, HookState, UseEnlaceManualResult } from "./types";
import { HTTP_METHODS } from "./types";

function createStateTrackingProxy<TSchema>(
  api: ApiClient<TSchema>,
  setState: Dispatch<SetStateAction<HookState>>
): ApiClient<TSchema> {
  const createProxy = (path: string[] = []): unknown => {
    return new Proxy(() => {}, {
      get(_, prop: string) {
        if (HTTP_METHODS.includes(prop as (typeof HTTP_METHODS)[number])) {
          return async (options?: unknown) => {
            setState((s) => ({ ...s, loading: true }));
            let current: unknown = api;
            for (const segment of path) {
              current = (current as Record<string, unknown>)[segment];
            }
            const method = (current as Record<string, unknown>)[prop] as (
              opts?: unknown
            ) => Promise<EnlaceResponse<unknown, unknown>>;
            const result = await method(options);
            setState({
              loading: false,
              ok: result.ok,
              data: result.ok ? result.data : undefined,
              error: result.ok ? undefined : result.error,
            });
            return result;
          };
        }
        return createProxy([...path, prop]);
      },
    });
  };
  return createProxy() as ApiClient<TSchema>;
}

export function useManualMode<TSchema>(
  api: ApiClient<TSchema>
): UseEnlaceManualResult<TSchema> {
  const [state, setState] = useState<HookState>({
    loading: false,
    ok: undefined,
    data: undefined,
    error: undefined,
  });

  const clientRef = useRef<ApiClient<TSchema> | null>(null);

  if (!clientRef.current) {
    clientRef.current = createStateTrackingProxy(api, setState);
  }

  return {
    client: clientRef.current,
    ...state,
  } as UseEnlaceManualResult<TSchema>;
}
