import { describe, expect, it, vi } from 'vitest';

import { createBehaviorSubject, createReplaySubject, createSubject } from '../subject';

describe('createSubject()', () => {
  it('emits to all subscribers', () => {
    const s = createSubject<number>();
    const a: number[] = [];
    const b: number[] = [];

    s.subscribe((n) => a.push(n));
    s.subscribe((n) => b.push(n));
    s.emit(1);
    s.emit(2);
    expect(a).toEqual([1, 2]);
    expect(b).toEqual([1, 2]);
  });

  it('does not emit to unsubscribed listeners', () => {
    const s = createSubject<number>();
    const received: number[] = [];
    const unsub = s.subscribe((n) => received.push(n));

    s.emit(1);
    unsub();
    s.emit(2);
    expect(received).toEqual([1]);
  });

  it('complete() notifies and disposes', () => {
    const s = createSubject<number>();
    const complete = vi.fn();

    s.subscribe({ complete, next: () => {} });
    s.complete();
    expect(complete).toHaveBeenCalledOnce();
    expect(s.disposed).toBe(true);
  });

  it('fail() notifies subscribers and disposes', () => {
    const s = createSubject<number>();
    const error = vi.fn();

    s.subscribe({ error, next: () => {} });
    s.fail(new Error('fail'));
    expect(error).toHaveBeenCalledWith(expect.any(Error));
    expect(s.disposed).toBe(true);
  });

  it('emit() is no-op after dispose()', () => {
    const s = createSubject<number>();
    const received: number[] = [];

    s.subscribe((n) => received.push(n));
    s.dispose();
    s.emit(99);
    expect(received).toEqual([]);
  });

  it('dispose() sends complete notification to all active subscribers', () => {
    const complete = vi.fn();
    const s = createSubject<number>();

    s.subscribe({ complete, next: () => {} });
    s.dispose();
    expect(complete).toHaveBeenCalledOnce();
    expect(s.disposed).toBe(true);
  });

  it('subscribe() on disposed subject calls complete immediately and returns no-op', () => {
    const complete = vi.fn();
    const s = createSubject<number>();

    s.dispose();

    const unsub = s.subscribe({ complete, next: () => {} });

    expect(complete).toHaveBeenCalledOnce();
    expect(() => unsub()).not.toThrow();
  });

  it('dispose() is idempotent', () => {
    const s = createSubject<number>();

    s.dispose();
    s.dispose();
    expect(s.disposed).toBe(true);
  });

  it('[Symbol.dispose] delegates to dispose()', () => {
    const s = createSubject<number>();

    s[Symbol.dispose]();
    expect(s.disposed).toBe(true);
  });

  it('disposalSignal aborts on dispose()', () => {
    const s = createSubject<number>();

    expect(s.disposalSignal.aborted).toBe(false);
    s.dispose();
    expect(s.disposalSignal.aborted).toBe(true);
  });

  it('subscriber error does not disrupt other subscribers', () => {
    const s = createSubject<number>();
    const received: number[] = [];

    s.subscribe(() => {
      throw new Error('bad subscriber');
    });
    s.subscribe((n) => received.push(n));
    s.emit(1);
    expect(received).toEqual([1]);
  });

  it('subscribe() with AbortSignal unsubscribes when signal aborts', () => {
    const s = createSubject<number>();
    const received: number[] = [];
    const ac = new AbortController();

    s.subscribe((n) => received.push(n), ac.signal);
    s.emit(1);
    ac.abort();
    s.emit(2);
    expect(received).toEqual([1]);
    s.dispose();
  });

  it('subscribe() with pre-aborted AbortSignal calls complete immediately', () => {
    const complete = vi.fn();
    const s = createSubject<number>();
    const ac = new AbortController();

    ac.abort();
    s.subscribe({ complete, next: () => {} }, ac.signal);
    expect(complete).toHaveBeenCalledOnce();
    s.dispose();
  });

  it('[Symbol.dispose] is safe when destructured', () => {
    const s = createSubject<number>();
    const { [Symbol.dispose]: disposeFn } = s;

    disposeFn();
    expect(s.disposed).toBe(true);
  });

  it('[Symbol.asyncIterator] yields emitted values', async () => {
    const s = createSubject<number>();
    const iter = s[Symbol.asyncIterator]();

    s.emit(1);
    s.emit(2);
    s.complete();

    const results: number[] = [];
    let next = await iter.next();

    while (!next.done) {
      results.push(next.value);
      next = await iter.next();
    }

    expect(results).toEqual([1, 2]);
  });

  it('pipe() applies operators', () => {
    const s = createSubject<number>();
    const received: number[] = [];

    s.pipe((src) => {
      return {
        disposalSignal: new AbortController().signal,
        dispose: () => {},
        disposed: false,
        pipe: () => s,
        subscribe: (fn: (v: number) => void) => src.subscribe((n: number) => (fn as (n: number) => void)(n * 2)),
        [Symbol.asyncIterator]: () => [][Symbol.asyncIterator]() as unknown as AsyncIterableIterator<number>,
        [Symbol.dispose]: () => {},
      };
    }).subscribe((n) => received.push(n as number));

    s.emit(5);
    expect(received).toEqual([10]);
  });
});

