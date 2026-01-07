import type {
  CoreRequestOptionsBase,
  MethodOptionsMap,
  ResolvedCacheConfig,
} from "enlace-core";

export type QueryRequestOptions = CoreRequestOptionsBase & {
  tags?: string[];
  additionalTags?: string[];
};

export type MutationRequestOptions = CoreRequestOptionsBase & {
  revalidateTags?: string[];
  additionalRevalidateTags?: string[];
};

export type ReactOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;

export type AnyReactRequestOptions = QueryRequestOptions &
  MutationRequestOptions & {
    params?: Record<string, string | number>;
    optimistic?: (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cache: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      api: any
    ) => ResolvedCacheConfig | ResolvedCacheConfig[];
  };
