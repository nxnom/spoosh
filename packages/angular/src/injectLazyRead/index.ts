import { signal, DestroyRef, inject, type Signal } from "@angular/core";
import {
  type SpooshResponse,
  type SpooshPlugin,
  type PluginTypeConfig,
  type SelectorResult,
  createOperationController,
  createSelectorProxy,
  resolvePath,
} from "@spoosh/core";
import type {
  BaseLazyReadResult,
  ReadApiClient,
  ExtractResponseQuery,
  ExtractResponseBody,
  ExtractResponseParamNames,
  WriteResponseInputFields,
  SpooshInstanceShape,
} from "../types";

export function createInjectLazyRead<
  TSchema,
  TDefaultError,
  TPlugins extends readonly SpooshPlugin<PluginTypeConfig>[],
>(
  options: Omit<
    SpooshInstanceShape<unknown, TSchema, TDefaultError, TPlugins>,
    "_types"
  >
) {
  const { api, stateManager, pluginExecutor, eventEmitter } = options;

  type InferError<T> = [T] extends [unknown] ? TDefaultError : T;

  type SuccessResponse<T> = Extract<T, { data: unknown; error?: undefined }>;
  type ErrorResponse<T> = Extract<T, { error: unknown; data?: undefined }>;

  type ExtractMethodData<T> = T extends (...args: never[]) => infer R
    ? SuccessResponse<Awaited<R>> extends { data: infer D }
      ? D
      : unknown
    : unknown;

  type ExtractMethodError<T> = T extends (...args: never[]) => infer R
    ? ErrorResponse<Awaited<R>> extends { error: infer E }
      ? E
      : unknown
    : unknown;

  type ExtractCoreMethodOptions<T> = T extends (...args: infer A) => unknown
    ? A[0] extends object
      ? Pick<A[0], Extract<keyof A[0], "query" | "params" | "body">>
      : object
    : object;

  return function injectLazyRead<
    TMethod extends (
      ...args: never[]
    ) => Promise<SpooshResponse<unknown, unknown>>,
  >(
    readFn: (api: ReadApiClient<TSchema, TDefaultError>) => TMethod
  ): BaseLazyReadResult<
    ExtractMethodData<TMethod>,
    InferError<ExtractMethodError<TMethod>>,
    ExtractCoreMethodOptions<TMethod>
  > &
    WriteResponseInputFields<
      ExtractResponseQuery<TMethod>,
      ExtractResponseBody<TMethod>,
      ExtractResponseParamNames<TMethod>
    > {
    const destroyRef = inject(DestroyRef);

    type TData = ExtractMethodData<TMethod>;
    type TError = InferError<ExtractMethodError<TMethod>>;
    type TOptions = ExtractCoreMethodOptions<TMethod>;

    const captureSelector = () => {
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

      if (!selectorResult.selector) {
        throw new Error(
          "injectLazyRead requires selecting an HTTP method (GET). " +
            'Example: injectLazyRead((api) => api("posts").GET)'
        );
      }

      return selectorResult.selector;
    };

    const hookId = `angular-${Math.random().toString(36).slice(2)}`;
    let currentQueryKey: string | null = null;
    let currentController: ReturnType<
      typeof createOperationController<TData, TError>
    > | null = null;
    let currentSubscription: (() => void) | null = null;

    const dataSignal = signal<TData | undefined>(undefined);
    const errorSignal = signal<TError | undefined>(undefined);
    const loadingSignal = signal(false);
    const lastTriggerOptionsSignal = signal<TOptions | undefined>(undefined);
    const inputSignal = signal<{
      query?: unknown;
      body?: unknown;
      params?: unknown;
    }>({});

    destroyRef.onDestroy(() => {
      if (currentSubscription) {
        currentSubscription();
      }
    });

    const abort = () => {
      currentController?.abort();
    };

    const trigger = async (
      triggerOptions?: TOptions
    ): Promise<SpooshResponse<TData, TError>> => {
      const selectedEndpoint = captureSelector();

      const params = (
        triggerOptions as
          | { params?: Record<string, string | number> }
          | undefined
      )?.params;
      const pathSegments = selectedEndpoint.path.split("/").filter(Boolean);
      resolvePath(pathSegments, params);

      const queryKey = stateManager.createQueryKey({
        path: pathSegments,
        method: selectedEndpoint.method,
        options: triggerOptions,
      });

      const needsNewController =
        !currentController || currentQueryKey !== queryKey;

      if (needsNewController) {
        if (currentSubscription) {
          currentSubscription();
        }

        const controller = createOperationController<TData, TError>({
          operationType: "read",
          path: pathSegments,
          method: selectedEndpoint.method as "GET",
          tags: [],
          stateManager,
          eventEmitter,
          pluginExecutor,
          hookId,
          requestOptions: triggerOptions,
          fetchFn: async (fetchOpts: unknown) => {
            const pathMethods = (
              api as (path: string) => Record<string, unknown>
            )(selectedEndpoint.path);
            const method = pathMethods[selectedEndpoint.method] as (
              o?: unknown
            ) => Promise<SpooshResponse<TData, TError>>;

            return method(fetchOpts);
          },
        });

        currentSubscription = controller.subscribe(() => {
          const state = controller.getState();
          dataSignal.set(state.data as TData | undefined);
          errorSignal.set(state.error as TError | undefined);
        });

        currentController = controller;
        currentQueryKey = queryKey;
      }

      lastTriggerOptionsSignal.set(triggerOptions);

      const opts = triggerOptions as Record<string, unknown> | undefined;
      const inputInner: Record<string, unknown> = {};

      if (opts?.query !== undefined) {
        inputInner.query = opts.query;
      }

      if (opts?.body !== undefined) {
        inputInner.body = opts.body;
      }

      if (opts?.params !== undefined) {
        inputInner.params = opts.params;
      }

      inputSignal.set(inputInner);
      loadingSignal.set(true);

      currentController!.setPluginOptions(triggerOptions);

      try {
        const response = await currentController!.execute(triggerOptions);

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
      }
    };

    const result = {
      trigger,
      input: inputSignal as Signal<{
        query?: ExtractResponseQuery<TMethod>;
        body?: ExtractResponseBody<TMethod>;
        params?: Record<ExtractResponseParamNames<TMethod>, string | number>;
      }>,
      data: dataSignal as Signal<TData | undefined>,
      error: errorSignal as Signal<TError | undefined>,
      loading: loadingSignal,
      abort,
    };

    return result as unknown as BaseLazyReadResult<TData, TError, TOptions> &
      WriteResponseInputFields<
        ExtractResponseQuery<TMethod>,
        ExtractResponseBody<TMethod>,
        ExtractResponseParamNames<TMethod>
      >;
  };
}
