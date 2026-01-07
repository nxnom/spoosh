import type { EnlaceMiddleware } from "./middleware.types";

export type EnlaceResponse<TData, TError, TRequestOptions = unknown> =
  | {
      status: number;
      data: TData;
      headers?: Headers;
      error?: undefined;
      aborted?: false;
      readonly __requestOptions?: TRequestOptions;
    }
  | {
      status: number;
      data?: undefined;
      headers?: Headers;
      error: TError;
      aborted?: boolean;
      readonly __requestOptions?: TRequestOptions;
    };

export type EnlaceCallbackPayload<T> = {
  status: number;
  data: T;
  headers?: Headers;
};

export type EnlaceErrorCallbackPayload<T> = {
  status: number;
  error: T;
  headers?: Headers;
};

export type EnlaceCallbacks<TData = unknown, TError = unknown> = {
  onSuccess?: ((payload: EnlaceCallbackPayload<unknown>) => void) | undefined;
  onError?:
    | ((payload: EnlaceErrorCallbackPayload<unknown>) => void)
    | undefined;
  middlewares?: EnlaceMiddleware<TData, TError>[];
};
