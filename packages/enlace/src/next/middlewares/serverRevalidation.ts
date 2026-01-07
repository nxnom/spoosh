import { createMiddleware, type MiddlewareContext } from "enlace-core";
import { generateTags } from "../../utils/generateTags";
import type { ServerRevalidateHandler } from "../types";

export type ServerRevalidationConfig = {
  serverRevalidator?: ServerRevalidateHandler;
  skipServerRevalidation?: boolean;
  autoRevalidateTags?: boolean;
};

export const createServerRevalidationMiddleware = (
  config: ServerRevalidationConfig = {}
) => {
  const {
    serverRevalidator,
    skipServerRevalidation = false,
    autoRevalidateTags = true,
  } = config;

  return createMiddleware("serverRevalidation", "after", (context) => {
    if (context.method === "GET") {
      return context;
    }

    if (!context.response || context.response.error) {
      return context;
    }

    const requestOptions = context.requestOptions as
      | {
          serverRevalidate?: boolean;
          revalidateTags?: string[];
          additionalRevalidateTags?: string[];
          revalidatePaths?: string[];
        }
      | undefined;

    const shouldRevalidate =
      requestOptions?.serverRevalidate ?? !skipServerRevalidation;

    if (!shouldRevalidate) {
      return context;
    }

    const autoTags = generateTags(context.path);
    const baseRevalidateTags =
      requestOptions?.revalidateTags ?? (autoRevalidateTags ? autoTags : []);
    const revalidateTags = [
      ...baseRevalidateTags,
      ...(requestOptions?.additionalRevalidateTags ?? []),
    ];
    const revalidatePaths = requestOptions?.revalidatePaths ?? [];

    if (revalidateTags.length > 0 || revalidatePaths.length > 0) {
      serverRevalidator?.(revalidateTags, revalidatePaths);
    }

    return context as MiddlewareContext;
  });
};
