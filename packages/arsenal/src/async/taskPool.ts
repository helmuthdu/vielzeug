export interface TaskPool {
  dispose(reason?: unknown): void;
  idle(): Promise<void>;
  run<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T>;
  readonly active: number;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  readonly pending: number;
  [Symbol.dispose](): void;
}

type PendingTask = {
  reject: (reason?: unknown) => void;
  resolve: (value: unknown) => void;
  run: (signal: AbortSignal) => Promise<unknown>;
};

export function taskPool({ concurrency = 1 }: { concurrency?: number } = {}): TaskPool {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('taskPool: concurrency must be a positive integer');
  }

  const controller = new AbortController();
  const pending: PendingTask[] = [];
  let active = 0;
  let disposed = false;
  let idleDeferred: ReturnType<typeof Promise.withResolvers<void>> | undefined;

  const resolveIdle = (): void => {
    if (active === 0 && pending.length === 0) {
      idleDeferred?.resolve();
      idleDeferred = undefined;
    }
  };

  const start = (): void => {
    while (active < concurrency && pending.length > 0) {
      const next = pending.shift()!;

      active++;
      void Promise.resolve()
        .then(() => next.run(controller.signal))
        .then(next.resolve, next.reject)
        .finally(() => {
          active--;
          start();
          resolveIdle();
        });
    }
  };

  return {
    get active(): number {
      return active;
    },
    get disposalSignal(): AbortSignal {
      return controller.signal;
    },
    dispose: (reason: unknown = new DOMException('Task pool disposed', 'AbortError')): void => {
      if (disposed) return;

      disposed = true;
      controller.abort(reason);

      for (const task of pending.splice(0)) task.reject(reason);

      resolveIdle();
    },
    get disposed(): boolean {
      return disposed;
    },
    idle: (): Promise<void> => {
      if (active === 0 && pending.length === 0) return Promise.resolve();

      idleDeferred ??= Promise.withResolvers<void>();

      return idleDeferred.promise;
    },
    get pending(): number {
      return pending.length;
    },
    run: <T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      const deferred = Promise.withResolvers<T>();

      if (disposed) {
        deferred.reject(controller.signal.reason);

        return deferred.promise;
      }

      pending.push({
        reject: deferred.reject,
        resolve: deferred.resolve as (value: unknown) => void,
        run: task as (signal: AbortSignal) => Promise<unknown>,
      });
      start();

      return deferred.promise;
    },
    [Symbol.dispose](): void {
      this.dispose();
    },
  };
}
