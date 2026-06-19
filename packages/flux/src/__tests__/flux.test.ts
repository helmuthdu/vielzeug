import { describe, expect, it, vi } from 'vitest';

import { flux } from '../core';
import { FluxDisposedError } from '../errors';

describe('flux() — core factory', () => {
  it('emits values via observer.next', () => {
    const received: number[] = [];
    const f = flux<number>((obs) => {
      obs.next(1);
      obs.next(2);
      obs.next(3);
    });

    f.subscribe((n) => received.push(n));
    expect(received).toEqual([1, 2, 3]);
  });

  it('accepts a plain function as subscriber', () => {
    const received: number[] = [];
    const f = flux<number>((obs) => {
      obs.next(42);
    });

    f.subscribe((n) => received.push(n));
    expect(received).toEqual([42]);
  });

  it('calls cleanup when unsubscribed', () => {
    const cleanup = vi.fn();
    const f = flux<number>(() => cleanup);

    const unsub = f.subscribe(() => {});

    unsub();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('cleanup is not called twice on double unsubscribe', () => {
    const cleanup = vi.fn();
    const f = flux<number>(() => cleanup);
    const unsub = f.subscribe(() => {});

    unsub();
    unsub();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('calls complete callback', () => {
    const complete = vi.fn();
    const f = flux<number>((obs) => {
      obs.complete?.();
    });

    f.subscribe({ complete, next: () => {} });
    expect(complete).toHaveBeenCalledOnce();
  });

  it('calls error callback', () => {
    const error = vi.fn();
    const f = flux<number>((obs) => {
      obs.error?.(new Error('boom'));
    });

    f.subscribe({ error, next: () => {} });
    expect(error).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not emit after unsubscribe', () => {
    const received: number[] = [];
    let emit!: (n: number) => void;
    const f = flux<number>((obs) => {
      emit = obs.next.bind(obs);
    });
    const unsub = f.subscribe((n) => received.push(n));

    emit(1);
    unsub();
    emit(2);
    expect(received).toEqual([1]);
  });

  it('each subscribe() starts a new producer (cold)', () => {
    let calls = 0;
    const f = flux<number>(() => {
      calls++;
    });

    f.subscribe(() => {});
    f.subscribe(() => {});
    expect(calls).toBe(2);
  });

  it('dispose() stops all active subscriptions', () => {
    const received: number[] = [];
    let emit!: (n: number) => void;
    const f = flux<number>((obs) => {
      emit = obs.next.bind(obs);
    });

    f.subscribe((n) => received.push(n));
    emit(1);
    f.dispose();
    emit(2);
    expect(received).toEqual([1]);
    expect(f.disposed).toBe(true);
  });

  it('dispose() is idempotent', () => {
    const f = flux<number>(() => {});

    f.dispose();
    f.dispose();
    expect(f.disposed).toBe(true);
  });

  it('[Symbol.dispose] delegates to dispose()', () => {
    const f = flux<number>(() => {});

    f[Symbol.dispose]();
    expect(f.disposed).toBe(true);
  });

  it('disposalSignal aborts when disposed', () => {
    const f = flux<number>(() => {});

    expect(f.disposalSignal.aborted).toBe(false);
    f.dispose();
    expect(f.disposalSignal.aborted).toBe(true);
  });

  it('subscribe() on disposed flux throws FluxDisposedError', () => {
    const f = flux<number>(() => {});

    f.dispose();
    expect(() => f.subscribe(() => {})).toThrow(FluxDisposedError);
  });

  it('pipe() chains operators', () => {
    const received: number[] = [];
    const double = (source: ReturnType<typeof flux<number>>) =>
      flux<number>((obs) => source.subscribe((n) => obs.next(n * 2)));

    flux<number>((obs) => {
      obs.next(5);
    })
      .pipe(double)
      .subscribe((n) => received.push(n));

    expect(received).toEqual([10]);
  });

  it('producer error is forwarded to observer.error', () => {
    const onErr = vi.fn();
    const f = flux<number>((obs) => {
      obs.error?.(new Error('test'));
    });

    f.subscribe({ error: onErr, next: () => {} });
    expect(onErr).toHaveBeenCalledWith(expect.any(Error));
  });

  it('producer throw is forwarded to observer.error', () => {
    const onErr = vi.fn();
    const f = flux<number>(() => {
      throw new Error('thrown');
    });

    f.subscribe({ error: onErr, next: () => {} });
    expect(onErr).toHaveBeenCalledWith(expect.any(Error));
  });
});
