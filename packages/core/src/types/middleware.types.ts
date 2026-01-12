import type { HttpMethod } from "./common.types";
import type { AnyRequestOptions, SpooshOptions } from "./request.types";
import type { SpooshOptionsExtra, SpooshResponse } from "./response.types";

export type MiddlewarePhase = "before" | "after";

export type MiddlewareContext<TData = unknown, TError = unknown> = {
  baseUrl: string;
  path: string[];
  method: HttpMethod;
  defaultOptions: SpooshOptions & SpooshOptionsExtra;
  requestOptions?: AnyRequestOptions;
  fetchInit?: RequestInit;
  response?: SpooshResponse<TData, TError>;
  metadata: Record<string, unknown>;
};

export type MiddlewareHandler<TData = unknown, TError = unknown> = (
  context: MiddlewareContext<TData, TError>
) =>
  | MiddlewareContext<TData, TError>
  | Promise<MiddlewareContext<TData, TError>>;

export type SpooshMiddleware<TData = unknown, TError = unknown> = {
  name: string;
  phase: MiddlewarePhase;
  handler: MiddlewareHandler<TData, TError>;
};
