/**
 * Internal priority-queue for @vielzeug/familiar.
 * Not part of the public API surface.
 *
 * Uses a binary max-heap ordered by priority (higher value = runs first), with
 * insertion-sequence tiebreaking to ensure FIFO ordering within the same priority.
 * Cancelled items are marked lazily and silently skipped by shift().
 *
 * Complexity:
 *   enqueue  O(log n)
 *   shift    O(log n) amortised (lazy cancellation may scan multiple cancelled tops)
 *   remove   O(n) scan + O(1) mark — adequate for typical queue depths
 */

export type QueueItem<TInput, TOutput> = {
  /** Marked true by remove(); the next shift() discards the item silently. */
  cancelled?: boolean;
  cleanupAbort?: () => void;
  input: TInput;
  /** Scheduling priority. Higher value = runs first. Default: 0. */
  priority: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  signal?: AbortSignal;
  timeout?: number;
  transferables: Transferable[];
};

/**
 * Internal heap node: wraps a QueueItem with an insertion sequence for FIFO tiebreaking.
 * Using a wrapper instead of mutating QueueItem keeps queue items free of internal
 * scheduling metadata (_seq).
 */
type HeapEntry<TInput, TOutput> = { readonly _seq: number; readonly item: QueueItem<TInput, TOutput> };

export class TaskQueue<TInput, TOutput> {
  private readonly heap: HeapEntry<TInput, TOutput>[] = [];
  /** Accurate count of live (non-cancelled) items. */
  private liveCount = 0;
  private seq = 0;

  /** Number of live (non-cancelled) items. Always accurate. */
  get size(): number {
    return this.liveCount;
  }

  /**
   * Enqueue item. Returns false (without modifying state) when maxQueue is set and
   * liveCount has already reached it; returns true on success.
   */
  enqueue(item: QueueItem<TInput, TOutput>, maxQueue: number | undefined): boolean {
    if (maxQueue !== undefined && this.liveCount >= maxQueue) return false;

    this.heap.push({ _seq: this.seq++, item });
    this.siftUp(this.heap.length - 1);
    this.liveCount++;

    return true;
  }

  /**
   * Dequeue the highest-priority live item. Silently discards cancelled tombstones.
   * Returns undefined only when there are no live items left.
   */
  shift(): QueueItem<TInput, TOutput> | undefined {
    while (this.heap.length > 0) {
      const { item } = this.extractTop();

      if (!item.cancelled) {
        this.liveCount--;

        return item;
      }
      // Cancelled: liveCount was already decremented in remove(). Just discard and continue.
    }

    return undefined;
  }

  /**
   * Mark item as cancelled (O(n) scan). The heap slot is reclaimed lazily by the next shift().
   * Returns true when found and marked, false when the item is not in the queue.
   */
  remove(item: QueueItem<TInput, TOutput>): boolean {
    if (item.cancelled) return false;

    for (let i = 0; i < this.heap.length; i++) {
      if (this.heap[i]!.item === item) {
        item.cancelled = true;
        this.liveCount--;

        return true;
      }
    }

    return false;
  }

  // ─── Heap internals ────────────────────────────────────────────────────────

  private extractTop(): HeapEntry<TInput, TOutput> {
    const top = this.heap[0]!;
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.siftDown(0);
    }

    return top;
  }

  /** Returns true when entry a should be dispatched before entry b. */
  private higher(a: HeapEntry<TInput, TOutput>, b: HeapEntry<TInput, TOutput>): boolean {
    if (a.item.priority !== b.item.priority) return a.item.priority > b.item.priority;

    return a._seq < b._seq; // earlier insertion wins for equal priority (FIFO)
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1;

      if (this.higher(this.heap[i]!, this.heap[parent]!)) {
        [this.heap[i], this.heap[parent]] = [this.heap[parent]!, this.heap[i]!];
        i = parent;
      } else {
        break;
      }
    }
  }

  private siftDown(i: number): void {
    const n = this.heap.length;

    for (;;) {
      let top = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < n && this.higher(this.heap[left]!, this.heap[top]!)) top = left;

      if (right < n && this.higher(this.heap[right]!, this.heap[top]!)) top = right;

      if (top === i) break;

      [this.heap[i], this.heap[top]] = [this.heap[top]!, this.heap[i]!];
      i = top;
    }
  }
}
