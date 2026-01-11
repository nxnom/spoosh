export const HTTP_METHODS = [
  "$get",
  "$post",
  "$put",
  "$patch",
  "$delete",
] as const;

export type HttpMethodKey = (typeof HTTP_METHODS)[number];

export type TrackedCall = {
  path: string[];
  method: string;
  options: unknown;
};

export type TrackingResult = {
  trackedCall: TrackedCall | null;
  selectorPath: string[] | null;
  selectorMethod: string | null;
};

export const SELECTOR_PATH_KEY = Symbol("selectorPath");

export type MethodWithPath = {
  [SELECTOR_PATH_KEY]?: string[];
};

/**
 * Creates a proxy that tracks API access patterns without executing actual requests.
 * Used by framework adapters (React, Vue, etc.) to capture:
 * - Path segments (e.g., ['users', ':id', 'posts'])
 * - HTTP method ($get, $post, etc.)
 * - Request options (query, body, params, etc.)
 *
 * @example
 * ```ts
 * const proxy = createTrackingProxy((result) => {
 *   console.log(result.trackedCall);
 *   // { path: ['posts'], method: '$get', options: { query: { page: 1 } } }
 * });
 *
 * // Simulate: api.posts.$get({ query: { page: 1 } })
 * proxy.posts.$get({ query: { page: 1 } });
 * ```
 */
export function createTrackingProxy<TApi = unknown>(
  onTrack: (result: TrackingResult) => void
): TApi {
  const createProxy = (path: string[] = []): unknown => {
    return new Proxy(() => {}, {
      get(_, prop: string) {
        if (HTTP_METHODS.includes(prop as HttpMethodKey)) {
          const methodFn = (options?: unknown) => {
            onTrack({
              trackedCall: { path, method: prop, options },
              selectorPath: null,
              selectorMethod: null,
            });

            return Promise.resolve({
              status: 200,
              data: undefined,
              error: undefined,
            });
          };

          (methodFn as unknown as MethodWithPath)[SELECTOR_PATH_KEY] = path;

          onTrack({
            trackedCall: null,
            selectorPath: path,
            selectorMethod: prop,
          });

          return methodFn;
        }

        return createProxy([...path, prop]);
      },

      apply(_, __, args: [string]) {
        const [segment] = args;

        return createProxy([...path, segment]);
      },
    });
  };

  return createProxy() as TApi;
}
