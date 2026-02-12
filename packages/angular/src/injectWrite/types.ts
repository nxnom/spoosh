import type { Signal } from "@angular/core";
import type {
  SpooshResponse,
  WriteSelectorClient,
  SpooshBody,
} from "@spoosh/core";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TriggerAwaitedReturn<T> = T extends (...args: any[]) => infer R
  ? Awaited<R>
  : never;

type ExtractInputFromResponse<T> = T extends { input: infer I } ? I : never;

type ExtractTriggerQuery<I> = I extends { query: infer Q }
  ? undefined extends Q
    ? { query?: Exclude<Q, undefined> }
    : { query: Q }
  : unknown;

type ExtractTriggerBody<I> = I extends { body: infer B }
  ? undefined extends B
    ? { body?: Exclude<B, undefined> | SpooshBody<Exclude<B, undefined>> }
    : { body: B | SpooshBody<B> }
  : unknown;

type ExtractTriggerParams<I> = I extends { params: infer P }
  ? { params: P }
  : unknown;

export type WriteTriggerInput<T> =
  ExtractInputFromResponse<TriggerAwaitedReturn<T>> extends infer I
    ? [I] extends [never]
      ? object
      : ExtractTriggerQuery<I> & ExtractTriggerBody<I> & ExtractTriggerParams<I>
    : object;

export type WriteApiClient<TSchema, TDefaultError> = WriteSelectorClient<
  TSchema,
  TDefaultError
>;
