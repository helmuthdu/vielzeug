export type QueueItem<TInput, TOutput> = {
  cancelled?: boolean;
  cleanupAbort?: () => void;
  input: TInput;
  priority: number;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  signal?: AbortSignal;
  timeout?: number;
  transferables: Transferable[];
};

type Entry<TInput, TOutput> = { readonly item: QueueItem<TInput, TOutput>; readonly sequence: number };

export class TaskQueue<TInput, TOutput> {
  readonly #heap: Entry<TInput, TOutput>[] = [];
  #live = 0;
  #sequence = 0;

  get size(): number {
    return this.#live;
  }

  enqueue(item: QueueItem<TInput, TOutput>, maxSize: number | undefined): boolean {
    if (maxSize !== undefined && this.#live >= maxSize) return false;

    this.#heap.push({ item, sequence: this.#sequence++ });
    this.#siftUp(this.#heap.length - 1);
    this.#live += 1;

    return true;
  }

  remove(item: QueueItem<TInput, TOutput>): boolean {
    if (item.cancelled) return false;

    for (const entry of this.#heap) {
      if (entry.item === item) {
        item.cancelled = true;
        this.#live -= 1;

        return true;
      }
    }

    return false;
  }

  shift(): QueueItem<TInput, TOutput> | undefined {
    while (this.#heap.length > 0) {
      const item = this.#extract().item;

      if (!item.cancelled) {
        this.#live -= 1;

        return item;
      }
    }

    return undefined;
  }

  #extract(): Entry<TInput, TOutput> {
    const top = this.#heap[0]!;
    const last = this.#heap.pop()!;

    if (this.#heap.length > 0) {
      this.#heap[0] = last;
      this.#siftDown(0);
    }

    return top;
  }

  #before(a: Entry<TInput, TOutput>, b: Entry<TInput, TOutput>): boolean {
    return a.item.priority === b.item.priority ? a.sequence < b.sequence : a.item.priority > b.item.priority;
  }

  #siftUp(index: number): void {
    while (index > 0) {
      const parent = (index - 1) >> 1;

      if (!this.#before(this.#heap[index]!, this.#heap[parent]!)) return;

      [this.#heap[index], this.#heap[parent]] = [this.#heap[parent]!, this.#heap[index]!];
      index = parent;
    }
  }

  #siftDown(index: number): void {
    for (;;) {
      const left = index * 2 + 1;
      const right = left + 1;
      let next = index;

      if (left < this.#heap.length && this.#before(this.#heap[left]!, this.#heap[next]!)) next = left;

      if (right < this.#heap.length && this.#before(this.#heap[right]!, this.#heap[next]!)) next = right;

      if (next === index) return;

      [this.#heap[index], this.#heap[next]] = [this.#heap[next]!, this.#heap[index]!];
      index = next;
    }
  }
}
