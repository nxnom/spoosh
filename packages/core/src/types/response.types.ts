import type { EnlaceMiddleware } from "./middleware.types";

type QueryField<TQuery> = [TQuery] extends [never] ? object : { query: TQuery };

type BodyField<TBody> = [TBody] extends [never] ? object : { body: TBody };

type FormDataField<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

type ParamsField<THasDynamicSegment extends boolean> =
  THasDynamicSegment extends true
    ? { params: Record<string, unknown> }
    : object;

type ResponseInputFields<
  TQuery,
  TBody,
  TFormData,
  THasDynamicSegment extends boolean,
> = QueryField<TQuery> &
  BodyField<TBody> &
  FormDataField<TFormData> &
  ParamsField<THasDynamicSegment>;

export type EnlaceResponse<
  TData,
  TError,
  TRequestOptions = unknown,
  TQuery = never,
  TBody = never,
  TFormData = never,
  THasDynamicSegment extends boolean = false,
> =
  | ({
      status: number;
      data: TData;
      headers?: Headers;
      error?: undefined;
      aborted?: false;
      readonly __requestOptions?: TRequestOptions;
    } & ResponseInputFields<TQuery, TBody, TFormData, THasDynamicSegment>)
  | ({
      status: number;
      data?: undefined;
      headers?: Headers;
      error: TError;
      aborted?: boolean;
      readonly __requestOptions?: TRequestOptions;
    } & ResponseInputFields<TQuery, TBody, TFormData, THasDynamicSegment>);

export type EnlaceOptionsExtra<TData = unknown, TError = unknown> = {
  middlewares?: EnlaceMiddleware<TData, TError>[];
};
