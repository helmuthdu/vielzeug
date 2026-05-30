/**
 * Internal queue primitives shared between the real worker implementation and the test double.
 * Not part of the public API surface.
 *
 * Uses a ring-buffer for O(1) enqueue and dequeue.
 * remove() marks items as cancelled (lazy deletion, O(n) scan) — the cancelled slot is
 * reclaimed by the next shift(). This avoids complex in-place compaction with modular arithmetic.
 */

export type QueueItem<TInput, TOutput> = {
  /** Set by remove() — the item is skipped and discarded by the next shift(). */
  cancelled?: boolean;
  cleanupAbort?: () => void;
  input: TInput;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  signal?: AbortSignal;
  timeout?: number;
  transferables: Transferable[];
};

export class TaskQueue<TInput, TOutput> {
  private buf: (QueueItem<TInput, TOutput> | undefined)[];
  private head = 0;
  /** Total slots occupied (including cancelled items not yet reclaimed by shift). */
  private length = 0;
  private tail = 0;

  constructor(initialCapacity = 16) {
    this.buf = new Array<QueueItem<TInput, TOutput> | undefined>(initialCapacity).fill(undefined);
  }

  get size(): number {
    return this.length;
  }

  enqueue(item: QueueItem<TInput, TOutput>, maxQueue: number | undefined): boolean {
    if (maxQueue !== undefined && this.length >= maxQueue) return false;

    if (this.length === this.buf.length) this.grow();

    this.buf[this.tail] = item;
    this.tail = (this.tail + 1) % this.buf.length;
    this.length += 1;

    return true;
  }

  /**
   * Dequeues the next non-cancelled item. Silently discards cancelled slots.
   * Returns undefined if the queue contains only cancelled items (logically empty).
   * Throws only if called on a queue with size === 0.
   */
  shift(): QueueItem<TInput, TOutput> | undefined {
    while (this.length > 0) {
      const item = this.buf[this.head]!;

      this.buf[this.head] = undefined;
      this.head = (this.head + 1) % this.buf.length;
      this.length -= 1;

      if (!item.cancelled) return item;
    }

    return undefined;
  }

  /**
   * Marks an item as cancelled (O(n) scan to locate it). The slot is reclaimed lazily by shift().
   * Returns true if found and marked, false if the item was not in the queue.
   */
  remove(item: QueueItem<TInput, TOutput>): boolean {
    for (let i = 0; i < this.length; i++) {
      if (this.buf[(this.head + i) % this.buf.length] === item) {
        item.cancelled = true;

        return true;
      }
    }

    return false;
  }

  private grow(): void {
    const oldLen = this.buf.length;
    const newLen = oldLen * 2;
    const newBuf = new Array<QueueItem<TInput, TOutput> | undefined>(newLen).fill(undefined);

    for (let i = 0; i < this.length; i++) {
      newBuf[i] = this.buf[(this.head + i) % oldLen];
    }

    this.buf = newBuf;
    this.head = 0;
    this.tail = this.length;
  }
}
