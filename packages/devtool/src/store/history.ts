export interface RingBuffer<T> {
  push(item: T): void;
  toArray(): T[];
  clear(): void;
  get length(): number;
}

export function createRingBuffer<T>(maxSize: number): RingBuffer<T> {
  const buffer: T[] = [];
  let start = 0;
  let count = 0;

  return {
    push(item: T) {
      if (count < maxSize) {
        buffer.push(item);
        count++;
      } else {
        buffer[start] = item;
        start = (start + 1) % maxSize;
      }
    },

    toArray(): T[] {
      if (count < maxSize) {
        return [...buffer];
      }

      return [...buffer.slice(start), ...buffer.slice(0, start)];
    },

    clear() {
      buffer.length = 0;
      start = 0;
      count = 0;
    },

    get length() {
      return count;
    },
  };
}
