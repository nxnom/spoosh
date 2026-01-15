import { createSpoosh } from "./createSpoosh";
import type {
  SpooshConfig,
  SpooshInstance,
  PluginArray,
} from "./types/instance.types";
import type { SpooshOptions } from "./types/request.types";

/**
 * Class-based builder for creating Spoosh instances with type-safe plugin inference.
 *
 * @example
 * ```ts
 * const spoosh = new Spoosh<ApiSchema, Error>('/api')
 *   .use([cachePlugin(), retryPlugin()]);
 *
 * const { api } = spoosh;
 * ```
 */
export class Spoosh<
  TSchema = unknown,
  TError = unknown,
  TPlugins extends PluginArray = [],
> {
  private baseUrl: string;
  private defaultOptions: SpooshOptions;
  private _plugins: TPlugins;

  constructor(
    baseUrl: string,
    defaultOptions?: SpooshOptions,
    plugins?: TPlugins
  ) {
    this.baseUrl = baseUrl;
    this.defaultOptions = defaultOptions || {};
    this._plugins = (plugins || []) as TPlugins;
  }

  /**
   * Add plugins to the Spoosh instance.
   * Returns a new Spoosh instance with updated plugin types.
   *
   * @example
   * ```ts
   * const spoosh = new Spoosh<Schema, Error>('/api')
   *   .use([cachePlugin(), retryPlugin()]);
   * ```
   */
  use<const TNewPlugins extends PluginArray>(
    plugins: TNewPlugins
  ): Spoosh<TSchema, TError, TNewPlugins> {
    return new Spoosh<TSchema, TError, TNewPlugins>(
      this.baseUrl,
      this.defaultOptions,
      plugins
    );
  }

  private _instance?: SpooshInstance<TSchema, TError, TPlugins>;

  private getInstance(): SpooshInstance<TSchema, TError, TPlugins> {
    if (!this._instance) {
      this._instance = createSpoosh<TSchema, TError, TPlugins>({
        baseUrl: this.baseUrl,
        defaultOptions: this.defaultOptions,
        plugins: this._plugins,
      } as SpooshConfig<TPlugins>);
    }
    return this._instance;
  }

  get api() {
    return this.getInstance().api;
  }

  get stateManager() {
    return this.getInstance().stateManager;
  }

  get eventEmitter() {
    return this.getInstance().eventEmitter;
  }

  get pluginExecutor() {
    return this.getInstance().pluginExecutor;
  }

  get config() {
    return this.getInstance().config;
  }

  get _types() {
    return this.getInstance()._types;
  }
}
