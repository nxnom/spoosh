import {
  createProxyHandler,
  type EnlaceClient,
  type EnlaceOptions,
  type WildcardClient,
} from "enlace-core";

export { generateTags } from "enlace-core";
import { executeNextFetch } from "./fetch";
import type { NextOptions, NextRequestOptionsBase } from "./types";

/**
 * Creates a type-safe API client for Next.js with built-in caching support.
 * Server-safe - can be used in both server and client components.
 *
 * @example
 * // Create the client
 * import { enlace } from 'enlace-next';
 *
 * const api = enlace<AppType>('https://api.example.com', {}, {
 *   serverRevalidator: async (tags, paths) => {
 *     'use server';
 *     tags.forEach(tag => revalidateTag(tag));
 *     paths.forEach(path => revalidatePath(path));
 *   },
 * });
 *
 * // Use in Server Components
 * const { data, error } = await api.posts.$get();
 *
 * // Automatic cache tagging
 * const { data } = await api.posts[id].$get(); // tagged with ['posts', 'posts/123']
 */
export function enlace<TSchema = unknown, TDefaultError = unknown>(
  baseUrl: string,
  defaultOptions: EnlaceOptions | null = {},
  nextOptions: NextOptions = {}
): unknown extends TSchema
  ? WildcardClient<NextRequestOptionsBase>
  : EnlaceClient<TSchema, TDefaultError, NextRequestOptionsBase> {
  const combinedOptions = { ...defaultOptions, ...nextOptions };

  return createProxyHandler(
    baseUrl,
    combinedOptions,
    [],
    executeNextFetch
  ) as unknown extends TSchema
    ? WildcardClient<NextRequestOptionsBase>
    : EnlaceClient<TSchema, TDefaultError, NextRequestOptionsBase>;
}

export * from "./types";
export * from "./middlewares";
