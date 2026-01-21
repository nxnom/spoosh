import type { PluginArray } from "@spoosh/core";
import { createInjectRead } from "../injectRead";
import { createInjectWrite } from "../injectWrite";
import { createInjectInfiniteRead } from "../injectInfiniteRead";
import type { SpooshAngularFunctions } from "./types";

export function createAngularSpoosh<
  TSchema,
  TDefaultError,
  TPlugins extends PluginArray,
>(instance: {
  readonly api: unknown;
  readonly stateManager: unknown;
  readonly eventEmitter: unknown;
  readonly pluginExecutor: unknown;
  readonly _types: {
    schema: TSchema;
    defaultError: TDefaultError;
    plugins: TPlugins;
  };
}): SpooshAngularFunctions<TDefaultError, TSchema, TPlugins> {
  const { api, stateManager, eventEmitter, pluginExecutor } = instance;

  const injectRead = createInjectRead<TSchema, TDefaultError, TPlugins>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  } as Parameters<
    typeof createInjectRead<TSchema, TDefaultError, TPlugins>
  >[0]);

  const injectWrite = createInjectWrite<TSchema, TDefaultError, TPlugins>({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  } as Parameters<
    typeof createInjectWrite<TSchema, TDefaultError, TPlugins>
  >[0]);

  const injectInfiniteRead = createInjectInfiniteRead<
    TSchema,
    TDefaultError,
    TPlugins
  >({
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
  } as Parameters<
    typeof createInjectInfiniteRead<TSchema, TDefaultError, TPlugins>
  >[0]);

  return {
    injectRead,
    injectWrite,
    injectInfiniteRead,
  };
}

export * from "./types";
