import type { Signal, Unsubscribe } from '@vielzeug/ripple';
import { signal as createSignal } from '@vielzeug/ripple';
import type { Sentinel, SentinelOptions } from './types.ts';

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
  private readonly state: Signal<T>;
  private cleanup: (() => void) | undefined;
  private disposedValue = false;
  private externalSignal: AbortSignal | undefined;
  private externalAbortListener: (() => void) | undefined;

  constructor(options: CreateSentinelOptions<T>, setup: (update: (value: T) => void) => () => void) {
    const signalFactory = options.runtime?.signal ?? createSignal;
    this.state = signalFactory(options.initialValue);
    this.disposalSignal = this.abortController.signal;

    if (options.signal?.aborted) {
      this.disposedValue = true;
      this.abortController.abort();
      return;
    }

    try {
      this.cleanup = setup((value) => {
        if (!this.disposedValue) this.state.value = value;
      });
    } catch (error) {
      this.disposedValue = true;
      this.abortController.abort();
      throw error;
    }

    if (!options.signal) return;

    if (options.signal.aborted) {
      this.dispose();
      return;
    }

    this.externalSignal = options.signal;
    this.externalAbortListener = () => this.dispose();
    this.externalSignal.addEventListener('abort', this.externalAbortListener, { once: true });
  }

  get disposed(): boolean {
    return this.disposedValue;
  }

  get value(): T {
    return this.state.value;
  }

  peek(): T {
    return this.state.peek();
  }

  subscribe(listener: () => void): Unsubscribe {
    return this.state.subscribe(listener);
  }

  dispose(): void {
    if (this.disposedValue) return;
    this.disposedValue = true;

    if (this.externalSignal && this.externalAbortListener) {
      this.externalSignal.removeEventListener('abort', this.externalAbortListener);
    }

    const cleanup = this.cleanup;
    this.cleanup = undefined;
    this.externalSignal = undefined;
    this.externalAbortListener = undefined;

    try {
      cleanup?.();
    } finally {
      this.abortController.abort();
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
