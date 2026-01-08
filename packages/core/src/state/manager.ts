import type { CacheEntry, OperationState } from "../plugins/types";
import { sortObjectKeys } from "../utils/sortObjectKeys";

type Subscriber = () => void;

export type CacheEntryWithKey<TData = unknown, TError = unknown> = {
  key: string;
  entry: CacheEntry<TData, TError>;
};

function createInitialState<TData, TError>(): OperationState<TData, TError> {
  return {
    loading: false,
    fetching: false,
    data: undefined,
    error: undefined,
    isOptimistic: false,
    isStale: true,
    timestamp: 0,
  };
}

export type StateManager = {
  createQueryKey: (params: {
    path: string[];
    method: string;
    options?: unknown;
  }) => string;

  getCache: <TData, TError>(
    key: string
  ) => CacheEntry<TData, TError> | undefined;

  setCache: <TData, TError>(
    key: string,
    entry: Partial<CacheEntry<TData, TError>>
  ) => void;

  deleteCache: (key: string) => void;

  subscribeCache: (key: string, callback: Subscriber) => () => void;

  getCacheByTags: <TData>(tags: string[]) => CacheEntry<TData> | undefined;

  getCacheEntriesByTags: <TData, TError>(
    tags: string[]
  ) => CacheEntryWithKey<TData, TError>[];

  clear: () => void;
};

export function createStateManager(): StateManager {
  const cache = new Map<string, CacheEntry>();

  return {
    createQueryKey({ path, method, options }) {
      return JSON.stringify(
        sortObjectKeys({
          path,
          method,
          options,
        })
      );
    },

    getCache<TData, TError>(key: string) {
      return cache.get(key) as CacheEntry<TData, TError> | undefined;
    },

    setCache(key, entry) {
      const existing = cache.get(key);

      if (existing) {
        const hasData = entry.state && "data" in entry.state;
        const hasError = entry.state && "error" in entry.state;

        if (hasData || hasError) {
          delete existing.promise;
        }

        existing.state = { ...existing.state, ...entry.state };

        if (entry.tags) {
          existing.tags = entry.tags;
        }

        if (entry.promise !== undefined) {
          existing.promise = entry.promise;
        }

        if (entry.previousData !== undefined) {
          existing.previousData = entry.previousData;
        }

        existing.subscribers.forEach((cb) => cb());
      } else {
        const newEntry: CacheEntry = {
          state: entry.state ?? createInitialState(),
          tags: entry.tags ?? [],
          subscribers: new Set(),
          promise: entry.promise,
          previousData: entry.previousData,
        };
        cache.set(key, newEntry);
      }
    },

    deleteCache(key) {
      cache.delete(key);
    },

    subscribeCache(key, callback) {
      let entry = cache.get(key);

      if (!entry) {
        entry = {
          state: createInitialState(),
          tags: [],
          subscribers: new Set(),
        };
        cache.set(key, entry);
      }

      entry.subscribers.add(callback);

      return () => {
        entry.subscribers.delete(callback);
      };
    },

    getCacheByTags<TData>(tags: string[]) {
      for (const entry of cache.values()) {
        const hasMatch = entry.tags.some((tag) => tags.includes(tag));

        if (hasMatch && entry.state.data !== undefined) {
          return entry as CacheEntry<TData>;
        }
      }

      return undefined;
    },

    getCacheEntriesByTags<TData, TError>(tags: string[]) {
      const entries: CacheEntryWithKey<TData, TError>[] = [];

      cache.forEach((entry, key) => {
        const hasMatch = entry.tags.some((tag) => tags.includes(tag));

        if (hasMatch) {
          entries.push({
            key,
            entry: entry as CacheEntry<TData, TError>,
          });
        }
      });

      return entries;
    },

    clear() {
      cache.clear();
    },
  };
}

let defaultStateManager: StateManager | null = null;

export function getDefaultStateManager(): StateManager {
  if (!defaultStateManager) {
    defaultStateManager = createStateManager();
  }

  return defaultStateManager;
}

export function resetDefaultStateManager(): void {
  defaultStateManager?.clear();
  defaultStateManager = null;
}
