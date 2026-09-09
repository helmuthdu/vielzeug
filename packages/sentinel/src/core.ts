import type { Sentinel, SentinelOptions, Unsubscribe } from './types.ts';

export interface CreateSentinelOptions<T> extends SentinelOptions {
  readonly initialValue: T;
}

export function createSentinel<T>(
  options: CreateSentinelOptions<T>,
  setup: (update: (value: T) => void) => () => void,
): Sentinel<T> {
  return new SentinelHandle(options, setup);
}

class SentinelHandle<T> implements Sentinel<T> {
  readonly disposalSignal: AbortSignal;
  private readonly abortController = new AbortController();
  private currentValue: T;
  private readonly listeners = new Set<() => void>();
  private cleanup: (() => void) | undefined;
  private disposedValue = false;
  private externalSignal: AbortSignal | undefined;
  private externalAbortListener: (() => void) | undefined;

  constructor(options: CreateSentinelOptions<T>, setup: (update: (value: T) => void) => () => void) {
    this.currentValue = options.initialValue;
    this.disposalSignal = this.abortController.signal;

    if (options.signal?.aborted) {
      this.disposedValue = true;
      this.abortController.abort();
      return;
    }

    try {
      this.cleanup = setup((value) => {
        if (!this.disposedValue) {
          this.currentValue = value;
          this.notify();
        }
      });
    } catch (error) {
      this.disposedValue = true;
      this.abortController.abort();
      throw error;
    }

    if (!options.signal) return;

    this.externalSignal = options.signal;
    this.externalAbortListener = () => this.dispose();
    this.externalSignal.addEventListener('abort', this.externalAbortListener, { once: true });
  }

  get disposed(): boolean {
    return this.disposedValue;
  }

  readonly getSnapshot = (): T => this.currentValue;

  readonly subscribe = (listener: () => void): Unsubscribe => {
    if (this.disposedValue) return () => {};
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly dispose = (): void => {
    if (this.disposedValue) return;
    this.disposedValue = true;

    if (this.externalSignal && this.externalAbortListener) {
      this.externalSignal.removeEventListener('abort', this.externalAbortListener);
    }

    const cleanup = this.cleanup;
    this.cleanup = undefined;
    this.externalSignal = undefined;
    this.externalAbortListener = undefined;
    this.listeners.clear();

    try {
      cleanup?.();
    } finally {
      this.abortController.abort();
    }
  };

  private notify(): void {
    for (const listener of [...this.listeners]) {
      try {
        listener();
      } catch (error) {
        queueMicrotask(() => {
          throw error;
        });
      }
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
