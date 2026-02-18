import type { InfiniteReadState, InfiniteRequestOptions } from "./types";

export function shallowMergeRequest(
  initial: InfiniteRequestOptions,
  override: Partial<InfiniteRequestOptions>
): InfiniteRequestOptions {
  return {
    query: override.query
      ? { ...initial.query, ...override.query }
      : initial.query,
    params: override.params
      ? { ...initial.params, ...override.params }
      : initial.params,
    body: override.body !== undefined ? override.body : initial.body,
  };
}

export function createInitialInfiniteState<
  TData,
  TItem,
  TError,
  TMeta = Record<string, unknown>,
>(): InfiniteReadState<TData, TItem, TError, TMeta> {
  return {
    data: undefined,
    pages: [],
    canFetchNext: false,
    canFetchPrev: false,
    error: undefined,
  };
}
