type PrevQueryField<TQuery> = [TQuery] extends [never]
  ? object
  : { prevQuery?: TQuery };

type PrevBodyField<TBody> = [TBody] extends [never]
  ? object
  : { prevBody?: TBody };

type PrevParamsField<TParams> = [TParams] extends [never]
  ? object
  : { prevParams?: TParams };

export type DebounceContext<
  TQuery = never,
  TBody = never,
  TParams = never,
> = PrevQueryField<TQuery> & PrevBodyField<TBody> & PrevParamsField<TParams>;

export type DebounceFn<TQuery = never, TBody = never, TParams = never> = (
  context: DebounceContext<TQuery, TBody, TParams>
) => number;

export type DebounceValue<TQuery = never, TBody = never, TParams = never> =
  | number
  | DebounceFn<TQuery, TBody, TParams>;

export type RequestAwareDebounceFn = DebounceValue<never, never, never>;

export interface DebounceReadOptions {
  /**
   * Debounce requests by X milliseconds. Waits for inactivity before fetching.
   * Can be a number or a function that returns a number based on previous request.
   */
  debounce?: RequestAwareDebounceFn;
}

export type DebounceInfiniteReadOptions = DebounceReadOptions;

export type DebounceWriteOptions = object;

export type DebounceReadResult = object;

export type DebounceWriteResult = object;

declare module "@spoosh/core" {
  interface PluginResolvers<TContext> {
    debounce:
      | DebounceValue<
          TContext["input"]["query"],
          TContext["input"]["body"],
          TContext["input"]["params"]
        >
      | undefined;
  }
}
