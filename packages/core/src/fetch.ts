import { buildUrl, isJsonBody, mergeHeaders, objectToFormData } from "./utils";
import type {
  AnyRequestOptions,
  EnlaceCallbacks,
  EnlaceOptions,
  EnlaceResponse,
  HttpMethod,
} from "./types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isNetworkError = (err: unknown): boolean => err instanceof TypeError;

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === "AbortError";

export async function executeFetch<TData, TError>(
  baseUrl: string,
  path: string[],
  method: HttpMethod,
  defaultOptions: EnlaceOptions & EnlaceCallbacks,
  requestOptions?: AnyRequestOptions
): Promise<EnlaceResponse<TData, TError>> {
  const {
    onSuccess,
    onError,
    headers: defaultHeaders,
    ...fetchDefaults
  } = defaultOptions;

  const maxRetries = requestOptions?.retry ?? 3;
  const baseDelay = requestOptions?.retryDelay ?? 1000;
  const retryCount = maxRetries === false ? 0 : maxRetries;

  const url = buildUrl(baseUrl, path, requestOptions?.query);

  let headers = await mergeHeaders(defaultHeaders, requestOptions?.headers);

  const fetchOptions: RequestInit = { ...fetchDefaults, method };

  if (headers) {
    fetchOptions.headers = headers;
  }

  fetchOptions.cache = requestOptions?.cache ?? fetchDefaults?.cache;

  if (requestOptions?.signal) {
    fetchOptions.signal = requestOptions.signal;
  }

  if (requestOptions?.formData !== undefined) {
    fetchOptions.body = objectToFormData(
      requestOptions.formData as Record<string, unknown>
    );
  } else if (requestOptions?.body !== undefined) {
    if (isJsonBody(requestOptions.body)) {
      fetchOptions.body = JSON.stringify(requestOptions.body);
      headers = await mergeHeaders(headers, {
        "Content-Type": "application/json",
      });
      if (headers) {
        fetchOptions.headers = headers;
      }
    } else {
      fetchOptions.body = requestOptions.body as BodyInit;
    }
  }

  let lastError: TError | undefined;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const res = await fetch(url, fetchOptions);
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
