export type TrackedFunction = (() => Promise<{ data: undefined }>) & {
  __trackedPath?: string[];
  __trackedMethod?: string;
};

export function createApiProxy<TSchema>(): TSchema {
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

  return createTrackingProxy([]) as TSchema;
}

export function extractPathFromTracked(fn: unknown): string[] {
  return (fn as TrackedFunction).__trackedPath ?? [];
}

export function extractMethodFromTracked(fn: unknown): string | undefined {
  return (fn as TrackedFunction).__trackedMethod;
}

export function pathToTags(path: string[]): string[] {
  const tags: string[] = [];
  let currentPath = "";

  for (const segment of path) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    tags.push(currentPath);
  }

  return tags;
}
