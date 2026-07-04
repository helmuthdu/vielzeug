import { describe, expect, it, vi } from 'vitest';

import type { Flux } from '../types';
import type { Scheduler } from '../types';

import { DEFAULT_SCHEDULER } from '../_scheduler';
import { flux } from '../core';
import { FluxError, FluxTimeoutError } from '../errors';
import { combineLatest, concat, forkJoin, merge, race, withLatestFrom, zip } from '../operators/combination';
import { empty, from, fromEvent, interval, never, of, throwError, timer } from '../operators/creation';
import { debounce, first, last, sample, skip, take, takeUntil, takeWhile, throttle } from '../operators/filtering';
import {
  bufferCount,
  concatMap,
  distinctUntilChanged,
  filter,
  flatMap,
  map,
  pairwise,
  scan,
  startWith,
  switchMap,
} from '../operators/transformation';
import {
  catchError,
  delay,
  finalize,
  flow,
  retry,
  share,
  shareReplay,
  tap,
  timeout,
  toArray,
  toPromise,
} from '../operators/utility';
import { createSubject } from '../subject';

function collect<T>(source: Flux<unknown>): Promise<T[]> {
  return toArray(source as Flux<T>);
}

// ── Creation ────────────────────────────────────────────────────────────────

describe('of()', () => {
  it('emits provided values then completes', async () => {
    const result = await toArray(of(1, 2, 3));

    expect(result).toEqual([1, 2, 3]);
  });
});

describe('fromEvent()', () => {
  it('emits events and stops on unsubscribe', () => {
    const received: string[] = [];
    const listeners: ((e: string) => void)[] = [];
    const target = {
      addEventListener(_: string, fn: (e: string) => void) {
        listeners.push(fn);
      },
      removeEventListener(_: string, fn: (e: string) => void) {
        const idx = listeners.indexOf(fn);

        if (idx !== -1) listeners.splice(idx, 1);
      },
    };

    const unsub = fromEvent<string>(target, 'click').subscribe((v) => received.push(v));

    for (const l of listeners) l('a');
    for (const l of listeners) l('b');
    unsub();
    for (const l of listeners) l('c');

    expect(received).toEqual(['a', 'b']);
  });
});

describe('from()', () => {
  it('converts an iterable', async () => {
    const result = await toArray(from([10, 20, 30]));

    expect(result).toEqual([10, 20, 30]);
  });

  it('converts a Promise', async () => {
    const result = await toArray(from(Promise.resolve(42)));

    expect(result).toEqual([42]);
  });

  it('converts an AsyncIterable', async () => {
    async function* gen(): AsyncGenerator<number> {
      yield 1;
      yield 2;
    }

    const result = await toArray(from(gen()));

    expect(result).toEqual([1, 2]);
  });

  it('forwards iterable throw to error handler', () => {
    const failIterable: Iterable<number> = {
      [Symbol.iterator]() {
        return {
          next(): IteratorResult<number> {
            throw new Error('iter-fail');
          },
        };
      },
    };
    const onErr = vi.fn();

    from(failIterable).subscribe({ error: onErr, next: () => {} });
    expect(onErr).toHaveBeenCalledWith(expect.any(Error));
  });

  it('forwards Promise rejection', async () => {
    const onErr = vi.fn();

    from(Promise.reject(new Error('promise-fail'))).subscribe({ error: onErr, next: () => {} });
    await Promise.resolve();
    await Promise.resolve();
    expect(onErr).toHaveBeenCalledWith(expect.any(Error));
  });

  it('forwards AsyncIterable rejection', async () => {
    const failAsync: AsyncIterable<number> = {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<IteratorResult<number>> {
            throw new Error('async-fail');
          },
        };
      },
    };
    const onErr = vi.fn();

    from(failAsync).subscribe({ error: onErr, next: () => {} });
    await Promise.resolve();
    expect(onErr).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls iter.return() on AsyncIterable when unsubscribed', async () => {
    const returned = vi.fn();

    async function* gen(): AsyncGenerator<number> {
      try {
        yield 1;
        yield 2;
        yield 3;
      } finally {
        returned();
      }
    }

    const received: number[] = [];
    const unsub = from(gen()).subscribe((n) => received.push(n as number));

    await Promise.resolve();
    await Promise.resolve();

    unsub();

    await Promise.resolve();
    await Promise.resolve();

    expect(returned).toHaveBeenCalledOnce();
    expect(received.length).toBeLessThan(3);
  });
});

describe('empty()', () => {
  it('completes immediately', async () => {
    const result = await toArray(empty());

    expect(result).toEqual([]);
  });
});

describe('never()', () => {
  it('never emits or completes', () => {
    const received: unknown[] = [];
    let completed = false;
    const f = never();

    f.subscribe({
      complete() {
        completed = true;
      },
      next(v) {
        received.push(v);
      },
    });
    expect(received).toEqual([]);
    expect(completed).toBe(false);
    f.dispose();
  });
});

