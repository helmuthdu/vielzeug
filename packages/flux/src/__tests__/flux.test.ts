import { describe, expect, it, vi } from 'vitest';

import { map, pipe, stream } from '../index';

describe('stream()', () => {
  it('runs producer for each independent subscription', () => {
    let runs = 0;
    const values: number[] = [];
    const source = stream<number>((sink) => {
      runs++;
      sink.next(runs);
      sink.complete();
    });

    source.subscribe((value) => values.push(value));
    source.subscribe((value) => values.push(value));

    expect(values).toEqual([1, 2]);
  });

  it('owns cancellation on a subscription, not on its stream', () => {
    const teardown = vi.fn();
    let send!: (value: number) => void;
    const source = stream<number>((sink) => {
      send = sink.next;

      return teardown;
    });
    const first: number[] = [];
    const second: number[] = [];

    const subscription = source.subscribe((value) => first.push(value));

    source.subscribe((value) => second.push(value));
    subscription.unsubscribe();
    send(1);

    expect(subscription.closed).toBe(true);
    expect(first).toEqual([]);
    expect(second).toEqual([1]);
    expect(teardown).toHaveBeenCalledOnce();
  });

  it('runs returned teardown after synchronous completion', () => {
    const teardown = vi.fn();
    const source = stream((sink) => {
      sink.complete();

      return teardown;
    });

    source.subscribe(() => {});

    expect(teardown).toHaveBeenCalledOnce();
  });

  it('uses AbortSignal to close a subscription', () => {
    const controller = new AbortController();
    const teardown = vi.fn();
    const source = stream(() => teardown);
    const subscription = source.subscribe(() => {}, { signal: controller.signal });

    controller.abort();

    expect(subscription.closed).toBe(true);
    expect(teardown).toHaveBeenCalledOnce();
  });

  it('forwards producer throws to observer.error', () => {
    const error = vi.fn();
    const source = stream<number>(() => {
      throw new Error('broken producer');
    });

    source.subscribe({ error, next: () => {} });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'broken producer' }));
  });

  it('reports unhandled stream errors through platform reporting', () => {
    const original = (globalThis as { reportError?: (reason: unknown) => void }).reportError;
    const reportError = vi.fn();

    Object.defineProperty(globalThis, 'reportError', { configurable: true, value: reportError });

    try {
      stream<number>((sink) => {
        sink.error(new Error('unhandled'));
      }).subscribe(() => {});

      expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'unhandled' }));
    } finally {
      if (original) Object.defineProperty(globalThis, 'reportError', { configurable: true, value: original });
      else Reflect.deleteProperty(globalThis, 'reportError');
    }
  });

  it('reports observer callback errors and closes subscription', () => {
    const original = (globalThis as { reportError?: (reason: unknown) => void }).reportError;
    const reportError = vi.fn();
    const teardown = vi.fn();

    Object.defineProperty(globalThis, 'reportError', { configurable: true, value: reportError });

    try {
      const subscription = stream<number>((sink) => {
        sink.next(1);

        return teardown;
      }).subscribe(() => {
        throw new Error('observer failed');
      });

      expect(subscription.closed).toBe(true);
      expect(teardown).toHaveBeenCalledOnce();
      expect(reportError).toHaveBeenCalledWith(expect.objectContaining({ message: 'observer failed' }));
    } finally {
      if (original) Object.defineProperty(globalThis, 'reportError', { configurable: true, value: original });
      else Reflect.deleteProperty(globalThis, 'reportError');
    }
  });

  it('keeps exact output type through variadic pipe()', () => {
    const values: number[] = [];
    const source = pipe(
      stream<number>((sink) => {
        sink.next(2);
        sink.complete();
      }),
      map((value) => value * 2),
      map((value) => value.toString()),
      map((value) => value.length),
      map((value) => value + 1),
      map((value) => value * 3),
    );

    source.subscribe((value) => values.push(value));

    expect(values).toEqual([6]);
  });
});
