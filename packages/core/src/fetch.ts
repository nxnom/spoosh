import { applyMiddlewares } from "./middleware";
import { buildUrl, isJsonBody, mergeHeaders, objectToFormData } from "./utils";
import type {
  AnyRequestOptions,
  EnlaceCallbacks,
  EnlaceMiddleware,
  EnlaceOptions,
  EnlaceResponse,
  HttpMethod,
  MiddlewareContext,
} from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkError = (err: unknown): boolean => err instanceof TypeError;

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === "AbortError";

export type ExecuteFetchOptions<TData = unknown, TError = unknown> = {
  middlewares?: EnlaceMiddleware<TData, TError>[];
};

export async function executeFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: EnlaceOptions & EnlaceCallbacks,
  requestOptions?: AnyRequestOptions,
  fetchOptions?: ExecuteFetchOptions<TData, TError>
): Promise<EnlaceResponse<TData, TError>> {
  const optionsMiddlewares = (defaultOptions.middlewares ??
    []) as EnlaceMiddleware<TData, TError>[];
  const explicitMiddlewares = fetchOptions?.middlewares ?? [];
  const middlewares =
    explicitMiddlewares.length > 0 ? explicitMiddlewares : optionsMiddlewares;

  let context: MiddlewareContext<TData, TError> = {
    baseUrl,
    path,
    method,
    defaultOptions,
    requestOptions,
    metadata: {},
  };

  if (middlewares.length > 0) {
    context = await applyMiddlewares(context, middlewares, "before");
  }

  const response = await executeCoreFetch<TData, TError>(
    context.baseUrl,
    context.path,
    context.method,
    context.defaultOptions,
    context.requestOptions,
    context.fetchInit
  );

  context.response = response;

  if (middlewares.length > 0) {
    context = await applyMiddlewares(context, middlewares, "after");
  }

  return context.response!;
}

async function executeCoreFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: EnlaceOptions & EnlaceCallbacks,
  requestOptions?: AnyRequestOptions,
  middlewareFetchInit?: RequestInit
): Promise<EnlaceResponse<TData, TError>> {
  const {
    onSuccess,
    onError,
    middlewares: _middlewares,
    headers: defaultHeaders,
    ...fetchDefaults
  } = defaultOptions;

  const maxRetries = requestOptions?.retry ?? 3;
  const baseDelay = requestOptions?.retryDelay ?? 1000;
  const retryCount = maxRetries === false ? 0 : maxRetries;

  const url = buildUrl(baseUrl, path, requestOptions?.query);

  let headers = await mergeHeaders(defaultHeaders, requestOptions?.headers);

  const fetchInit: RequestInit = {
    ...fetchDefaults,
    ...middlewareFetchInit,
    method,
  };

  if (headers) {
    fetchInit.headers = headers;
  }

  fetchInit.cache = requestOptions?.cache ?? fetchDefaults?.cache;

  if (requestOptions?.signal) {
    fetchInit.signal = requestOptions.signal;
  }

  if (requestOptions?.formData !== undefined) {
    fetchInit.body = objectToFormData(
      requestOptions.formData as Record<string, unknown>
    );
  } else if (requestOptions?.body !== undefined) {
    if (isJsonBody(requestOptions.body)) {
      fetchInit.body = JSON.stringify(requestOptions.body);
      headers = await mergeHeaders(headers, {
        "Content-Type": "application/json",
      });

      if (headers) {
        fetchInit.headers = headers;
      }
    } else {
      fetchInit.body = requestOptions.body as BodyInit;
    }
  }

  let lastError: TError | undefined;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const res = await fetch(url, fetchInit);
      const status = res.status;
      const resHeaders = res.headers;

      const contentType = resHeaders.get("content-type");
      const isJson = contentType?.includes("application/json");

      const body = (isJson ? await res.json() : res) as never;

      if (res.ok) {
        const payload = { status, data: body, headers: resHeaders };
        onSuccess?.(payload);
        return { ...payload, error: undefined };
      }

      const payload = { status, error: body, headers: resHeaders };
      onError?.(payload);
      return { ...payload, data: undefined };
    } catch (err) {
      if (isAbortError(err)) {
        return {
          status: 0,
          error: err as TError,
          data: undefined,
          aborted: true,
        };
      }

      lastError = err as TError;

      if (isNetworkError(err) && attempt < retryCount) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await delay(delayMs);
        continue;
      }

      onError?.({ status: 0, error: lastError });
      return { status: 0, error: lastError, data: undefined };
    }
  }

  onError?.({ status: 0, error: lastError! });
  return { status: 0, error: lastError!, data: undefined };
}
