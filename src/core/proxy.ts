import { executeFetch } from './fetch';
import type { EnlaceOptions, HttpMethod, RequestOptions } from './types';

const HTTP_METHODS: Record<string, HttpMethod> = {
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
};

export function createProxyHandler<TSchema extends object>(
  baseUrl: string,
  defaultOptions: EnlaceOptions,
  path: string[] = [],
): TSchema {
  const handler: ProxyHandler<TSchema> = {
    get(_target, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined;

      const method = HTTP_METHODS[prop];
      if (method) {
        return (options?: RequestOptions<unknown>) =>
          executeFetch(baseUrl, path, method, defaultOptions, options);
      }

      return createProxyHandler(baseUrl, defaultOptions, [...path, prop]);
    },
  };

  return new Proxy({} as TSchema, handler);
}
