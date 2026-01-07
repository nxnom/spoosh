import type { EnlaceResponse } from "enlace-core";
import type { WriteApiClient, UseEnlaceWriteResult } from "./common.types";
import type { ReactOptionsMap } from "./request.types";

export type WriteSelectorFn<
  TSchema,
  TMethod,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = (api: WriteApiClient<TSchema, TDefaultError, TOptionsMap>) => TMethod;

export type UseWrite<
  TSchema,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = <
  TMethod extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  selectorFn: WriteSelectorFn<TSchema, TMethod, TDefaultError, TOptionsMap>
) => UseEnlaceWriteResult<TMethod>;
