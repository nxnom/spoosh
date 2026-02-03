import type { Signal } from "@angular/core";
import type { ReadClient, TagOptions } from "@spoosh/core";
import type { EnabledOption } from "../types/shared";

export type PageContext<TData, TRequest> = {
  response: TData | undefined;
  allResponses: TData[];
  request: TRequest;
};

export interface BaseInfiniteReadOptions<
  TData,
  TItem,
  TRequest,
> extends TagOptions {
  enabled?: EnabledOption;

  canFetchNext: (ctx: PageContext<TData, TRequest>) => boolean;
  canFetchPrev?: (ctx: PageContext<TData, TRequest>) => boolean;
  nextPageRequest: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;
  prevPageRequest?: (ctx: PageContext<TData, TRequest>) => Partial<TRequest>;
  merger: (responses: TData[]) => TItem[];
}

export interface BaseInfiniteReadResult<
  TData,
  TError,
  TItem,
  TPluginResult = Record<string, unknown>,
> {
  data: Signal<TItem[] | undefined>;
  allResponses: Signal<TData[] | undefined>;
  error: Signal<TError | undefined>;
  loading: Signal<boolean>;
  fetching: Signal<boolean>;
  fetchingNext: Signal<boolean>;
  fetchingPrev: Signal<boolean>;
  canFetchNext: Signal<boolean>;
  canFetchPrev: Signal<boolean>;
  meta: Signal<TPluginResult>;
  fetchNext: () => Promise<void>;
  fetchPrev: () => Promise<void>;
  trigger: () => Promise<void>;
  abort: () => void;
}

export type InfiniteReadApiClient<TSchema, TDefaultError> = ReadClient<
  TSchema,
  TDefaultError
>;
