import { createSpooshPlugin } from "@spoosh/core";

import type {
  TransformReadOptions,
  TransformWriteOptions,
  TransformQueueOptions,
  TransformReadResult,
  TransformWriteResult,
  TransformQueueResult,
} from "./types";

const PLUGIN_NAME = "spoosh:transform";

const unsubscribers = new Map<string, () => void>();

/**
 * Enables response data transformation.
 *
 * Supports both sync and async transformer functions.
 *
 * All transforms are per-request for full type inference.
 *
 * @see {@link https://spoosh.dev/docs/react/plugins/transform | Transform Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const spoosh = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     // ... other plugins
 *     transformPlugin(),
 *   ]);
 *
 * // Per-request transforms with full type inference
 * const { data, meta } = useRead(
 *   (api) => api("posts").GET(),
 *   {
 *     transform: (posts) => ({
 *       count: posts.length,
 *       hasMore: posts.length >= 10,
 *     }),
 *   }
 * );
 *
 * // Access transformed data via meta
 * console.log(meta.transformedData);
 * ```
 */
export function transformPlugin() {
  return createSpooshPlugin<{
    readOptions: TransformReadOptions;
    writeOptions: TransformWriteOptions;
    queueOptions: TransformQueueOptions;
    readResult: TransformReadResult;
    writeResult: TransformWriteResult;
    queueResult: TransformQueueResult;
  }>({
    name: PLUGIN_NAME,
    operations: ["read", "write", "queue"],

    afterResponse: async (context, response) => {
      const t = context.tracer?.(PLUGIN_NAME);

      const responseTransformer = context.pluginOptions?.transform;

      if (!responseTransformer || response.data === undefined) {
        return;
      }

      const transformedData = await responseTransformer(response.data);

      t?.log("Transformed", {
        color: "success",
        diff: {
          before: response.data,
          after: transformedData,
          label: "Transform applied to response data",
        },
      });

      context.stateManager.setMeta(context.queryKey, {
        transformedData,
      });
    },

    lifecycle: {
      onMount(context) {
        const transformFn = context.pluginOptions?.transform;

        if (!transformFn) return;

        const unsubscribe = context.stateManager.onDataChange(
          async (key, _oldData, newData) => {
            if (key !== context.queryKey || newData === undefined) return;

            try {
              const transformedData = await transformFn(newData);
              context.stateManager.setMeta(key, { transformedData });
            } catch {
              // Silently ignore transform errors during data change
            }
          }
        );

        unsubscribers.set(context.queryKey, unsubscribe);
      },

      onUpdate(context, previousContext) {
        if (previousContext.queryKey !== context.queryKey) {
          unsubscribers.get(previousContext.queryKey)?.();
          unsubscribers.delete(previousContext.queryKey);
        }

        const transformFn = context.pluginOptions?.transform;

        if (!transformFn) return;

        if (!unsubscribers.has(context.queryKey)) {
          const unsubscribe = context.stateManager.onDataChange(
            async (key, _oldData, newData) => {
              if (key !== context.queryKey || newData === undefined) return;

              try {
                const transformedData = await transformFn(newData);
                context.stateManager.setMeta(key, { transformedData });
              } catch {
                // Silently ignore transform errors during data change
              }
            }
          );

          unsubscribers.set(context.queryKey, unsubscribe);
        }
      },

      onUnmount(context) {
        unsubscribers.get(context.queryKey)?.();
        unsubscribers.delete(context.queryKey);
      },
    },
  });
}
