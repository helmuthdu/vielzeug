/**
 * Internal queue primitives shared between the real worker implementation and the test double.
 * Not part of the public API surface.
 */

export type QueueItem<TInput, TOutput> = {
  cleanupAbort?: () => void;
  input: TInput;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  signal?: AbortSignal;
  transferables: Transferable[];
};

export class TaskQueue<TInput, TOutput> {
  private readonly items: QueueItem<TInput, TOutput>[] = [];

  get size(): number {
    return this.items.length;
  }

  enqueue(item: QueueItem<TInput, TOutput>, maxQueue: number | undefined): boolean {
    if (maxQueue !== undefined && this.items.length >= maxQueue) return false;

    this.items.push(item);

    return true;
  }

  shift(): QueueItem<TInput, TOutput> {
    const item = this.items.shift();

    if (!item) throw new Error('[worker] shift() called on empty queue — check size before calling');

    return item;
  }

  remove(item: QueueItem<TInput, TOutput>): boolean {
    const index = this.items.indexOf(item);

    if (index === -1) return false;

    this.items.splice(index, 1);

    return true;
  }
}

export function createAbortError(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;

  if (typeof DOMException === 'function') {
    return new DOMException('Aborted', 'AbortError');
  }

  return new Error('Aborted');
}
