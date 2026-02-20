import { createSpooshPlugin } from "@spoosh/core";

import type {
  ProgressReadOptions,
  ProgressWriteOptions,
  ProgressPagesOptions,
  ProgressQueueOptions,
  ProgressReadResult,
  ProgressWriteResult,
  ProgressQueueResult,
  ProgressOptions,
} from "./types";

const PLUGIN_NAME = "spoosh:progress";

export function progressPlugin() {
  return createSpooshPlugin<{
    readOptions: ProgressReadOptions;
    writeOptions: ProgressWriteOptions;
    pagesOptions: ProgressPagesOptions;
    queueOptions: ProgressQueueOptions;
    readResult: ProgressReadResult;
    writeResult: ProgressWriteResult;
    queueResult: ProgressQueueResult;
  }>({
    name: PLUGIN_NAME,
    operations: ["read", "write", "pages", "queue"],

    middleware: async (context, next) => {
      const t = context.tracer?.(PLUGIN_NAME);

      if (!context.pluginOptions?.progress) {
        return next();
      }

      const progressOptions =
        typeof context.pluginOptions.progress === "object"
          ? context.pluginOptions.progress
          : ({} as ProgressOptions);

      context.request = {
        ...context.request,
        transport: "xhr",
        transportOptions: {
          onProgress: (event: ProgressEvent, xhr: XMLHttpRequest) => {
            let total = event.total;

            if (!event.lengthComputable && progressOptions.totalHeader) {
              const headerVal = xhr.getResponseHeader(
                progressOptions.totalHeader
              );

              if (headerVal) {
                total = parseInt(headerVal, 10);
              }
            }

            if (event.loaded) {
              t?.log(`Progress: ${event.loaded} / ${total || "?"}`, {
                color: "info",
              });
            }

            context.stateManager.setMeta(context.queryKey, {
              progress: {
                loaded: event.loaded,
                total,
              },
            });
          },
        },
      };

      return next();
    },
  });
}
