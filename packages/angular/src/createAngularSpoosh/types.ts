import type { PluginArray } from "@spoosh/core";
import type {
  SpooshInstanceShape,
  ExtractMethodData,
  ExtractMethodError,
} from "../types";

export interface SpooshAngularFunctions<
  TDefaultError,
  TSchema,
  TPlugins extends PluginArray,
> {
  injectRead: ReturnType<
    typeof import("../injectRead").createInjectRead<
      TSchema,
      TDefaultError,
      TPlugins
    >
  >;
  injectWrite: ReturnType<
    typeof import("../injectWrite").createInjectWrite<
      TSchema,
      TDefaultError,
      TPlugins
    >
  >;
  injectInfiniteRead: ReturnType<
    typeof import("../injectInfiniteRead").createInjectInfiniteRead<
      TSchema,
      TDefaultError,
      TPlugins
    >
  >;
}

export type { SpooshInstanceShape, ExtractMethodData, ExtractMethodError };
