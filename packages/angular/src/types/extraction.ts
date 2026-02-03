type SuccessResponse<T> = Extract<T, { data: unknown; error?: undefined }>;

type ErrorResponse<T> = Extract<T, { error: unknown; data?: undefined }>;

export type ExtractMethodData<T> = T extends (...args: never[]) => infer R
  ? SuccessResponse<Awaited<R>> extends { data: infer D }
    ? D
    : unknown
  : unknown;

export type ExtractMethodError<T> = T extends (...args: never[]) => infer R
  ? ErrorResponse<Awaited<R>> extends { error: infer E }
    ? E
    : unknown
  : unknown;

export type ExtractMethodOptions<T> = T extends (
  options?: infer O
) => Promise<unknown>
  ? O
  : never;

type AwaitedReturnType<T> = T extends (...args: never[]) => infer R
  ? Awaited<R>
  : never;

type SuccessReturnType<T> = SuccessResponse<AwaitedReturnType<T>>;

export type ExtractResponseQuery<T> =
  SuccessReturnType<T> extends {
    input: { query: infer Q };
  }
    ? Q
    : never;

export type ExtractResponseBody<T> =
  SuccessReturnType<T> extends {
    input: { body: infer B };
  }
    ? B
    : never;

export type ExtractResponseParamNames<T> =
  SuccessReturnType<T> extends { input: { params: Record<infer K, unknown> } }
    ? K extends string
      ? K
      : never
    : never;

export type ExtractMethodQuery<T> =
  ExtractMethodOptions<T> extends {
    query: infer Q;
  }
    ? Q
    : never;

export type ExtractMethodBody<T> =
  ExtractMethodOptions<T> extends {
    body: infer B;
  }
    ? B
    : never;
