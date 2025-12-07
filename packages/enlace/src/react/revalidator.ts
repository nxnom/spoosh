import { clearCacheByTags } from "./cache";

type Listener = (tags: string[]) => void;

const listeners = new Set<Listener>();

export function invalidateTags(tags: string[]): void {
  clearCacheByTags(tags);
  listeners.forEach((listener) => listener(tags));
}

export function onRevalidate(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
