type EventCallback<T = unknown> = (payload: T) => void;

export type EventEmitter = {
  on: <T = unknown>(event: string, callback: EventCallback<T>) => () => void;
  emit: <T = unknown>(event: string, payload: T) => void;
  off: (event: string, callback: EventCallback) => void;
  clear: () => void;
};

export function createEventEmitter(): EventEmitter {
  const listeners = new Map<string, Set<EventCallback>>();

  return {
    on<T>(event: string, callback: EventCallback<T>) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }

      listeners.get(event)!.add(callback as EventCallback);

      return () => {
        listeners.get(event)?.delete(callback as EventCallback);
      };
    },

    emit<T>(event: string, payload: T) {
      listeners.get(event)?.forEach((cb) => cb(payload));
    },

    off(event: string, callback: EventCallback) {
      listeners.get(event)?.delete(callback);
    },

    clear() {
      listeners.clear();
    },
  };
}
