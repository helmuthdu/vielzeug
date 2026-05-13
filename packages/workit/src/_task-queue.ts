export type TaskQueueItem<TInput, TOutput> = {
  cleanupAbort?: () => void;
  input: TInput;
  reject: (reason: unknown) => void;
  resolve: (value: TOutput) => void;
  signal?: AbortSignal;
  transferables: Transferable[];
};

export class TaskQueue<TInput, TOutput> {
  private readonly idleResolvers: Array<() => void> = [];
  private readonly items: TaskQueueItem<TInput, TOutput>[] = [];

  get size(): number {
    return this.items.length;
  }

  enqueue(item: TaskQueueItem<TInput, TOutput>, maxQueue: number | undefined): boolean {
    if (maxQueue !== undefined && this.items.length >= maxQueue) return false;

    this.items.push(item);

    return true;
  }

  shift(): TaskQueueItem<TInput, TOutput> | undefined {
    return this.items.shift();
  }

  remove(item: TaskQueueItem<TInput, TOutput>): boolean {
    const index = this.items.indexOf(item);

    if (index === -1) return false;

    this.items.splice(index, 1);

    return true;
  }

  rejectAll(rejectItem: (item: TaskQueueItem<TInput, TOutput>) => void): void {
    while (this.items.length > 0) {
      rejectItem(this.items.shift()!);
    }

    this.notifyIdleIfReady(() => true);
  }

  waitForIdle(isIdle: () => boolean): Promise<void> {
    if (isIdle()) return Promise.resolve();

    return new Promise<void>((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  notifyIdleIfReady(isIdle: () => boolean): void {
    if (!isIdle() || this.idleResolvers.length === 0) return;

    const resolvers = this.idleResolvers.splice(0, this.idleResolvers.length);

    for (const resolve of resolvers) {
      resolve();
    }
  }
}
