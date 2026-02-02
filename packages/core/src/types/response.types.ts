import type { SpooshMiddleware } from "./middleware.types";

type QueryField<TQuery> = [TQuery] extends [never] ? object : { query: TQuery };

type BodyField<TBody> = [TBody] extends [never] ? object : { body: TBody };

type ParamsField<TParamNames extends string> = [TParamNames] extends [never]
  ? object
  : { params: Record<TParamNames, string | number> };

type InputFields<
  TQuery,
  TBody,
  TParamNames extends string,
> = QueryField<TQuery> & BodyField<TBody> & ParamsField<TParamNames>;

type InputFieldWrapper<TQuery, TBody, TParamNames extends string> = [
  TQuery,
  TBody,
  TParamNames,
] extends [never, never, never]
  ? object
  : { input: InputFields<TQuery, TBody, TParamNames> };

export type SpooshResponse<
  TData,
  TError,
  TRequestOptions = unknown,
  TQuery = never,
  TBody = never,
  TParamNames extends string = never,
> =
  | ({
      status: number;
      data: TData;
      headers?: Headers;
      error?: undefined;
      aborted?: false;
      readonly __requestOptions?: TRequestOptions;
    } & InputFieldWrapper<TQuery, TBody, TParamNames>)
  | ({
      status: number;
      data?: undefined;
      headers?: Headers;
      error: TError;
      aborted?: boolean;
      readonly __requestOptions?: TRequestOptions;
    } & InputFieldWrapper<TQuery, TBody, TParamNames>);

export type SpooshOptionsExtra<TData = unknown, TError = unknown> = {
  middlewares?: SpooshMiddleware<TData, TError>[];
};
