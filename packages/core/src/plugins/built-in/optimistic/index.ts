import type { EnlacePlugin, PluginContext } from "../../types";
import type { ResolvedCacheConfig } from "../../../types/optimistic.types";
import type { StateManager } from "../../../state/manager";
import type {
  OptimisticWriteOptions,
  OptimisticReadOptions,
  OptimisticInfiniteReadOptions,
  CacheConfig,
} from "./types";

export type {
  OptimisticWriteOptions,
  OptimisticReadOptions,
  OptimisticInfiniteReadOptions,
  CacheConfig,
};
export type {
  OptimisticCallbackFn,
  ResolvedCacheConfig,
  OptimisticSchemaHelper,
} from "./types";

export type OptimisticPluginConfig = object;

type TrackedFunction = (() => Promise<{ data: undefined }>) & {
  __trackedPath?: string[];
  __trackedMethod?: string;
};

function createApiProxy(): unknown {
  const createTrackingProxy = (path: string[]): unknown => {
    const handler: ProxyHandler<object> = {
      get(_, prop) {
        const propStr = String(prop);

        if (
          propStr === "$get" ||
          propStr === "$post" ||
          propStr === "$put" ||
          propStr === "$patch" ||
          propStr === "$delete"
        ) {
          const fn: TrackedFunction = () =>
            Promise.resolve({ data: undefined });
          fn.__trackedPath = path;
          fn.__trackedMethod = propStr;
          return fn;
        }

        return createTrackingProxy([...path, propStr]);
      },
    };

    return new Proxy({}, handler);
  };

  return createTrackingProxy([]);
}

function extractTagsFromFor(forFn: ResolvedCacheConfig["for"]): string[] {
  const fn = forFn as TrackedFunction;
  const path = fn.__trackedPath ?? [];

  const tags: string[] = [];
  let currentPath = "";

  for (const segment of path) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    tags.push(currentPath);
  }

  return tags;
}

function resolveOptimisticConfigs(
  context: PluginContext
): ResolvedCacheConfig[] {
  const pluginOptions = context.metadata.get("pluginOptions") as
    | OptimisticWriteOptions
    | undefined;

  if (!pluginOptions?.optimistic) return [];

  const cache = <TData, TRequest = unknown>(
    config: CacheConfig<TData, unknown, TRequest>
  ): ResolvedCacheConfig => ({
    for: config.for as ResolvedCacheConfig["for"],
    match: config.match as ResolvedCacheConfig["match"],
    timing: config.timing,
    updater: config.updater as ResolvedCacheConfig["updater"],
    rollbackOnError: config.rollbackOnError,
    refetch: config.refetch,
    onError: config.onError,
  });

  const apiProxy = createApiProxy();
  const result = pluginOptions.optimistic(cache, apiProxy as never);

  return Array.isArray(result) ? result : [result];
}

export function optimisticPlugin(): EnlacePlugin<
  OptimisticReadOptions,
  OptimisticWriteOptions,
  OptimisticInfiniteReadOptions
> {
  return {
    name: "enlace:optimistic",
    operations: ["write"],

    handlers: {
      beforeFetch(context: PluginContext) {
        const stateManager = context.metadata.get("stateManager") as
          | StateManager
          | undefined;

        if (!stateManager) return context;

        const configs = resolveOptimisticConfigs(context);
        const immediateConfigs = configs.filter(
          (c) => c.timing !== "onSuccess"
        );

        if (immediateConfigs.length === 0) return context;

        const allAffectedKeys: string[] = [];

        for (const config of immediateConfigs) {
          const tags = extractTagsFromFor(config.for);

          const affectedKeys = stateManager.setOptimistic(
            tags,
            config.updater as (data: unknown) => unknown,
            config.match as
              | ((request: {
                  query?: Record<string, unknown>;
                  params?: Record<string, unknown>;
                  body?: unknown;
                }) => boolean)
              | undefined
          );

          allAffectedKeys.push(...affectedKeys);
        }

        if (allAffectedKeys.length > 0) {
          context.metadata.set("optimisticKeys", allAffectedKeys);
        }

        return context;
      },

      onSuccess(context: PluginContext) {
        const stateManager = context.metadata.get("stateManager") as
          | StateManager
          | undefined;

        if (!stateManager) return context;

        const configs = resolveOptimisticConfigs(context);

        const affectedKeys =
          (context.metadata.get("optimisticKeys") as string[]) ?? [];

        if (affectedKeys.length > 0) {
          stateManager.confirmOptimistic(affectedKeys);
        }

        const onSuccessConfigs = configs.filter(
          (c) => c.timing === "onSuccess"
        );

        for (const config of onSuccessConfigs) {
          const tags = extractTagsFromFor(config.for);

          stateManager.setOptimistic(
            tags,
            (data) => config.updater(data, context.response?.data),
            config.match as
              | ((request: {
                  query?: Record<string, unknown>;
                  params?: Record<string, unknown>;
                  body?: unknown;
                }) => boolean)
              | undefined
          );

          if (config.refetch) {
            context.invalidateTags(tags);
          }
        }

        for (const config of configs) {
          if (config.timing !== "onSuccess" && config.refetch) {
            const tags = extractTagsFromFor(config.for);
            context.invalidateTags(tags);
          }
        }

        return context;
      },

      onError(context: PluginContext) {
        const stateManager = context.metadata.get("stateManager") as
          | StateManager
          | undefined;

        if (!stateManager) return context;

        const configs = resolveOptimisticConfigs(context);
        const affectedKeys =
          (context.metadata.get("optimisticKeys") as string[]) ?? [];

        const shouldRollback = configs.some(
          (c) => c.rollbackOnError !== false && c.timing !== "onSuccess"
        );

        if (shouldRollback && affectedKeys.length > 0) {
          stateManager.rollbackOptimistic(affectedKeys);
        }

        for (const config of configs) {
          if (config.onError) {
            config.onError(context.response?.error);
          }
        }

        return context;
      },
    },
  };
}