describe('FluxError', () => {
  it('has name FluxError', () => {
    const err = new FluxError('msg');

    expect(err.name).toBe('FluxError');
    expect(err.message).toBe('msg');
    expect(err).toBeInstanceOf(Error);
  });

  describe('.is()', () => {
    it('returns true for a FluxError instance', () => {
      expect(FluxError.is(new FluxError('msg'))).toBe(true);
    });

    it('returns true for a FluxTimeoutError instance (subclass)', () => {
      expect(FluxError.is(new FluxTimeoutError(100))).toBe(true);
    });

    it('returns false for a plain Error', () => {
      expect(FluxError.is(new Error('plain'))).toBe(false);
    });

    it('returns false for a non-error value', () => {
      expect(FluxError.is('not an error')).toBe(false);
      expect(FluxError.is(undefined)).toBe(false);
    });
  });
});

describe('throwError()', () => {
  it('errors immediately', () => {
    const onErr = vi.fn();

    throwError(new Error('boom')).subscribe({ error: onErr, next: () => {} });
    expect(onErr).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('interval()', () => {
  it('emits incrementing integers', () =>
    new Promise<void>((resolve) => {
      const received: number[] = [];
      const unsub = interval(10).subscribe((n) => {
        received.push(n);

        if (received.length === 3) {
          unsub();
          expect(received).toEqual([0, 1, 2]);
          resolve();
        }
      });
    }));
});

describe('timer()', () => {
  it('emits 0 after delay then completes', () =>
    new Promise<void>((resolve) => {
      timer(10).subscribe({
        complete: resolve,
        next(n) {
          expect(n).toBe(0);
        },
      });
    }));
});

// ── Operator callback errors ────────────────────────────────────────────────

describe('operator callback throws — forwarded to observer.error()', () => {
  it('map(): a throw on an async emission calls observer.error() exactly once and auto-unsubscribes the source', () =>
    new Promise<void>((resolve) => {
      const nexts: number[] = [];
      const errors: unknown[] = [];

      interval(5)
        .pipe(
          map((n: number) => {
            if (n === 1) throw new Error('boom');

            return n;
          }),
        )
        .subscribe({
          error(err) {
            errors.push(err);

            // No manual unsub() here — the guard-forwarded error() call must already
            // tear down the upstream interval on its own (mirrors core.ts's own
            // synchronous-producer-throw cleanup). Wait past several more ticks to
            // confirm the interval actually stopped rather than merely being ignored.
            setTimeout(() => {
              expect(nexts).toEqual([0]);
              expect(errors).toEqual([expect.objectContaining({ message: 'boom' })]);
              resolve();
            }, 25);
          },
          next: (v) => nexts.push(v),
        });
    }));

  it('tap(): a throw in the side-effect fn forwards to observer.error(), skipping observer.next()', async () => {
    const onErr = vi.fn();
    const nexts: number[] = [];

    of(1, 2, 3)
      .pipe(
        tap((n) => {
          if (n === 2) throw new Error('tap-boom');
        }),
      )
      .subscribe({ error: onErr, next: (v) => nexts.push(v) });

    expect(nexts).toEqual([1]);
    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'tap-boom' }));
  });

  it('scan(): a throw in the reducer forwards to observer.error()', async () => {
    const onErr = vi.fn();

    of(1, 2)
      .pipe(
        scan((_acc, n) => {
          throw new Error(`scan-boom-${n}`);
        }, 0),
      )
      .subscribe({ error: onErr, next: () => {} });

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'scan-boom-1' }));
  });

  it('switchMap(): a throw in the mapping fn forwards to observer.error()', async () => {
    const onErr = vi.fn();

    of(1)
      .pipe(
        switchMap(() => {
          throw new Error('switchMap-boom');
        }),
      )
      .subscribe({ error: onErr, next: () => {} });

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'switchMap-boom' }));
  });

  it('catchError(): a throw in the handler forwards to observer.error()', async () => {
    const onErr = vi.fn();

    throwError(new Error('source-fail'))
      .pipe(
        catchError(() => {
          throw new Error('handler-boom');
        }),
      )
      .subscribe({ error: onErr, next: () => {} });

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'handler-boom' }));
  });

  it('finalize(): a throw in the cleanup fn is logged via console.error, not thrown', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await collect<number>(
      of(1, 2).pipe(
        finalize(() => {
          throw new Error('finalize-boom');
        }),
      ),
    );

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toContain('[@vielzeug/flux]');
    expect(spy.mock.calls[0]?.[0]).toContain('finalize');

    spy.mockRestore();
  });
});

// ── Transformation ──────────────────────────────────────────────────────────

describe('map()', () => {
  it('transforms values', async () => {
    const result = await collect<number>(of(1, 2, 3).pipe(map((n) => n * 10)));

    expect(result).toEqual([10, 20, 30]);
  });
});

