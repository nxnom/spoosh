import type {
  PluginArray,
  StateManager,
  EventEmitter,
  PluginExecutor,
  MethodOptionsMap,
  CoreRequestOptionsBase,
} from "@spoosh/core";

export interface SpooshInstanceShape<
  TApi,
  TSchema,
  TDefaultError,
  TPlugins extends PluginArray,
> {
  api: TApi;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
  _types: {
    schema: TSchema;
    defaultError: TDefaultError;
    plugins: TPlugins;
  };
}

export type EnabledOption = boolean | (() => boolean);

type QueryRequestOptions = CoreRequestOptionsBase;

type MutationRequestOptions = CoreRequestOptionsBase;

export type AngularOptionsMap = MethodOptionsMap<
  QueryRequestOptions,
  MutationRequestOptions
>;