describe('createBehaviorSubject()', () => {
  it('immediately emits current value to new subscriber', () => {
    const s = createBehaviorSubject(42);
    const received: number[] = [];

    s.subscribe((n) => received.push(n));
    expect(received).toEqual([42]);
  });

  it('exposes .value getter', () => {
    const s = createBehaviorSubject('hello');

    expect(s.value).toBe('hello');
    s.emit('world');
    expect(s.value).toBe('world');
  });

  it('late subscriber gets latest value', () => {
    const s = createBehaviorSubject(0);

    s.emit(1);
    s.emit(2);

    const received: number[] = [];

    s.subscribe((n) => received.push(n));
    expect(received).toEqual([2]);
  });

  it('emits updates to all subscribers', () => {
    const s = createBehaviorSubject(0);
    const a: number[] = [];
    const b: number[] = [];

    s.subscribe((n) => a.push(n));
    s.subscribe((n) => b.push(n));
    s.emit(1);
    expect(a).toEqual([0, 1]);
    expect(b).toEqual([0, 1]);
  });

  it('complete() notifies all subscribers', () => {
    const s = createBehaviorSubject(0);
    const complete = vi.fn();

    s.subscribe({ complete, next: () => {} });
    s.complete();
    expect(complete).toHaveBeenCalledOnce();
    expect(s.disposed).toBe(true);
  });

  it('dispose() notifies all subscribers with complete', () => {
    const complete = vi.fn();
    const s = createBehaviorSubject(0);

    s.subscribe({ complete, next: () => {} });
    s.dispose();
    expect(complete).toHaveBeenCalledOnce();
    expect(s.disposed).toBe(true);
  });

  it('subscribe() on disposed subject calls complete immediately', () => {
    const complete = vi.fn();
    const s = createBehaviorSubject(0);

    s.dispose();

    const unsub = s.subscribe({ complete, next: () => {} });

    expect(complete).toHaveBeenCalledOnce();
    expect(() => unsub()).not.toThrow();
  });

  it('subscribe() with pre-aborted signal calls complete immediately', () => {
    const complete = vi.fn();
    const s = createBehaviorSubject(0);
    const ac = new AbortController();

    ac.abort();
    s.subscribe({ complete, next: () => {} }, ac.signal);
    expect(complete).toHaveBeenCalledOnce();
    s.dispose();
  });

  it('TOCTOU: dispose during sync replay delivers complete, not register', () => {
    const s = createBehaviorSubject(42);
    const complete = vi.fn();
    const extra: number[] = [];

    s.subscribe({
      complete,
      next() {
        s.dispose();
      },
    });

    s.subscribe({
      complete,
      next(v) {
        extra.push(v);
      },
    });

    expect(complete).toHaveBeenCalledTimes(2);
    expect(extra).toEqual([]);
  });

  it('[Symbol.asyncIterator] replays current value then streams', async () => {
    const s = createBehaviorSubject(99);
    const iter = s[Symbol.asyncIterator]();
    const first = await iter.next();

    await iter.return!();
    expect(first).toEqual({ done: false, value: 99 });
    s.dispose();
  });

  it('[Symbol.dispose] is safe when destructured', () => {
    const s = createBehaviorSubject(0);
    const { [Symbol.dispose]: disposeFn } = s;

    disposeFn();
    expect(s.disposed).toBe(true);
  });
});

