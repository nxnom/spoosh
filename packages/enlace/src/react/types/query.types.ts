import type { EnlaceResponse } from "enlace-core";
import type {
  PollingInterval,
  QueryApiClient,
  UseEnlaceQueryResult,
} from "./common.types";
import type { ReactOptionsMap } from "./request.types";

export type QueryFn<
  TSchema,
  TData,
  TError,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = (
  api: QueryApiClient<TSchema, TDefaultError, TOptionsMap>
) => Promise<EnlaceResponse<TData, TError>>;

export type UseEnlaceQueryOptions<TData = unknown, TError = unknown> = {
  enabled?: boolean;
  pollingInterval?: PollingInterval<TData, TError>;
  retry?: number | false;
  retryDelay?: number;
};

export type UseAPIQuery<TSchema, TDefaultError = unknown> = <TData, TError>(
  queryFn: QueryFn<TSchema, TData, TError, TDefaultError>,
  options?: UseEnlaceQueryOptions<TData, TError>
) => UseEnlaceQueryResult<TData, TError>;