describe('filter()', () => {
  it('emits only values matching predicate', async () => {
    const result = await collect<number>(of(1, 2, 3, 4, 5).pipe(filter((n) => (n as number) % 2 === 0)));

    expect(result).toEqual([2, 4]);
  });
});

describe('startWith()', () => {
  it('prepends values before source emissions', async () => {
    const result = await collect<number>(of(3, 4).pipe(startWith(1, 2)));

    expect(result).toEqual([1, 2, 3, 4]);
  });
});

describe('bufferCount()', () => {
  it('collects emissions into fixed-size non-overlapping batches', async () => {
    const result = await collect<number[]>(of(1, 2, 3, 4, 5, 6).pipe(bufferCount(2)));

    expect(result).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it('flushes a partial batch on source completion', async () => {
    const result = await collect<number[]>(of(1, 2, 3).pipe(bufferCount(2)));

    expect(result).toEqual([[1, 2], [3]]);
  });

  it('treats size <= 0 as size 1 — no silent data loss', async () => {
    const result = await collect<number[]>(of(1, 2, 3).pipe(bufferCount(0)));

    expect(result).toEqual([[1], [2], [3]]);
  });

  it('warns via console.warn when size is clamped', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await collect<number[]>(of(1, 2, 3).pipe(bufferCount(0)));

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toContain('[@vielzeug/flux]');
    expect(spy.mock.calls[0]?.[0]).toContain('bufferCount');

    spy.mockRestore();
  });

  it('does not warn when size and every are already valid', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await collect<number[]>(of(1, 2, 3).pipe(bufferCount(2, 1)));

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it('treats a NaN size as 1 rather than letting buffers grow unbounded', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await collect<number[]>(of(1, 2, 3).pipe(bufferCount(NaN)));

    expect(result).toEqual([[1], [2], [3]]); // capped at 1, not one ever-growing buffer
    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
  });
});

describe('pairwise()', () => {
  it('emits [prev, curr] pairs for consecutive values', async () => {
    const result = await collect<[number, number]>(of(1, 2, 3).pipe(pairwise()));

    expect(result).toEqual([
      [1, 2],
      [2, 3],
    ]);
  });

  it('emits nothing for a single-value source', async () => {
    const result = await collect<[number, number]>(of(1).pipe(pairwise()));

    expect(result).toEqual([]);
  });
});

describe('scan()', () => {
  it('accumulates values', async () => {
    const result = await collect<number>(of(1, 2, 3).pipe(scan((acc, n) => (acc as number) + (n as number), 0)));

    expect(result).toEqual([1, 3, 6]);
  });
});

describe('switchMap()', () => {
  it('cancels previous inner on new outer emission', async () => {
    const outer = createSubject<number>();
    let innerCount = 0;

    outer
      .pipe(
        switchMap(() => {
          innerCount++;

          return of(innerCount);
        }),
      )
      .subscribe(() => {});

    outer.emit(1);
    outer.emit(2);
    outer.complete();
    expect(innerCount).toBe(2);
  });
});

describe('flatMap()', () => {
  it('merges inner fluxes concurrently', async () => {
    const result = await collect<number>(of(1, 2).pipe(flatMap((n) => of(n as number, (n as number) * 10))));

    expect(result).toEqual([1, 10, 2, 20]);
  });
});

describe('concatMap()', () => {
  it('subscribes to inner fluxes sequentially', async () => {
    const result = await collect<string>(of('a', 'b').pipe(concatMap((s) => of(`${s as string}1`, `${s as string}2`))));

    expect(result).toEqual(['a1', 'a2', 'b1', 'b2']);
  });

  it('drops queued items that exceed maxBuffer', async () => {
    const subject = createSubject<number>();
    const inner = createSubject<number>();
    const received: number[] = [];

    subject.pipe(concatMap((_v) => inner, 1)).subscribe((n) => received.push(n as number));

    subject.emit(1);
    subject.emit(2);
    subject.emit(3);
    inner.emit(10);
    inner.complete();
    subject.dispose();
    expect(received).toEqual([10]);
  });
});

describe('distinctUntilChanged()', () => {
  it('suppresses consecutive duplicates', async () => {
    const result = await collect<number>(of(1, 1, 2, 2, 3).pipe(distinctUntilChanged()));

    expect(result).toEqual([1, 2, 3]);
  });

  it('uses custom comparator', async () => {
    const result = await collect<{ v: number }>(
      of({ v: 1 }, { v: 1 }, { v: 2 }).pipe(
        distinctUntilChanged((a, b) => (a as { v: number }).v === (b as { v: number }).v),
      ),
    );

    expect(result).toHaveLength(2);
  });
});

// ── Filtering ────────────────────────────────────────────────────────────────

describe('take()', () => {
  it('emits first N values then completes', async () => {
    const result = await collect<number>(of(1, 2, 3, 4, 5).pipe(take(3)));

    expect(result).toEqual([1, 2, 3]);
  });

  it('take(0) completes immediately', async () => {
    const result = await collect<number>(of(1, 2).pipe(take(0)));

    expect(result).toEqual([]);
  });
});

describe('skip()', () => {
  it('skips first N values', async () => {
    const result = await collect<number>(of(1, 2, 3, 4).pipe(skip(2)));

    expect(result).toEqual([3, 4]);
  });
});

describe('first()', () => {
  it('emits only the first value', async () => {
    const result = await collect<number>(of(10, 20, 30).pipe(first()));

    expect(result).toEqual([10]);
  });
});

describe('last()', () => {
  it('emits only the last value', async () => {
    const result = await collect<number>(of(1, 2, 3).pipe(last()));

    expect(result).toEqual([3]);
  });
});

describe('takeWhile()', () => {
  it('completes when predicate is false', async () => {
    const result = await collect<number>(of(1, 2, 3, 4).pipe(takeWhile((n) => (n as number) < 3)));

    expect(result).toEqual([1, 2]);
  });
});

describe('takeUntil()', () => {
  it('stops on AbortSignal abort', async () => {
    const ac = new AbortController();
    const subject = createSubject<number>();
    const received: number[] = [];

    subject.pipe(takeUntil(ac.signal)).subscribe((n) => received.push(n as number));

    subject.emit(1);
    ac.abort();
    subject.emit(2);
    expect(received).toEqual([1]);
    subject.dispose();
  });

  it('stops on notifier Flux emit', () => {
    const source = createSubject<number>();
    const stop = createSubject<void>();
    const received: number[] = [];

    source.pipe(takeUntil(stop)).subscribe((n) => received.push(n as number));

    source.emit(1);
    stop.emit();
    source.emit(2);
    expect(received).toEqual([1]);
    source.dispose();
    stop.dispose();
  });
});

describe('debounce()', () => {
  it('only emits after silence period', () =>
    new Promise<void>((resolve) => {
      const subject = createSubject<number>();
      const received: number[] = [];

      subject.pipe(debounce(20)).subscribe((n) => received.push(n as number));

      subject.emit(1);
      subject.emit(2);
      subject.emit(3);

      setTimeout(() => {
        expect(received).toEqual([3]);
        subject.dispose();
        resolve();
      }, 50);
    }));
});

describe('sample()', () => {
  it('emits latest source value on each notifier emission', () => {
    const source = createSubject<number>();
    const notifier = createSubject<void>();
    const received: number[] = [];

    source.pipe(sample(notifier)).subscribe((n) => received.push(n as number));

    source.emit(1);
    source.emit(2);
    notifier.emit();
    source.emit(3);
    notifier.emit();

    expect(received).toEqual([2, 3]);
    source.dispose();
    notifier.dispose();
  });
});

describe('throttle()', () => {
  it('limits emission rate', () => {
    const received: number[] = [];

    of(1, 2, 3)
      .pipe(throttle(100))
      .subscribe((n) => received.push(n as number));
    expect(received).toEqual([1]);
  });

  it('accepts a custom clock for deterministic testing', () => {
    let t = 0;
    const received: number[] = [];
    const subject = createSubject<number>();

    subject.pipe(throttle(100, () => t)).subscribe((n) => received.push(n as number));

    t = 0;
    subject.emit(1);
    t = 50;
    subject.emit(2);
    t = 100;
    subject.emit(3);
    t = 150;
    subject.emit(4);
    subject.dispose();

    expect(received).toEqual([1, 3]);
  });
});

// ── Combination ─────────────────────────────────────────────────────────────

describe('merge()', () => {
  it('emits from all sources', async () => {
    const result = await toArray(merge(of(1, 2), of(3, 4)));

    expect(result.sort()).toEqual([1, 2, 3, 4]);
  });

  it('forwards an error from any source and unsubscribes the others', () => {
    const a = createSubject<number>();
    const b = createSubject<number>();
    const onErr = vi.fn();
    const receivedFromB: number[] = [];

    merge(a, b).subscribe({ error: onErr, next: (v) => receivedFromB.push(v as number) });

    a.fail(new Error('a-boom'));
    b.emit(1); // b is unsubscribed once merge errors — must not be received

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'a-boom' }));
    expect(receivedFromB).toEqual([]);
    b.dispose();
  });
});

