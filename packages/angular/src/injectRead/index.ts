import {
  signal,
  effect,
  DestroyRef,
  inject,
  untracked,
  type Signal,
} from "@angular/core";
import {
  type SpooshResponse,
  type MergePluginOptions,
  type MergePluginResults,
  type SpooshPlugin,
  type PluginTypeConfig,
  type PluginContext,
  type SelectorResult,
  type ResolveResultTypes,
  createOperationController,
  createSelectorProxy,
  resolvePath,
  resolveTags,
} from "@spoosh/core";
import type {
  BaseReadOptions,
  BaseReadResult,
  ReadApiClient,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseFormData,
  ExtractResponseParamNames,
  ResponseInputFields,
  SpooshInstanceShape,
} from "../types";

export function createInjectRead<
  TSchema,
  TDefaultError,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
>(
  options: Omit<
    SpooshInstanceShape<unknown, TSchema, TDefaultError, TPlugins>,
    "_types"
  >
) {
  const { api, stateManager, eventEmitter, pluginExecutor } = options;

  type PluginOptions = MergePluginOptions<TPlugins>;
  type PluginResults = MergePluginResults<TPlugins>;

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  type SuccessResponse<T> = Extract<T, { data: unknown; error?: undefined }>;
  type ErrorResponse<T> = Extract<T, { error: unknown; data?: undefined }>;

  type ExtractData<T> = T extends (...args: never[]) => infer R
    ? SuccessResponse<Awaited<R>> extends { data: infer D }
      ? D
      : unknown
    : unknown;

  type ExtractError<T> = T extends (...args: never[]) => infer R
    ? ErrorResponse<Awaited<R>> extends { error: infer E }
      ? E
      : unknown
    : unknown;

  return function injectRead<
    TReadFn extends (
      api: ReadApiClient<TSchema, TDefaultError>
    ) => Promise<{ data?: unknown; error?: unknown }>,
    TReadOpts extends BaseReadOptions & PluginOptions["read"] =
      BaseReadOptions & PluginOptions["read"],
  >(
    readFn: TReadFn,
    readOptions?: TReadOpts
  ): BaseReadResult<ExtractData<TReadFn>, InferError<ExtractError<TReadFn>>> &
    ResponseInputFields<
      ExtractResponseQuery<TReadFn>,
      ExtractResponseBody<TReadFn>,
      ExtractResponseFormData<TReadFn>,
      ExtractResponseParamNames<TReadFn>
    > &
    ResolveResultTypes<PluginResults["read"], TReadOpts> {
    const destroyRef = inject(DestroyRef);

    type TData = ExtractData<TReadFn>;
    type TError = InferError<ExtractError<TReadFn>>;

    const {
      enabled = true,
      tags = undefined,
      additionalTags = undefined,
      ...pluginOpts
    } = (readOptions ?? {}) as BaseReadOptions & Record<string, unknown>;

    const selectorResult: SelectorResult = {
      call: null,
      selector: null,
    };

    const selectorProxy = createSelectorProxy<TSchema>(
      (result: SelectorResult) => {
        selectorResult.call = result.call;
        selectorResult.selector = result.selector;
      }
    );

    (readFn as (api: unknown) => unknown)(selectorProxy);

    const capturedCall = selectorResult.call;

    if (!capturedCall) {
      throw new Error(
        "injectRead requires calling an HTTP method ($get). " +
          "Example: injectRead((api) => api.posts.$get())"
      );
    }

    const requestOptions = capturedCall.options as
      | { params?: Record<string, string | number> }
      | undefined;

    const resolvedPath = resolvePath(capturedCall.path, requestOptions?.params);
    const resolvedTags = resolveTags({ tags, additionalTags }, resolvedPath);

    const queryKey = stateManager.createQueryKey({
      path: capturedCall.path,
      method: capturedCall.method,
      options: capturedCall.options,
    });

    const controller = createOperationController<TData, TError>({
      operationType: "read",
      path: capturedCall.path,
      method: capturedCall.method as "GET",
      tags: resolvedTags,
      requestOptions: capturedCall.options as
        | Record<string, unknown>
        | undefined,
      stateManager,
      eventEmitter,
      pluginExecutor,
      hookId: `angular-${Math.random().toString(36).slice(2)}`,
      fetchFn: async (fetchOpts: unknown) => {
        let current: unknown = api;

        for (const segment of resolvedPath) {
          current = (current as Record<string, unknown>)[segment];
        }

        const method = (current as Record<string, unknown>)[
          capturedCall.method
        ] as (o?: unknown) => Promise<SpooshResponse<TData, TError>>;

        return method(fetchOpts);
      },
    });

    controller.setPluginOptions(pluginOpts);

    const dataSignal = signal<TData | undefined>(undefined);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(true);
    const fetchingSignal = signal(false);

    const subscription = controller.subscribe(() => {
      const state = controller.getState();
      dataSignal.set(state.data as TData | undefined);
      errorSignal.set(state.error as TError | undefined);
    });

    let prevContext: PluginContext<TData, TError> | null = null;
    let initialized = false;

    const executeWithTracking = async (force = false) => {
      const hasData = dataSignal() !== undefined;
      loadingSignal.set(!hasData);
      fetchingSignal.set(true);

      try {
        const response = await controller.execute(undefined, { force });

        if (response.error) {
          errorSignal.set(response.error);
        } else {
          errorSignal.set(undefined);
        }

        return response;
      } catch (err) {
        errorSignal.set(err as TError);
        throw err;
      } finally {
        loadingSignal.set(false);
        fetchingSignal.set(false);
      }
    };

    if (enabled) {
      effect(
        () => {
          if (!initialized) {
            controller.mount();
            initialized = true;
          } else if (prevContext) {
            controller.update(prevContext);
            prevContext = null;
          }

          untracked(() => {
            executeWithTracking(false);
          });

          const unsubRefetch = eventEmitter.on(
            "refetch",
            (event: { queryKey: string }) => {
              if (event.queryKey === queryKey) {
                untracked(() => {
                  executeWithTracking(true);
                });
              }
            }
          );

          const unsubInvalidate = eventEmitter.on(
            "invalidate",
            (invalidatedTags: string[]) => {
              const hasMatch = invalidatedTags.some((tag: string) =>
                resolvedTags.includes(tag)
              );

              if (hasMatch) {
                untracked(() => {
                  executeWithTracking(true);
                });
              }
            }
          );

          return () => {
            unsubRefetch();
            unsubInvalidate();
          };
        },
        { allowSignalWrites: true }
      );
    }

    destroyRef.onDestroy(() => {
      subscription();
      controller.unmount();
    });

    const abort = () => {
      controller.abort();
    };

    const refetch = () => {
      return executeWithTracking(true);
    };

    const entry = stateManager.getCache(queryKey);
    const pluginResultData = entry?.pluginResult
      ? Object.fromEntries(entry.pluginResult)
      : {};

    const opts = capturedCall.options as Record<string, unknown> | undefined;
    const inputInner: Record<string, unknown> = {};

    if (opts?.query !== undefined) {
      inputInner.query = opts.query;
    }

    if (opts?.body !== undefined) {
      inputInner.body = opts.body;
    }

    if (opts?.formData !== undefined) {
      inputInner.formData = opts.formData;
    }

    if (opts?.params !== undefined) {
      inputInner.params = opts.params;
    }

    const inputField =
      Object.keys(inputInner).length > 0 ? { input: inputInner } : {};

    const result = {
      ...pluginResultData,
      ...inputField,
      data: dataSignal as Signal<TData | undefined>,
      error: errorSignal as Signal<TError | undefined>,
      loading: loadingSignal,
      fetching: fetchingSignal,
      abort,
      refetch,
    };

    return result as unknown as BaseReadResult<TData, TError> &
      ResponseInputFields<
        ExtractResponseQuery<TReadFn>,
        ExtractResponseBody<TReadFn>,
        ExtractResponseFormData<TReadFn>,
        ExtractResponseParamNames<TReadFn>
      > &
      ResolveResultTypes<PluginResults["read"], TReadOpts>;
  };
}
