import type { EnlaceResponse } from "enlace-core";
import type {
  PollingInterval,
  ReadApiClient,
  UseEnlaceReadResult,
} from "./common.types";
import type { ReactOptionsMap } from "./request.types";

export type ReadFn<
  TSchema,
  TData,
  TError,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = (
  api: ReadApiClient<TSchema, TDefaultError, TOptionsMap>
) => Promise<EnlaceResponse<TData, TError>>;

export type UseEnlaceReadOptions<TData = unknown, TError = unknown> = {
  enabled?: boolean;
  pollingInterval?: PollingInterval<TData, TError>;
  retry?: number | false;
  retryDelay?: number;
};

export type UseRead<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = <TData, TError>(
  readFn: ReadFn<TSchema, TData, TError, TDefaultError, TOptionsMap>,
  options?: UseEnlaceReadOptions<TData, TError>
) => UseEnlaceReadResult<TData, TError>;
