import type {
  SpooshPlugin,
  OperationType,
  PluginAccessor,
  PluginContext,
  PluginContextInput,
} from "./types";
import type { SpooshResponse } from "../types/response.types";

export type PluginExecutor = {
  /** Execute lifecycle hooks for onMount or onUnmount */
  executeLifecycle: (
    phase: "onMount" | "onUnmount",
    operationType: OperationType,
    context: PluginContext
  ) => Promise<void>;

  /** Execute onUpdate lifecycle with previous context */
  executeUpdateLifecycle: (
    operationType: OperationType,
    context: PluginContext,
    previousContext: PluginContext
  ) => Promise<void>;

  executeMiddleware: (
    operationType: OperationType,
    context: PluginContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    coreFetch: () => Promise<SpooshResponse<any, any>>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) => Promise<SpooshResponse<any, any>>;

  getPlugins: () => readonly SpooshPlugin[];

  /** Creates a full PluginContext with plugins accessor injected */
  createContext: (input: PluginContextInput) => PluginContext;
};

function validateDependencies(plugins: SpooshPlugin[]): void {
  const names = new Set(plugins.map((p) => p.name));

  for (const plugin of plugins) {
    for (const dep of plugin.dependencies ?? []) {
      if (!names.has(dep)) {
        throw new Error(
          `Plugin "${plugin.name}" depends on "${dep}" which is not registered`
        );
      }
    }
  }
}

function sortByDependencies(plugins: SpooshPlugin[]): SpooshPlugin[] {
  const sorted: SpooshPlugin[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const pluginMap = new Map(plugins.map((p) => [p.name, p]));

  function visit(plugin: SpooshPlugin): void {
    if (visited.has(plugin.name)) return;

    if (visiting.has(plugin.name)) {
      throw new Error(
        `Circular dependency detected involving "${plugin.name}"`
      );
    }

    visiting.add(plugin.name);

    for (const dep of plugin.dependencies ?? []) {
      const depPlugin = pluginMap.get(dep);
      if (depPlugin) visit(depPlugin);
    }

    visiting.delete(plugin.name);
    visited.add(plugin.name);
    sorted.push(plugin);
  }

  for (const plugin of plugins) {
    visit(plugin);
  }

  return sorted;
}

export function createPluginExecutor(
  initialPlugins: SpooshPlugin[] = []
): PluginExecutor {
  validateDependencies(initialPlugins);
  const plugins = sortByDependencies(initialPlugins);
  const frozenPlugins = Object.freeze([...plugins]);

  const createPluginAccessor = (context: PluginContext): PluginAccessor => ({
    get(name: string) {
      const plugin = plugins.find((p) => p.name === name);
      return plugin?.exports?.(context);
    },
  });

  const executeLifecycleImpl = async (
    phase: "onMount" | "onUnmount",
    operationType: OperationType,
    context: PluginContext
  ): Promise<void> => {
    for (const plugin of plugins) {
      if (!plugin.operations.includes(operationType)) {
        continue;
      }

      const handler = plugin.lifecycle?.[phase];

      if (!handler) {
        continue;
      }

      await handler(context as PluginContext);
    }
  };

  const executeUpdateLifecycleImpl = async (
    operationType: OperationType,
    context: PluginContext,
    previousContext: PluginContext
  ): Promise<void> => {
    for (const plugin of plugins) {
      if (!plugin.operations.includes(operationType)) {
        continue;
      }

      const handler = plugin.lifecycle?.onUpdate;

      if (!handler) {
        continue;
      }

      await handler(context as PluginContext, previousContext as PluginContext);
    }
  };

  return {
    executeLifecycle: executeLifecycleImpl,
    executeUpdateLifecycle: executeUpdateLifecycleImpl,

    async executeMiddleware(
      operationType: OperationType,
      context: PluginContext,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      coreFetch: () => Promise<SpooshResponse<any, any>>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): Promise<SpooshResponse<any, any>> {
      const applicablePlugins = plugins.filter((p) =>
        p.operations.includes(operationType)
      );

      const middlewares = applicablePlugins
        .filter((p) => p.middleware)
        .map((p) => p.middleware!);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let response: SpooshResponse<any, any>;

      if (middlewares.length === 0) {
        response = await coreFetch();
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type NextFn = () => Promise<SpooshResponse<any, any>>;

        const chain: NextFn = middlewares.reduceRight<NextFn>(
          (next, middleware) => {
            return () =>
              middleware(
                context as PluginContext,
                next as () => Promise<SpooshResponse<unknown, unknown>>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ) as Promise<SpooshResponse<any, any>>;
          },
          coreFetch
        );

        response = await chain();
      }

      for (const plugin of applicablePlugins) {
        if (plugin.afterResponse) {
          const newResponse = await plugin.afterResponse(
            context as PluginContext,
            response as SpooshResponse<unknown, unknown>
          );

          if (newResponse) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response = newResponse as SpooshResponse<any, any>;
          }
        }
      }

      return response;
    },

    getPlugins() {
      return frozenPlugins;
    },

    createContext(input: PluginContextInput) {
      const ctx = input as PluginContext;
      ctx.plugins = createPluginAccessor(ctx);
      return ctx;
    },
  };
}
