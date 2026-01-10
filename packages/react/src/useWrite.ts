import { useSyncExternalStore, useRef, useCallback } from "react";
import {
  type EnlaceResponse,
  type PluginExecutor,
  type StateManager,
  type EventEmitter,
  type MergePluginOptions,
  type MergePluginResults,
  type EnlacePlugin,
  type PluginTypeConfig,
  createOperationController,
} from "enlace";
import { createTrackingProxy, type TrackingResult } from "./trackingProxy";
import type {
  ResolveSchemaTypes,
  BaseWriteResult,
  WriteApiClient,
  ExtractMethodData,
  ExtractMethodError,
  ExtractMethodOptions,
} from "./types";
import { resolvePath, resolveTags } from "./utils";

export type CreateUseWriteOptions = {
  api: unknown;
  stateManager: StateManager;
  eventEmitter: EventEmitter;
  pluginExecutor: PluginExecutor;
};

export function createUseWrite<
  TSchema,
  TDefaultError,
  TPlugins extends readonly EnlacePlugin<PluginTypeConfig>[],
>(options: CreateUseWriteOptions) {
  const { api, stateManager, pluginExecutor, eventEmitter } = options;

  type PluginOptions = MergePluginOptions<TPlugins>;
  type PluginResults = MergePluginResults<TPlugins>;

  return function useWrite<
    TMethod extends (
      ...args: never[]
    ) => Promise<EnlaceResponse<unknown, unknown>>,
  >(
    writeFn: (api: WriteApiClient<TSchema, TDefaultError>) => TMethod
  ): BaseWriteResult<
    ExtractMethodData<TMethod>,
    ExtractMethodError<TMethod>,
    ExtractMethodOptions<TMethod> &
      ResolveSchemaTypes<PluginOptions["write"], TSchema>
  > &
    PluginResults["write"] {
    type TData = ExtractMethodData<TMethod>;
    type TError = ExtractMethodError<TMethod>;
    type TOptions = ExtractMethodOptions<TMethod> &
      ResolveSchemaTypes<PluginOptions["write"], TSchema>;

    const trackingResultRef = useRef<TrackingResult>({
      trackedCall: null,
      selectorPath: null,
      selectorMethod: null,
    });

    const trackingProxy = createTrackingProxy<TSchema>((result) => {
      trackingResultRef.current = result;
    });

    (writeFn as (api: unknown) => unknown)(trackingProxy);

    const selectorPath = trackingResultRef.current.selectorPath;
    const selectorMethod = trackingResultRef.current.selectorMethod;

    if (!selectorPath || !selectorMethod) {
      throw new Error(
        "useWrite requires selecting an HTTP method ($post, $put, $patch, $delete). " +
          "Example: useWrite((api) => api.posts.$post)"
      );
    }

    const queryKey = stateManager.createQueryKey({
      path: selectorPath,
      method: selectorMethod,
      options: undefined,
    });

    const controllerRef = useRef<ReturnType<
      typeof createOperationController<TData, TError>
    > | null>(null);

    if (!controllerRef.current) {
      controllerRef.current = createOperationController<TData, TError>({
        operationType: "write",
        path: selectorPath,
        method: selectorMethod as "POST" | "PUT" | "PATCH" | "DELETE",
        tags: [],
        stateManager,
        eventEmitter,
        pluginExecutor,
        fetchFn: async (fetchOpts) => {
          const params = (
            fetchOpts as { params?: Record<string, string | number> }
          )?.params;
          const resolvedPath = resolvePath(selectorPath, params);

          let current: unknown = api;

          for (const segment of resolvedPath) {
            current = (current as Record<string, unknown>)[segment];
          }

          const method = (current as Record<string, unknown>)[
            selectorMethod
          ] as (o?: unknown) => Promise<EnlaceResponse<TData, TError>>;

          return method(fetchOpts);
        },
      });
    }

    const controller = controllerRef.current;

    const state = useSyncExternalStore(
      controller.subscribe,
      controller.getState,
      controller.getState
    );

    const reset = useCallback(() => {
      stateManager.deleteCache(queryKey);
    }, [queryKey]);

    const abort = useCallback(() => {
      controller.abort();
    }, []);

    const trigger = useCallback(
      async (
        triggerOptions?: TOptions
      ): Promise<EnlaceResponse<TData, TError>> => {
        const params = (
          triggerOptions as
            | { params?: Record<string, string | number> }
            | undefined
        )?.params;
        const resolvedPath = resolvePath(selectorPath, params);
        const tags = resolveTags(triggerOptions, resolvedPath);

        controller.setPluginOptions({ ...triggerOptions, tags });

        return controller.execute(triggerOptions, { force: true });
      },
      [selectorPath]
    );

    const entry = stateManager.getCache(queryKey);
    const pluginResultData = entry?.pluginResult
      ? Object.fromEntries(entry.pluginResult)
      : {};

    const result = {
      trigger,
      ...state,
      ...pluginResultData,
      data: state.data as TData | undefined,
      error: state.error as TError | undefined,
      reset,
      abort,
    };

    return result as unknown as BaseWriteResult<TData, TError, TOptions> &
      PluginResults["write"];
  };
}