describe('concat()', () => {
  it('emits sources sequentially', async () => {
    const result = await toArray(concat(of(1, 2), of(3, 4)));

    expect(result).toEqual([1, 2, 3, 4]);
  });

  it('forwards an error and does not subscribe to the next source', () => {
    const onErr = vi.fn();
    const nextSourceSubscribed = vi.fn();
    const second = flux<number>(() => {
      nextSourceSubscribed();
    });

    concat(throwError(new Error('concat-boom')), second).subscribe({ error: onErr, next: () => {} });

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'concat-boom' }));
    expect(nextSourceSubscribed).not.toHaveBeenCalled();
  });
});

describe('combineLatest()', () => {
  it('emits tuple when all have value', () => {
    const a = createSubject<number>();
    const b = createSubject<string>();
    const received: [number, string][] = [];

    combineLatest(a, b).subscribe((v) => received.push(v as [number, string]));

    a.emit(1);
    b.emit('x');
    a.emit(2);
    expect(received).toEqual([
      [1, 'x'],
      [2, 'x'],
    ]);
    a.dispose();
    b.dispose();
  });

  it('forwards an error from any source', () => {
    const a = createSubject<number>();
    const b = createSubject<string>();
    const onErr = vi.fn();

    combineLatest(a, b).subscribe({ error: onErr, next: () => {} });

    b.fail(new Error('b-boom'));

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'b-boom' }));
    a.dispose();
  });
});

