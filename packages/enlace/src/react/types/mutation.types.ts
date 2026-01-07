import type { EnlaceResponse } from "enlace-core";
import type {
  MutationApiClient,
  UseEnlaceSelectorResult,
} from "./common.types";
import type { ReactOptionsMap } from "./request.types";

export type SelectorFn<
  TSchema,
  TMethod,
  TDefaultError = unknown,
  TOptionsMap = ReactOptionsMap,
> = (api: MutationApiClient<TSchema, TDefaultError, TOptionsMap>) => TMethod;

export type UseAPIMutation<TSchema, TDefaultError = unknown> = <
  TMethod extends (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ) => Promise<EnlaceResponse<unknown, unknown>>,
>(
  selectorFn: SelectorFn<TSchema, TMethod, TDefaultError>
) => UseEnlaceSelectorResult<TMethod>;
