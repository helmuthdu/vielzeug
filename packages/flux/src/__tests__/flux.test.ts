import { describe, expect, it, vi } from 'vitest';

import { flux } from '../core';
import { of } from '../operators/creation';
import { createSubject } from '../subject';

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

  it('subscribe() on disposed flux calls complete immediately and returns no-op', () => {
    const complete = vi.fn();
    const f = flux<number>(() => {});

    f.dispose();

    const unsub = f.subscribe({ complete, next: () => {} });

    expect(complete).toHaveBeenCalledOnce();
    expect(() => unsub()).not.toThrow();
  });

  it('dispose() sends complete notification to all active subscribers', () => {
    const complete = vi.fn();
    const f = flux<number>(() => {});

    f.subscribe({ complete, next: () => {} });
    f.dispose();
    expect(complete).toHaveBeenCalledOnce();
  });

  it('dispose() sends complete to multiple active subscribers', () => {
    const c1 = vi.fn();
    const c2 = vi.fn();
    const f = flux<number>(() => {});

    f.subscribe({ complete: c1, next: () => {} });
    f.subscribe({ complete: c2, next: () => {} });
    f.dispose();
    expect(c1).toHaveBeenCalledOnce();
    expect(c2).toHaveBeenCalledOnce();
  });

  it('subscribe() with AbortSignal unsubscribes when signal aborts', () => {
    const received: number[] = [];
    let emit!: (n: number) => void;
    const f = flux<number>((obs) => {
      emit = obs.next.bind(obs);
    });
    const ac = new AbortController();

    f.subscribe((n) => received.push(n), ac.signal);
    emit(1);
    ac.abort();
    emit(2);
    expect(received).toEqual([1]);
    f.dispose();
  });

  it('subscribe() with pre-aborted AbortSignal calls complete immediately', () => {
    const complete = vi.fn();
    const f = flux<number>(() => {});
    const ac = new AbortController();

    ac.abort();
    f.subscribe({ complete, next: () => {} }, ac.signal);
    expect(complete).toHaveBeenCalledOnce();
    f.dispose();
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

  it('[Symbol.dispose] is safe when destructured (no fragile this)', () => {
    const f = flux<number>(() => {});
    const { [Symbol.dispose]: disposeFn } = f;

    disposeFn();
    expect(f.disposed).toBe(true);
  });

  it('[Symbol.asyncIterator] yields emitted values', async () => {
    const received: number[] = [];

    for await (const v of of(1, 2, 3)) {
      received.push(v);
    }

    expect(received).toEqual([1, 2, 3]);
  });

  it('[Symbol.asyncIterator] stops on early break (calls return)', async () => {
    const received: number[] = [];

    for await (const v of of(1, 2, 3, 4, 5)) {
      received.push(v);

      if (v === 3) break;
    }

    expect(received).toEqual([1, 2, 3]);
  });

  it('[Symbol.asyncIterator] early break unsubscribes from source', async () => {
    let emitFn!: (n: number) => void;
    const source = flux<number>((obs) => {
      emitFn = obs.next.bind(obs);
    });
    const iter = source[Symbol.asyncIterator]();

    emitFn(10);
    emitFn(20);

    const r1 = await iter.next();
    const r2 = await iter.next();

    await iter.return!();

    expect(r1).toEqual({ done: false, value: 10 });
    expect(r2).toEqual({ done: false, value: 20 });
  });

  it('[Symbol.asyncIterator] propagates errors', async () => {
    const source = flux<number>((obs) => {
      obs.error?.(new Error('iter-err'));
    });

    await expect(async () => {
      for await (const _ of source) {
        /* empty */
      }
    }).rejects.toThrow('iter-err');
  });

  it('[Symbol.asyncIterator] returns an iterable iterator (for await on iterator directly)', async () => {
    const iter = of(10, 20, 30)[Symbol.asyncIterator]();
    const received: number[] = [];

    for await (const v of iter) {
      received.push(v);
    }

    expect(received).toEqual([10, 20, 30]);
  });
});
