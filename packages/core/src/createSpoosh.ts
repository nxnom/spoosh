import { createProxyHandler } from "./proxy";
import { createStateManager } from "./state";
import { createEventEmitter } from "./events";
import { createPluginExecutor } from "./plugins";
import type {
  SpooshConfig,
  SpooshInstance,
  PluginArray,
} from "./types/instance.types";

export function createSpoosh<
  TSchema = unknown,
  TDefaultError = unknown,
  const TPlugins extends PluginArray = PluginArray,
>(
  config: SpooshConfig<TPlugins>
): SpooshInstance<TSchema, TDefaultError, TPlugins> {
  const {
    baseUrl,
    defaultOptions = {},
    plugins = [] as unknown as TPlugins,
  } = config;

  const api = createProxyHandler({ baseUrl, defaultOptions });
  const stateManager = createStateManager();
  const eventEmitter = createEventEmitter();
  const pluginExecutor = createPluginExecutor([...plugins]);

  return {
    api,
    stateManager,
    eventEmitter,
    pluginExecutor,
    config: {
      baseUrl,
      defaultOptions,
    },
    _types: {
      schema: undefined as unknown as TSchema,
      defaultError: undefined as unknown as TDefaultError,
      plugins: plugins as TPlugins,
    },
  } as SpooshInstance<TSchema, TDefaultError, TPlugins>;
}
