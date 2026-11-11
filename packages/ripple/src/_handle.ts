import { RippleDisposedError } from './errors';
import { REACTIVE } from './runtime';
import type { Disposable, EffectHandle, Readable, Signal, Unsubscribe } from './types';

/**
 * A read-only view of an internal signal kept current by one effect. Disposing
 * the handle stops the effect; the last value stays readable, but subscribing
 * or doing further work throws.
 */
export class EffectReadable<T> implements Readable<T>, Disposable {
  readonly [REACTIVE] = true;
  private readonly effect: EffectHandle;
  private readonly kind: string;
  private readonly state: Signal<T>;

  constructor(kind: string, state: Signal<T>, effect: EffectHandle) {
    this.kind = kind;
    this.state = state;
    this.effect = effect;
  }

  get disposalSignal(): AbortSignal {
    return this.effect.disposalSignal;
  }

  get disposed(): boolean {
    return this.effect.disposed;
  }

  get name(): string | undefined {
    return this.state.name;
  }

  get value(): T {
    return this.state.value;
  }

  peek(): T {
    return this.state.peek();
  }

  subscribe(listener: () => void): Unsubscribe {
    this.assertActive();

    return this.state.subscribe(listener);
  }

  dispose(): void {
    this.effect.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }

  protected assertActive(): void {
    if (this.effect.disposed) throw new RippleDisposedError(`Cannot use a disposed ${this.kind}.`);
  }
}
