import {
  type SpooshPlugin,
  type PluginContext,
  type InstanceApiContext,
  stripPrefixFromPath,
} from "@spoosh/core";

import type {
  InvalidationPluginConfig,
  InvalidationWriteOptions,
  InvalidationReadOptions,
  InvalidationInfiniteReadOptions,
  InvalidationReadResult,
  InvalidationWriteResult,
  InvalidationMode,
  InvalidationPluginExports,
  InvalidationInstanceApi,
} from "./types";

const INVALIDATION_DEFAULT_KEY = "invalidation:defaultMode";

function resolveModeTags(
  context: PluginContext,
  mode: InvalidationMode,
  stripTagPrefix?: string
): string[] {
  switch (mode) {
    case "all":
      if (stripTagPrefix) {
        return context.tags.map((tag) => {
          const segments = tag.split("/").filter(Boolean);
          return stripPrefixFromPath(segments, stripTagPrefix).join("/");
        });
      }
      return context.tags;
    case "self": {
      const selfPath = context.path.join("/");
      if (stripTagPrefix) {
        return [stripPrefixFromPath(context.path, stripTagPrefix).join("/")];
      }
      return [selfPath];
    }
    case "none":
      return [];
  }
}

function resolveInvalidateTags(
  context: PluginContext,
  defaultMode: InvalidationMode,
  stripTagPrefix?: string
): string[] {
  const pluginOptions = context.pluginOptions as
    | InvalidationWriteOptions
    | undefined;

  const invalidateOption = pluginOptions?.invalidate;

  if (!invalidateOption) {
    const overrideDefault = context.metadata.get(INVALIDATION_DEFAULT_KEY) as
      | InvalidationMode
      | undefined;
    const effectiveDefault = overrideDefault ?? defaultMode;
    return resolveModeTags(context, effectiveDefault, stripTagPrefix);
  }

  if (typeof invalidateOption === "string") {
    return resolveModeTags(context, invalidateOption, stripTagPrefix);
  }

  if (Array.isArray(invalidateOption)) {
    const tags: string[] = [];
    let mode: InvalidationMode = "none";

    for (const item of invalidateOption) {
      if (item === "all" || item === "self") {
        mode = item as InvalidationMode;
      } else if (typeof item === "string") {
        if (stripTagPrefix) {
          const segments = item.split("/").filter(Boolean);
          tags.push(stripPrefixFromPath(segments, stripTagPrefix).join("/"));
        } else {
          tags.push(item);
        }
      }
    }

    tags.push(...resolveModeTags(context, mode, stripTagPrefix));

    return [...new Set(tags)];
  }

  return [];
}

/**
 * Enables automatic cache invalidation after mutations.
 *
 * Marks related cache entries as stale and triggers refetches
 * based on tags or explicit invalidation targets.
 *
 * @param config - Plugin configuration
 *
 * @see {@link https://spoosh.dev/docs/plugins/invalidation | Invalidation Plugin Documentation}
 *
 * @example
 * ```ts
 * import { Spoosh } from "@spoosh/core";
 *
 * const client = new Spoosh<ApiSchema, Error>("/api")
 *   .use([
 *     invalidationPlugin({ defaultMode: "all" }),
 *   ]);
 *
 * // Per-mutation invalidation
 * trigger({
 *   invalidate: "self", // Mode only
 * });
 *
 * trigger({
 *   invalidate: ["posts", "users"], // Tags only
 * });
 *
 * trigger({
 *   invalidate: ["all", "posts", "custom-tag"], // Mode + tags
 * });
 * ```
 */
export function invalidationPlugin(
  config: InvalidationPluginConfig = {}
): SpooshPlugin<{
  readOptions: InvalidationReadOptions;
  writeOptions: InvalidationWriteOptions;
  infiniteReadOptions: InvalidationInfiniteReadOptions;
  readResult: InvalidationReadResult;
  writeResult: InvalidationWriteResult;
  instanceApi: InvalidationInstanceApi;
}> {
  const { defaultMode = "all" } = config;

  return {
    name: "spoosh:invalidation",
    operations: ["write"],

    exports(context): InvalidationPluginExports {
      return {
        setDefaultMode(value: InvalidationMode) {
          context.metadata.set(INVALIDATION_DEFAULT_KEY, value);
        },
      };
    },

    afterResponse(context, response) {
      if (!response.error) {
        const tags = resolveInvalidateTags(
          context,
          defaultMode,
          context.stripTagPrefix
        );

        if (tags.length > 0) {
          context.stateManager.markStale(tags);
          context.eventEmitter.emit("invalidate", tags);
        }
      }
    },

    instanceApi(context: InstanceApiContext) {
      const { stateManager, eventEmitter } = context;

      const invalidate = (input: string | string[]): void => {
        const tags = Array.isArray(input) ? input : [input];

        if (tags.length > 0) {
          stateManager.markStale(tags);
          eventEmitter.emit("invalidate", tags);
        }
      };

      return { invalidate };
    },
  };
}
