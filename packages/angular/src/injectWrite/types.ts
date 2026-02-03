import type { Signal } from "@angular/core";
import type { SpooshResponse, WriteClient } from "@spoosh/core";

type OptionalQueryField<TQuery> = [TQuery] extends [never]
  ? object
  : undefined extends TQuery
    ? { query?: Exclude<TQuery, undefined> }
    : { query: TQuery };

type OptionalBodyField<TBody> = [TBody] extends [never]
  ? object
  : undefined extends TBody
    ? { body?: Exclude<TBody, undefined> }
    : { body: TBody };

type OptionalParamsField<TParamNames extends string> = [TParamNames] extends [
  never,
]
  ? object
  : { params: Record<TParamNames, string | number> };

type InputFields<
  TQuery,
  TBody,
  TParamNames extends string,
> = OptionalQueryField<TQuery> &
  OptionalBodyField<TBody> &
  OptionalParamsField<TParamNames>;

export type WriteResponseInputFields<
  TQuery,
  TBody,
  TParamNames extends string,
> = [TQuery, TBody, TParamNames] extends [never, never, never]
  ? object
  : {
      input: Signal<InputFields<TQuery, TBody, TParamNames> | undefined>;
    };

export interface BaseWriteResult<
  TData,
  TError,
  TOptions,
  TPluginResult = Record<string, unknown>,
> {
  trigger: (options?: TOptions) => Promise<SpooshResponse<TData, TError>>;
  data: Signal<TData | undefined>;
  error: Signal<TError | undefined>;
  loading: Signal<boolean>;
  meta: Signal<TPluginResult>;
  abort: () => void;
}

export type WriteApiClient<TSchema, TDefaultError> = WriteClient<
  TSchema,
  TDefaultError
>;
