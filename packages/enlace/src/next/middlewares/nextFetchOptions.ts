import { createMiddleware, type MiddlewareContext } from "enlace-core";
import { generateTags } from "../../utils/generateTags";

export type NextFetchOptionsConfig = {
  autoGenerateTags?: boolean;
};

export const createNextFetchOptionsMiddleware = (
  config: NextFetchOptionsConfig = {}
) => {
  const { autoGenerateTags = true } = config;

  return createMiddleware("nextFetchOptions", "before", (context) => {
    if (context.method !== "GET") {
      return context;
    }

    const requestOptions = context.requestOptions as
      | {
          tags?: string[];
          revalidate?: number | false;
        }
      | undefined;

    const autoTags = generateTags(context.path);
    const tags =
      requestOptions?.tags ?? (autoGenerateTags ? autoTags : undefined);

    const nextOptions: { tags?: string[]; revalidate?: number | false } = {};

    if (tags) {
      nextOptions.tags = tags;
    }

    if (requestOptions?.revalidate !== undefined) {
      nextOptions.revalidate = requestOptions.revalidate;
    }

    if (Object.keys(nextOptions).length === 0) {
      return context;
    }

    return {
      ...context,
      fetchInit: {
        ...context.fetchInit,
        next: nextOptions,
      } as RequestInit,
      metadata: {
        ...context.metadata,
        autoTags,
        tags,
      },
    } as MiddlewareContext;
  });
};