describe('race()', () => {
  it('emits first value from the fastest source', () => {
    const a = createSubject<string>();
    const b = createSubject<string>();
    const received: string[] = [];

    race(a, b).subscribe((v) => received.push(v));

    b.emit('fast');
    a.emit('slow');
    expect(received).toEqual(['fast']);
    a.dispose();
    b.dispose();
  });

  it('a source erroring first wins the race and unsubscribes the others', () => {
    const a = createSubject<string>();
    const b = createSubject<string>();
    const onErr = vi.fn();
    const received: string[] = [];

    race(a, b).subscribe({ error: onErr, next: (v) => received.push(v) });

    a.fail(new Error('a-boom'));
    b.emit('too-late'); // b is unsubscribed once a wins by erroring

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'a-boom' }));
    expect(received).toEqual([]);
    b.dispose();
  });
});

describe('zip()', () => {
  it('pairs values by index', async () => {
    const result = await toArray(zip(of(1, 2), of('a', 'b')));

    expect(result).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
  });

  it('forwards an error from any source', () => {
    const a = createSubject<number>();
    const b = createSubject<string>();
    const onErr = vi.fn();

    zip(a, b).subscribe({ error: onErr, next: () => {} });

    a.fail(new Error('zip-boom'));

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'zip-boom' }));
    b.dispose();
  });
});

describe('forkJoin()', () => {
  it('emits one tuple of last values when all sources complete', async () => {
    const result = await toArray(forkJoin(of(1, 2), of('a', 'b')));

    expect(result).toEqual([[2, 'b']]);
  });

  it('forwards an error from any source', () => {
    const a = createSubject<number>();
    const b = createSubject<string>();
    const onErr = vi.fn();

    forkJoin(a, b).subscribe({ error: onErr, next: () => {} });

    a.fail(new Error('forkJoin-boom'));

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'forkJoin-boom' }));
    b.dispose();
  });
});

describe('withLatestFrom()', () => {
  it('combines source value with latest from others', () => {
    const source = createSubject<number>();
    const other = createSubject<string>();
    const received: [number, string][] = [];

    source.pipe(withLatestFrom(other)).subscribe((v) => received.push(v as [number, string]));

    other.emit('a');
    source.emit(1);
    other.emit('b');
    source.emit(2);

    expect(received).toEqual([
      [1, 'a'],
      [2, 'b'],
    ]);
    source.dispose();
    other.dispose();
  });

  it('forwards an error from the source', () => {
    const source = createSubject<number>();
    const other = createSubject<string>();
    const onErr = vi.fn();

    source.pipe(withLatestFrom(other)).subscribe({ error: onErr, next: () => {} });

    source.fail(new Error('source-boom'));

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'source-boom' }));
    other.dispose();
  });

  it('forwards an error from "other" (regression — previously swallowed silently)', () => {
    const source = createSubject<number>();
    const other = createSubject<string>();
    const onErr = vi.fn();

    source.pipe(withLatestFrom(other)).subscribe({ error: onErr, next: () => {} });

    other.emit('a');
    other.fail(new Error('other-boom'));

    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'other-boom' }));
    source.dispose();
  });

  it('does not emit when no value from other yet', () => {
    const source = createSubject<number>();
    const other = createSubject<string>();
    const received: unknown[] = [];

    source.pipe(withLatestFrom(other)).subscribe((v) => received.push(v));
    source.emit(1);

    expect(received).toEqual([]);
    source.dispose();
    other.dispose();
  });
});

// ── Utility ──────────────────────────────────────────────────────────────────

