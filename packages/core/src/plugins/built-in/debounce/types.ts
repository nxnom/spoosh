export interface DebounceContext {
  query: Record<string, unknown> | undefined;
  params: Record<string, string | number> | undefined;
  body: unknown;
  prevQuery: Record<string, unknown> | undefined;
  prevParams: Record<string, string | number> | undefined;
  prevBody: unknown;
}

export type DebounceFn = (context: DebounceContext) => number;

export type DebounceValue = number | DebounceFn;

export interface DebounceReadOptions {
  /**
   * Debounce requests by X milliseconds. Waits for inactivity before fetching.
   * Can be a number or a function that returns a number based on request context.
   *
   * @example
   * // Fixed debounce
   * { debounce: 300 }
   *
   * // Conditional debounce - only debounce when search query changes
   * { debounce: ({ query, prevQuery }) => query?.q !== prevQuery?.q ? 300 : 0 }
   */
  debounce?: DebounceValue;
}

export type DebounceInfiniteReadOptions = DebounceReadOptions;
export type DebounceWriteOptions = object;
export type DebounceReadResult = object;
export type DebounceWriteResult = object;
