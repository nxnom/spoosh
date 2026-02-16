/**
 * Semaphore for controlling concurrent access.
 * Used to limit the number of concurrent operations in the queue.
 */
export class Semaphore {
  private current = 0;
  private waiting: Array<() => void> = [];

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }

    return new Promise((resolve) => this.waiting.push(resolve));
  }

  release(): void {
    this.current--;

    if (this.waiting.length > 0) {
      this.current++;
      this.waiting.shift()!();
    }
  }

  setConcurrency(max: number): void {
    const previousMax = this.max;
    this.max = max;

    if (max > previousMax) {
      const slotsToRelease = Math.min(max - previousMax, this.waiting.length);

      for (let i = 0; i < slotsToRelease; i++) {
        this.current++;
        this.waiting.shift()!();
      }
    }
  }
}
