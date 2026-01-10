export type TrackedFunction = (() => Promise<{ data: undefined }>) & {
  __trackedPath?: string[];
  __trackedMethod?: string;
};

export function createApiProxy<TSchema>(): TSchema {
  const createTrackingProxy = (path: string[]): unknown => {
    const handler: ProxyHandler<object> = {
      get(_, prop) {
        const propertyName = String(prop);

        if (
          propertyName === "$get" ||
          propertyName === "$post" ||
          propertyName === "$put" ||
          propertyName === "$patch" ||
          propertyName === "$delete"
        ) {
          const trackedMethod: TrackedFunction = () =>
            Promise.resolve({ data: undefined });
          trackedMethod.__trackedPath = path;
          trackedMethod.__trackedMethod = propertyName;
          return trackedMethod;
        }

        return createTrackingProxy([...path, propertyName]);
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
