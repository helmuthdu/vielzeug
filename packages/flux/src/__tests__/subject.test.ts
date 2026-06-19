import { describe, expect, it, vi } from 'vitest';

import { FluxDisposedError } from '../errors';
import { createBehaviorSubject, createSubject } from '../subject';

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

  it('error() notifies subscribers and disposes', () => {
    const s = createSubject<number>();
    const error = vi.fn();

    s.subscribe({ error, next: () => {} });
    s.error(new Error('fail'));
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

  it('subscribe() throws FluxDisposedError after dispose()', () => {
    const s = createSubject<number>();

    s.dispose();
    expect(() => s.subscribe(() => {})).toThrow(FluxDisposedError);
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
        [Symbol.dispose]: () => {},
      };
    }).subscribe((n) => received.push(n as number));

    s.emit(5);
    expect(received).toEqual([10]);
  });
});

describe('createBehaviorSubject()', () => {
  it('immediately emits current value to new subscriber', () => {
    const s = createBehaviorSubject({ initial: 42 });
    const received: number[] = [];

    s.subscribe((n) => received.push(n));
    expect(received).toEqual([42]);
  });

  it('exposes .value getter', () => {
    const s = createBehaviorSubject({ initial: 'hello' });

    expect(s.value).toBe('hello');
    s.emit('world');
    expect(s.value).toBe('world');
  });

  it('late subscriber gets latest value', () => {
    const s = createBehaviorSubject({ initial: 0 });

    s.emit(1);
    s.emit(2);

    const received: number[] = [];

    s.subscribe((n) => received.push(n));
    expect(received).toEqual([2]);
  });

  it('emits updates to all subscribers', () => {
    const s = createBehaviorSubject({ initial: 0 });
    const a: number[] = [];
    const b: number[] = [];

    s.subscribe((n) => a.push(n));
    s.subscribe((n) => b.push(n));
    s.emit(1);
    expect(a).toEqual([0, 1]);
    expect(b).toEqual([0, 1]);
  });

  it('complete() notifies all subscribers', () => {
    const s = createBehaviorSubject({ initial: 0 });
    const complete = vi.fn();

    s.subscribe({ complete, next: () => {} });
    s.complete();
    expect(complete).toHaveBeenCalledOnce();
    expect(s.disposed).toBe(true);
  });

  it('subscribe() throws FluxDisposedError after dispose()', () => {
    const s = createBehaviorSubject({ initial: 0 });

    s.dispose();
    expect(() => s.subscribe(() => {})).toThrow(FluxDisposedError);
  });
});
