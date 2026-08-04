import { afterEach, describe, expect, it, vi } from 'vitest';

import { toAsyncIterable } from '../async';
import { stream } from '../core';
import { combineLatest, concat, merge } from '../operators/combination';
import { from, interval, of, timer } from '../operators/creation';
import { debounce, take, takeUntil, timeout } from '../operators/filtering';
import { concatMap, filter, map, mergeMap, scan, switchMap } from '../operators/transformation';
import { first, last, retry, toArray } from '../operators/utility';
import { pipe } from '../pipe';
import { createChannel } from '../subjects';

afterEach(() => vi.useRealTimers());

describe('core operators', () => {
  it('creates, transforms, and collects bounded streams', async () => {
    const result = await toArray(
      pipe(
        of(1, 2, 3, 4),
        filter((value) => value % 2 === 0),
        map((value) => value * 10),
        scan((total, value) => total + value, 0),
      ),
      { maxItems: 4 },
    );

    expect(result).toEqual([20, 60]);
  });

  it('converts promises, iterables, and async iterables', async () => {
    async function* values(): AsyncGenerator<number> {
      yield 1;
      yield 2;
    }

    expect(await toArray(from(Promise.resolve(3)), { maxItems: 1 })).toEqual([3]);
    expect(await toArray(from([4, 5]), { maxItems: 2 })).toEqual([4, 5]);
    expect(await toArray(from(values()), { maxItems: 2 })).toEqual([1, 2]);
  });

  it('stops synchronous iterable consumption when a downstream operator completes', async () => {
    let pulls = 0;

    function* values(): Generator<number> {
      for (let value = 0; value < 100; value++) {
        pulls++;
        yield value;
      }
    }

    expect(await toArray(pipe(from(values()), take(1)), { maxItems: 1 })).toEqual([0]);
    expect(pulls).toBe(1);
  });

  it('combines streams', async () => {
    expect(await toArray(merge(of(1), of(2)), { maxItems: 2 })).toEqual([1, 2]);
    expect(await toArray(concat(of(1), of(2)), { maxItems: 2 })).toEqual([1, 2]);
    expect(await toArray(combineLatest(of(1), of('a')), { maxItems: 1 })).toEqual([[1, 'a']]);
  });

  it('completes combineLatest when a source ends before a first value', () => {
    const completed = vi.fn();

    combineLatest(
      stream((sink) => sink.complete()),
      stream(() => {}),
    ).subscribe({ complete: completed, next: () => {} });

    expect(completed).toHaveBeenCalledOnce();
  });

  it('switches and merges inner streams', async () => {
    expect(
      await toArray(
        pipe(
          of(1, 2),
          switchMap((value) => of(value * 10)),
        ),
        { maxItems: 2 },
      ),
    ).toEqual([10, 20]);
    expect(
      await toArray(
        pipe(
          of(1, 2),
          mergeMap((value) => of(value * 10)),
        ),
        { maxItems: 2 },
      ),
    ).toEqual([10, 20]);
    expect(
      await toArray(
        pipe(
          of(1, 2),
          concatMap((value) => of(value * 10), { capacity: 2 }),
        ),
        { maxItems: 2 },
      ),
    ).toEqual([10, 20]);
  });

  it('errors when concatMap exceeds explicit capacity', async () => {
    const queued = createChannel<number>();
    const inner = createChannel<number>();
    const result = toArray(
      pipe(
        queued.stream,
        concatMap(() => inner.stream, { capacity: 1 }),
      ),
      { maxItems: 10 },
    );

    queued.send(1);
    queued.send(2);
    queued.send(3);

    await expect(result).rejects.toThrow('concatMap buffer capacity exceeded');
  });

  it('retries source failures with options object', async () => {
    let attempts = 0;
    const source = stream<number>((sink) => {
      attempts++;

      if (attempts < 3) sink.error(new Error('retry'));
      else {
        sink.next(42);
        sink.complete();
      }
    });

    expect(await toArray(pipe(source, retry({ attempts: 2 })), { maxItems: 1 })).toEqual([42]);
  });

  it('keeps active synchronous retry cleanup reachable', async () => {
    let attempts = 0;
    const cleanup = vi.fn();
    const source = stream<number>((sink) => {
      attempts++;

      if (attempts === 1) {
        sink.error(new Error('retry'));

        return;
      }

      return cleanup;
    });
    const subscription = pipe(source, retry({ attempts: 1 })).subscribe(() => {});

    await Promise.resolve();
    subscription.unsubscribe();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('forwards retry delay callback failures to observer.error', () => {
    const error = vi.fn();

    pipe(
      stream<number>((sink) => sink.error(new Error('retry'))),
      retry({
        attempts: 1,
        delay: () => {
          throw new Error('bad retry policy');
        },
      }),
    ).subscribe({ error, next: () => {} });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({ message: 'bad retry policy' }));
  });

  it('cancels with take and takeUntil', async () => {
    expect(await toArray(pipe(of(1, 2, 3), take(2)), { maxItems: 2 })).toEqual([1, 2]);

    const stop = new AbortController();

    stop.abort();
    expect(await toArray(pipe(of(1, 2), takeUntil(stop.signal)), { maxItems: 2 })).toEqual([]);
  });

  it('provides explicit async buffering and overflow behavior', async () => {
    const source = createChannel<number>();
    const iterator = toAsyncIterable(source.stream, { capacity: 2, overflow: 'drop-oldest' })[Symbol.asyncIterator]();

    source.send(1);
    source.send(2);
    source.send(3);
    source.dispose();

    expect(await iterator.next()).toEqual({ done: false, value: 2 });
    expect(await iterator.next()).toEqual({ done: false, value: 3 });
    expect(await iterator.next()).toEqual({ done: true, value: undefined });
  });

  it('returns done after explicit iterator return, even after overflow error', async () => {
    const source = createChannel<number>();
    const controller = new AbortController();
    const iterator = toAsyncIterable(source.stream, {
      capacity: 1,
      overflow: 'error',
      signal: controller.signal,
    })[Symbol.asyncIterator]();

    source.send(1);
    source.send(2);
    await iterator.return?.();
    controller.abort();

    expect(await iterator.next()).toEqual({ done: true, value: undefined });
  });

  it('provides terminal value consumers', async () => {
    expect(await first(of(1, 2, 3))).toBe(1);
    expect(await last(of(1, 2, 3))).toBe(3);
  });

  it('cancels value consumers on an external AbortSignal', async () => {
    const controller = new AbortController();
    const pending = first(
      stream(() => {}),
      { signal: controller.signal },
    );

    controller.abort();

    await expect(pending).rejects.toThrow('Stream consumption aborted');
  });

  it('uses fake timers for timed operators', async () => {
    vi.useFakeTimers();

    const delayed = toArray(timer({ delay: 100 }), { maxItems: 1 });

    await vi.advanceTimersByTimeAsync(100);
    expect(await delayed).toEqual([0]);

    const timedOut = first(
      pipe(
        stream(() => {}),
        timeout({ after: 500 }),
      ),
    );

    const timeoutExpectation = expect(timedOut).rejects.toThrow('Timeout after 500ms');

    await vi.advanceTimersByTimeAsync(500);
    await timeoutExpectation;

    const debounced = toArray(pipe(of(1), debounce({ for: 100 })), { maxItems: 1 });

    await vi.advanceTimersByTimeAsync(100);
    expect(await debounced).toEqual([1]);
    expect(() => interval({ every: -1 })).toThrow(RangeError);
  });
});
