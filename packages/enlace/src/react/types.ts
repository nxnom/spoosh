import type { EnlaceClient, WildcardClient } from "enlace-core";

type ApiClient<TSchema, TRequestOptionsBase> = unknown extends TSchema
  ? WildcardClient<TRequestOptionsBase>
  : EnlaceClient<TSchema, TRequestOptionsBase>;

/** Result when hook is called without query (manual mode) */
export type UseEnlaceManualResult<TSchema, TRequestOptionsBase> = {
  client: ApiClient<TSchema, TRequestOptionsBase>;
  loading: boolean;
  ok: boolean | undefined;
  data: unknown;
  error: unknown;
};

/** Result when hook is called with query function (auto-fetch mode) */
export type UseEnlaceQueryResult<TData, TError> = {
  loading: boolean;
  ok: boolean | undefined;
  data: TData | undefined;
  error: TError | undefined;
};
