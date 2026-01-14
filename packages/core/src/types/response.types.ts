import type { SpooshMiddleware } from "./middleware.types";

type QueryField<TQuery> = [TQuery] extends [never] ? object : { query: TQuery };

type BodyField<TBody> = [TBody] extends [never] ? object : { body: TBody };

type FormDataField<TFormData> = [TFormData] extends [never]
  ? object
  : { formData: TFormData };

type UrlEncodedField<TUrlEncoded> = [TUrlEncoded] extends [never]
  ? object
  : { urlEncoded: TUrlEncoded };

type ParamsField<TParamNames extends string> = [TParamNames] extends [never]
  ? object
  : { params: Record<TParamNames, string | number> };

type InputFields<
  TQuery,
  TBody,
  TFormData,
  TUrlEncoded,
  TParamNames extends string,
> = QueryField<TQuery> &
  BodyField<TBody> &
  FormDataField<TFormData> &
  UrlEncodedField<TUrlEncoded> &
  ParamsField<TParamNames>;

type InputFieldWrapper<
  TQuery,
  TBody,
  TFormData,
  TUrlEncoded,
  TParamNames extends string,
> = [TQuery, TBody, TFormData, TUrlEncoded, TParamNames] extends [
  never,
  never,
  never,
  never,
  never,
]
  ? object
  : { input: InputFields<TQuery, TBody, TFormData, TUrlEncoded, TParamNames> };

export type SpooshResponse<
  TData,
  TError,
  TRequestOptions = unknown,
  TQuery = never,
  TBody = never,
  TFormData = never,
  TUrlEncoded = never,
  TParamNames extends string = never,
> =
  | ({
      status: number;
      data: TData;
      headers?: Headers;
      error?: undefined;
      aborted?: false;
      readonly __requestOptions?: TRequestOptions;
    } & InputFieldWrapper<TQuery, TBody, TFormData, TUrlEncoded, TParamNames>)
  | ({
      status: number;
      data?: undefined;
      headers?: Headers;
      error: TError;
      aborted?: boolean;
      readonly __requestOptions?: TRequestOptions;
    } & InputFieldWrapper<TQuery, TBody, TFormData, TUrlEncoded, TParamNames>);

export type SpooshOptionsExtra<TData = unknown, TError = unknown> = {
  middlewares?: SpooshMiddleware<TData, TError>[];
};