describe('createReplaySubject()', () => {
  it('replays buffered values to new subscriber', () => {
    const s = createReplaySubject<number>(3);

    s.emit(1);
    s.emit(2);
    s.emit(3);

    const received: number[] = [];

    s.subscribe((n) => received.push(n));
    expect(received).toEqual([1, 2, 3]);
  });

  it('respects bufferSize limit', () => {
    const s = createReplaySubject<number>(2);

    s.emit(1);
    s.emit(2);
    s.emit(3);

    const received: number[] = [];

    s.subscribe((n) => received.push(n));
    expect(received).toEqual([2, 3]);
  });

  it('treats NaN bufferSize as 1 rather than an unbounded buffer', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = createReplaySubject<number>(NaN);

    for (let i = 0; i < 50; i++) s.emit(i);

    expect(s.buffer).toEqual([49]); // capped at 1, not growing without bound
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toContain('createReplaySubject');

    spy.mockRestore();
    s.dispose();
  });

  it('treats Infinity bufferSize as 1 rather than an unbounded buffer', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = createReplaySubject<number>(Infinity);

    for (let i = 0; i < 50; i++) s.emit(i);

    expect(s.buffer).toEqual([49]);
    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
    s.dispose();
  });

  it('exposes .buffer as readonly snapshot', () => {
    const s = createReplaySubject<string>(3);

    s.emit('a');
    s.emit('b');
    expect(s.buffer).toEqual(['a', 'b']);
  });

  it('emits new values to all active subscribers', () => {
    const s = createReplaySubject<number>(2);
    const a: number[] = [];
    const b: number[] = [];

    s.subscribe((n) => a.push(n));
    s.subscribe((n) => b.push(n));
    s.emit(10);
    expect(a).toEqual([10]);
    expect(b).toEqual([10]);
  });

  it('complete() disposes and notifies', () => {
    const s = createReplaySubject<number>(2);
    const complete = vi.fn();

    s.subscribe({ complete, next: () => {} });
    s.complete();
    expect(complete).toHaveBeenCalledOnce();
    expect(s.disposed).toBe(true);
  });

  it('TOCTOU: dispose during sync replay delivers complete, not register', () => {
    const s = createReplaySubject<number>(2);

    s.emit(1);

    const complete = vi.fn();
    const extra: number[] = [];

    s.subscribe({
      complete,
      next() {
        s.dispose();
      },
    });

    s.subscribe({
      complete,
      next(v) {
        extra.push(v);
      },
    });

    expect(complete).toHaveBeenCalledTimes(2);
    expect(extra).toEqual([]);
  });

  it('[Symbol.asyncIterator] replays then streams new values', async () => {
    const s = createReplaySubject<number>(2);

    s.emit(7);
    s.emit(8);

    const iter = s[Symbol.asyncIterator]();
    const r1 = await iter.next();
    const r2 = await iter.next();

    await iter.return!();
    expect(r1).toEqual({ done: false, value: 7 });
    expect(r2).toEqual({ done: false, value: 8 });
    s.dispose();
  });
});