describe('tap()', () => {
  it('runs side effect without modifying value', async () => {
    const seen: number[] = [];
    const result = await collect<number>(of(1, 2, 3).pipe(tap((n) => seen.push(n as number))));

    expect(seen).toEqual([1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe('share()', () => {
  it('multicasts to multiple subscribers', () => {
    let produced = 0;
    const source = flux<number>((obs) => {
      produced++;
      obs.next(1);
    });
    const shared = source.pipe(share<number>());
    const a: number[] = [];
    const b: number[] = [];

    const ua = shared.subscribe((n) => a.push(n as number));
    const ub = shared.subscribe((n) => b.push(n as number));

    expect(produced).toBe(1);
    ua();
    ub();
  });
});

describe('shareReplay()', () => {
  it('replays buffered values to late subscriber', () => {
    const subject = createSubject<number>();
    const shared = subject.pipe(shareReplay<number>(2));
    const first: number[] = [];

    const u1 = shared.subscribe((n) => first.push(n as number));

    subject.emit(1);
    subject.emit(2);
    subject.emit(3);

    const late: number[] = [];

    shared.subscribe((n) => late.push(n as number));
    expect(late).toEqual([2, 3]);
    u1();
    subject.dispose();
  });

  it('warns via console.warn when bufferSize is clamped', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    of(1)
      .pipe(shareReplay<number>(0))
      .subscribe(() => {});

    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0]?.[0]).toContain('[@vielzeug/flux]');
    expect(spy.mock.calls[0]?.[0]).toContain('shareReplay');

    spy.mockRestore();
  });

  it('treats an Infinity bufferSize as 1 rather than buffering unboundedly', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const subject = createSubject<number>();
    const shared = subject.pipe(shareReplay<number>(Infinity));

    shared.subscribe(() => {});
    subject.emit(1);
    subject.emit(2);
    subject.emit(3);

    const late: number[] = [];

    shared.subscribe((n) => late.push(n as number));
    expect(late).toEqual([3]); // capped at 1, not the full history

    spy.mockRestore();
    subject.dispose();
  });
});

describe('delay()', () => {
  it('delays emissions', () =>
    new Promise<void>((resolve) => {
      const start = Date.now();

      of(1)
        .pipe(delay(30))
        .subscribe({
          complete() {
            expect(Date.now() - start).toBeGreaterThanOrEqual(25);
            resolve();
          },
          next: () => {},
        });
    }));
});

describe('catchError()', () => {
  it('recovers from error with fallback flux', async () => {
    const source = flux<number>((obs) => {
      obs.error?.(new Error('oops'));
    });
    const result = await collect<number>(source.pipe(catchError(() => of(99))));

    expect(result).toEqual([99]);
  });
});

describe('retry()', () => {
  it('retries N times on error then propagates', () => {
    let attempts = 0;
    const onErr = vi.fn();
    const source = flux<number>((obs) => {
      attempts++;
      obs.error?.(new Error('fail'));
    });

    source.pipe(retry(2)).subscribe({ error: onErr, next: () => {} });
    expect(attempts).toBe(3);
    expect(onErr).toHaveBeenCalledOnce();
  });

  it('retry with delayMs delays re-subscription', () =>
    new Promise<void>((resolve) => {
      let attempts = 0;
      const start = Date.now();
      const source = flux<number>((obs) => {
        attempts++;

        if (attempts < 3) {
          obs.error?.(new Error('fail'));
        } else {
          obs.next(42);
          obs.complete?.();
        }
      });

      source.pipe(retry(2, 20)).subscribe({
        complete() {
          expect(Date.now() - start).toBeGreaterThanOrEqual(30);
          expect(attempts).toBe(3);
          resolve();
        },
        next: () => {},
      });
    }));
});

describe('finalize()', () => {
  it('called on complete', () => {
    const fn = vi.fn();

    of(1)
      .pipe(finalize(fn))
      .subscribe(() => {});
    expect(fn).toHaveBeenCalledOnce();
  });

  it('called on unsubscribe', () => {
    const fn = vi.fn();
    const subject = createSubject<number>();
    const unsub = subject.pipe(finalize(fn)).subscribe(() => {});

    unsub();
    expect(fn).toHaveBeenCalledOnce();
    subject.dispose();
  });
});

describe('toPromise()', () => {
  it('resolves with last value', async () => {
    const result = await toPromise(of(1, 2, 3));

    expect(result).toBe(3);
  });

  it('rejects immediately when signal is already aborted', async () => {
    const ac = new AbortController();

    ac.abort();
    await expect(toPromise(never(), ac.signal)).rejects.toBeInstanceOf(DOMException);
  });

  it('rejects and unsubscribes when signal aborts mid-stream', async () => {
    const ac = new AbortController();
    const subject = createSubject<number>();

    const pending = toPromise(subject, ac.signal);

    ac.abort();
    await expect(pending).rejects.toBeInstanceOf(DOMException);
    expect(subject.pipe).toBeDefined(); // subject itself is untouched; only our subscription stopped

    subject.dispose();
  });
});

describe('toArray()', () => {
  it('collects all values', async () => {
    const result = await toArray(of('a', 'b', 'c'));

    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('resolves with values collected so far when signal aborts mid-stream', async () => {
    const ac = new AbortController();
    const subject = createSubject<number>();

    const pending = toArray(subject, ac.signal);

    subject.emit(1);
    subject.emit(2);
    ac.abort();

    await expect(pending).resolves.toEqual([1, 2]);

    subject.emit(3); // no longer subscribed — must not throw or affect the resolved array
    subject.dispose();
  });

  it('resolves with an empty array immediately when signal is already aborted', async () => {
    const ac = new AbortController();

    ac.abort();
    await expect(toArray(never(), ac.signal)).resolves.toEqual([]);
  });

  it('does not leak an abort listener when the source completes synchronously', async () => {
    const ac = new AbortController();
    const addSpy = vi.spyOn(ac.signal, 'addEventListener');
    const removeSpy = vi.spyOn(ac.signal, 'removeEventListener');

    await toArray(of(1, 2, 3), ac.signal);

    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy.mock.calls[0]?.[1]).toBe(addSpy.mock.calls[0]?.[1]); // same listener removed as added
  });
});

describe('timeout()', () => {
  it('errors after ms without emission', () =>
    new Promise<void>((resolve) => {
      never()
        .pipe(timeout(20))
        .subscribe({
          error(err) {
            expect(err).toBeInstanceOf(Error);
            resolve();
          },
          next: () => {},
        });
    }));

  it('FluxTimeoutError exposes .ms property', () =>
    new Promise<void>((resolve) => {
      never()
        .pipe(timeout(25))
        .subscribe({
          error(err) {
            expect(err).toBeInstanceOf(FluxTimeoutError);
            expect((err as FluxTimeoutError).ms).toBe(25);
            resolve();
          },
          next: () => {},
        });
    }));
});

// ── flow() ────────────────────────────────────────────────────────────────────

describe('flow()', () => {
  it('composes multiple operators into a single reusable operator', async () => {
    const pipeline = flow(
      filter((n: number) => n % 2 === 0),
      map((n: number) => n * 10),
      take(3),
    );
    const result = await collect<number>(of(1, 2, 3, 4, 5, 6, 7).pipe(pipeline));

    expect(result).toEqual([20, 40, 60]);
  });

  it('single operator passthrough', async () => {
    const result = await collect<number>(of(1, 2, 3).pipe(flow(map((n: number) => n + 1))));

    expect(result).toEqual([2, 3, 4]);
  });
});

// ── flatMap memory-leak fix ───────────────────────────────────────────────────

describe('flatMap() memory-leak fix', () => {
  it('completed inner subscriptions are removed from the tracking set', () => {
    const inners = [createSubject<number>(), createSubject<number>()];
    const outer = createSubject<number>();
    const received: number[] = [];
    let i = 0;

    outer.pipe(flatMap(() => inners[i++]!)).subscribe((n) => received.push(n as number));

    outer.emit(1);
    inners[0]!.emit(10);
    inners[0]!.complete();

    outer.emit(2);
    inners[1]!.emit(20);

    expect(received).toEqual([10, 20]);
    outer.dispose();
  });
});

// ── bufferCount overlapping window ───────────────────────────────────────────

describe('bufferCount() overlapping windows', () => {
  it('emits full windows and flushes partial windows on complete', async () => {
    const result = await collect<number[]>(of(1, 2, 3, 4).pipe(bufferCount(3, 1)));

    expect(result).toEqual([[1, 2, 3], [2, 3, 4], [3, 4], [4]]);
  });
});

// ── retry() backoff fn ────────────────────────────────────────────────────────

describe('retry() backoff function', () => {
  it('passes attempt index to backoff function', async () => {
    const attempts: number[] = [];
    let calls = 0;

    await toPromise(
      flux<number>((obs) => {
        const n = calls++;

        if (n < 3) {
          obs.error?.(new Error('fail'));
        } else {
          obs.next(n);
          obs.complete?.();
        }
      }).pipe(
        retry(3, (n) => {
          attempts.push(n);

          return 0;
        }),
      ),
    );

    expect(attempts).toEqual([0, 1, 2]);
  });
});

// ── throwError() factory overload ────────────────────────────────────────────

describe('throwError() factory', () => {
  it('accepts an error factory function', async () => {
    const err = await toPromise(
      flux<never>((obs) => {
        obs.error?.(new Error('factory'));
      }).pipe(catchError(() => throwError(() => new Error('from-factory')))),
    ).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe('from-factory');
  });
});

// ── Custom Scheduler ──────────────────────────────────────────────────────────

function makeTestScheduler(): Scheduler & { flush(): void } {
  const queue: Array<{ fn: () => void; ms: number; repeat: boolean }> = [];

  function advance(ms: number): void {
    for (const entry of [...queue]) {
      if (entry.ms <= ms) {
        entry.fn();

        if (!entry.repeat) queue.splice(queue.indexOf(entry), 1);
      }
    }
  }

  return {
    delay(fn, ms) {
      const entry = { fn, ms, repeat: false };

      queue.push(entry);

      return () => queue.splice(queue.indexOf(entry), 1);
    },
    flush() {
      advance(Infinity);
    },
    repeat(fn, ms) {
      const entry = { fn, ms, repeat: true };

      queue.push(entry);

      return () => queue.splice(queue.indexOf(entry), 1);
    },
  };
}

describe('custom Scheduler', () => {
  it('debounce() uses custom scheduler', () => {
    const sched = makeTestScheduler();
    const subject = createSubject<number>();
    const received: number[] = [];

    subject.pipe(debounce(100, sched)).subscribe((n) => received.push(n as number));
    subject.emit(1);
    subject.emit(2);
    subject.emit(3);

    expect(received).toEqual([]);
    sched.flush();
    expect(received).toEqual([3]);
    subject.dispose();
  });

  it('timeout() uses custom scheduler', () => {
    const sched = makeTestScheduler();
    const error = vi.fn();

    never()
      .pipe(timeout(100, sched))
      .subscribe({ error, next: () => {} });
    sched.flush();
    expect(error).toHaveBeenCalledOnce();
  });

  it('delay() uses custom scheduler', () => {
    const sched = makeTestScheduler();
    const received: number[] = [];

    of(1, 2, 3)
      .pipe(delay(100, sched))
      .subscribe((n) => received.push(n as number));
    expect(received).toEqual([]);
    sched.flush();
    expect(received).toEqual([1, 2, 3]);
  });

  it('interval() uses custom scheduler', () => {
    const sched = makeTestScheduler();
    const received: number[] = [];
    const unsub = interval(100, sched).subscribe((n) => received.push(n as number));

    expect(received).toEqual([]);
    sched.flush();
    sched.flush();
    expect(received).toEqual([0, 1]);
    unsub();
  });

  it('timer() uses custom scheduler for one-shot delay', () => {
    const sched = makeTestScheduler();
    const received: number[] = [];

    timer(100, undefined, sched).subscribe((n) => received.push(n as number));
    expect(received).toEqual([]);
    sched.flush();
    expect(received).toEqual([0]);
  });

  it('DEFAULT_SCHEDULER is a valid Scheduler', () => {
    const received: number[] = [];
    const unsub = interval(0, DEFAULT_SCHEDULER).subscribe((n) => received.push(n as number));

    unsub();
    expect(DEFAULT_SCHEDULER).toHaveProperty('delay');
    expect(DEFAULT_SCHEDULER).toHaveProperty('repeat');
  });

  it('retry() uses custom scheduler for backoff delay', () => {
    const sched = makeTestScheduler();
    let calls = 0;
    const received: number[] = [];

    flux<number>((obs) => {
      calls++;

      if (calls < 3) {
        obs.error?.(new Error('fail'));
      } else {
        obs.next(42);
        obs.complete?.();
      }
    })
      .pipe(retry(3, 100, sched))
      .subscribe((n) => received.push(n as number));

    expect(calls).toBe(1);
    sched.flush();
    sched.flush();
    expect(received).toEqual([42]);
  });
});

// ── Zero-sources edge cases ───────────────────────────────────────────────────

describe('merge() — zero sources', () => {
  it('completes immediately', async () => {
    const result = await toArray(merge());

    expect(result).toEqual([]);
  });
});

describe('race() — zero sources', () => {
  it('completes immediately', async () => {
    const result = await toArray(race());

    expect(result).toEqual([]);
  });
});

describe('zip() — zero sources', () => {
  it('completes immediately', async () => {
    const result = await toArray(zip());

    expect(result).toEqual([]);
  });
});

describe('forkJoin() — zero sources', () => {
  it('completes immediately', async () => {
    const result = await toArray(forkJoin());

    expect(result).toEqual([]);
  });
});

describe('combineLatest() — zero sources', () => {
  it('completes immediately', async () => {
    const result = await toArray(combineLatest());

    expect(result).toEqual([]);
  });
});

// ── share() refcount reconnect ────────────────────────────────────────────────

describe('share() — refcount reconnect', () => {
  it('reconnects the source when a new subscriber arrives after all left', () => {
    let starts = 0;
    const source = flux<number>((obs) => {
      starts++;
      obs.next(starts * 10);
    });
    const shared = source.pipe(share<number>());

    const a: number[] = [];
    const ua = shared.subscribe((n) => a.push(n as number));

    expect(starts).toBe(1);
    ua();

    const b: number[] = [];

    shared.subscribe((n) => b.push(n as number));

    expect(starts).toBe(2);
    expect(a).toEqual([10]);
    expect(b).toEqual([20]);
  });
});
