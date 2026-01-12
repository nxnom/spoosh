import { executeFetch } from "../fetch";
import type {
  AnyRequestOptions,
  SpooshOptions,
  FetchExecutor,
  HttpMethod,
} from "../types";

const HTTP_METHODS: Record<string, HttpMethod> = {
  $get: "GET",
  $post: "POST",
  $put: "PUT",
  $patch: "PATCH",
  $delete: "DELETE",
};

/**
 * Creates the real API client proxy that executes actual HTTP requests.
 *
 * This proxy intercepts property access and function calls to build URL paths,
 * then executes fetch requests when an HTTP method ($get, $post, etc.) is called.
 *
 * Used internally by `createClient` and `createSpoosh` to create typed API clients.
 *
 * @param baseUrl - The base URL for all API requests
 * @param defaultOptions - Default options applied to every request
 * @param path - Current path segments (used internally for recursion)
 * @param fetchExecutor - Function that executes the actual fetch request
 *
 * @returns A proxy object typed as TSchema that executes real HTTP requests
 *
 * @example
 * ```ts
 * const api = createProxyHandler<ApiSchema>('/api', {});
 *
 * // Accessing api.posts.$get() will:
 * // 1. Build path: ['posts']
 * // 2. Execute: GET /api/posts
 * await api.posts.$get();
 *
 * // Dynamic segments via function call:
 * // api.posts[123].$get() or api.posts('123').$get()
 * // Executes: GET /api/posts/123
 * await api.posts[123].$get();
 * ```
 */
export function createProxyHandler<
  TSchema extends object,
  TOptions = SpooshOptions,
>(
  baseUrl: string,
  defaultOptions: TOptions,
  path: string[] = [],
  fetchExecutor: FetchExecutor<
    TOptions,
    AnyRequestOptions
  > = executeFetch as FetchExecutor<TOptions, AnyRequestOptions>
): TSchema {
  const handler: ProxyHandler<() => void> = {
    get(_target, prop: string | symbol) {
      if (typeof prop === "symbol") return undefined;

      const method = HTTP_METHODS[prop];
      if (method) {
        return (options?: AnyRequestOptions) =>
          fetchExecutor(baseUrl, path, method, defaultOptions, options);
      }

      return createProxyHandler(
        baseUrl,
        defaultOptions,
        [...path, prop],
        fetchExecutor
      );
    },

    // Handles function call syntax for dynamic segments: api.posts("123"), api.users(userId)
    // Q. Why allow this syntax?
    // A. To support dynamic type inference in frameworks where property access with variables is not possible.
    //    Eg. api.posts[":id"].$get() <-- TypeScript sees this as bracket notation with a string literal, can't infer param types
    //    But api.posts(":id").$get() <-- TypeScript can capture ":id" as a template literal type, enabling params: { id: string } inference
    apply(_target, _thisArg, args: [string]) {
      const [segment] = args;

      return createProxyHandler(
        baseUrl,
        defaultOptions,
        [...path, segment],
        fetchExecutor
      );
    },
  };

  const noop = () => {};

  return new Proxy(noop, handler) as TSchema;
}
