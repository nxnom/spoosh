import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type DependencyList,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  createEnlace,
  type EnlaceClient,
  type EnlaceOptions,
  type EnlaceResponse,
  type WildcardClient,
} from "enlace-core";
import type { UseEnlaceManualResult, UseEnlaceQueryResult } from "./types";

type ApiClient<TSchema> = unknown extends TSchema
  ? WildcardClient<object>
  : EnlaceClient<TSchema, object>;

type QueryFn<TSchema, TData, TError> = (
  api: ApiClient<TSchema>
) => Promise<EnlaceResponse<TData, TError>>;

type HookState = {
  loading: boolean;
  ok: boolean | undefined;
  data: unknown;
  error: unknown;
};

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

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

/**
 * Creates a React hook for making API calls.
 * Called at module level to create a reusable hook.
 *
 * @example
 * const useAPI = createEnlaceHook<ApiSchema>('https://api.com');
 *
 * // Query mode - auto-fetch
 * const { loading, data, error } = useAPI((api) => api.posts.get(), []);
 *
 * // Manual mode - for lazy queries and mutations
 * const { client, loading, data, ok, error } = useAPI();
 * onClick={() => client.posts.post({ body: {...} })}
 */
export function createEnlaceHook<TSchema = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions = {}
) {
  const api = createEnlace<TSchema>(baseUrl, defaultOptions);

  function useEnlaceHook(): UseEnlaceManualResult<TSchema, object>;
  function useEnlaceHook<TData, TError>(
    queryFn: QueryFn<TSchema, TData, TError>,
    deps?: DependencyList
  ): UseEnlaceQueryResult<TData, TError>;
  function useEnlaceHook<TData, TError>(
    queryFn?: QueryFn<TSchema, TData, TError>,
    deps: DependencyList = []
  ):
    | UseEnlaceManualResult<TSchema, object>
    | UseEnlaceQueryResult<TData, TError> {
    const [state, setState] = useState<HookState>({
      loading: !!queryFn,
      ok: undefined,
      data: undefined,
      error: undefined,
    });

    const clientRef = useRef<ApiClient<TSchema> | null>(null);

    if (!queryFn) {
      if (!clientRef.current) {
        clientRef.current = createStateTrackingProxy(
          api as ApiClient<TSchema>,
          setState
        );
      }
      return {
        client: clientRef.current,
        ...state,
      } as UseEnlaceManualResult<TSchema, object>;
    }

    const execute = useCallback(async () => {
      setState((s) => ({ ...s, loading: true }));
      const result = await queryFn(api as ApiClient<TSchema>);
      setState({
        loading: false,
        ok: result.ok,
        data: result.ok ? result.data : undefined,
        error: result.ok ? undefined : result.error,
      });
    }, deps);

    useEffect(() => {
      execute();
    }, [execute]);

    return state as UseEnlaceQueryResult<TData, TError>;
  }

  return useEnlaceHook;
}
