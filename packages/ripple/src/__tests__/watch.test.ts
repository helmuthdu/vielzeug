import { computed, signal, store, watch } from '../';
import { RippleError, RippleInvalidCleanupError } from '../';

describe('watch', () => {
  it('watches plain signal changes and reports next/prev', () => {
    const n = signal(0);
    const listener = vi.fn();
    const stop = watch(n, listener);

    n.value = 1;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 0);
    stop.dispose();
  });

  it('watches a store lens for fine-grained changes', () => {
    const cart = store({ count: 0, label: 'x' });
    const countLens = cart.lens('count');
    const listener = vi.fn();
    const stop = watch(countLens, (next, prev) => {
      listener(next, prev);
    });

    cart.patch({ label: 'y' });
    expect(listener).not.toHaveBeenCalled();
    cart.patch({ count: 2 });
    expect(listener).toHaveBeenCalledWith(2, 0);
    stop.dispose();
    cart.patch({ count: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('does not spuriously fire when a computed source returns a same-shaped new reference', () => {
    const n = signal(1);
    const listener = vi.fn();
    const wrapped = computed(() => ({ value: n.value }));
    const stop = watch(wrapped, listener, { equals: (a, b) => a.value === b.value });

    expect(listener).not.toHaveBeenCalled();
    n.value = 2;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ value: 2 }, { value: 1 });
    stop.dispose();
    wrapped.dispose();
  });

  it('does not fire after stop', () => {
    const s = signal({ x: 0, y: 0 });
    const log: number[] = [];
    const xDerived = computed(() => s.value.x);
    const stop = watch(xDerived, (next) => {
      log.push(next);
    });

    s.value = { x: 1, y: 99 };
    stop.dispose();
    s.value = { x: 2, y: 0 };
    expect(log).toEqual([1]);
    xDerived.dispose();
  });

  it('allows stop to be called multiple times', () => {
    const s = signal(0);
    const stop = watch(s, vi.fn());

    expect(() => {
      stop.dispose();
      stop.dispose();
    }).not.toThrow();
  });

  it('immediate: fires immediately with prev === undefined on first call', () => {
    const s = signal(1);
    const spy = vi.fn();

    watch(s, spy, { immediate: true });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(1, undefined);
  });

  it('immediate: provides real prev on subsequent changes', () => {
    const s = signal(1);
    const calls: Array<[number, number | undefined]> = [];
    const stop = watch(
      s,
      (v, p) => {
        calls.push([v, p]);
      },
      { immediate: true },
    );

    s.value = 2;
    s.value = 3;
    stop.dispose();
    expect(calls).toEqual([
      [1, undefined],
      [2, 1],
      [3, 2],
    ]);
  });

  it('does not fire callback on creation (no immediate)', () => {
    const s = signal(0);
    const calls: number[] = [];
    const stop = watch(s, (v) => void calls.push(v));

    expect(calls).toEqual([]);
    s.value = 1;
    expect(calls).toEqual([1]);
    stop.dispose();
  });

  it('fires with prev value on each change', () => {
    const s = signal('a');
    const log: Array<[string, string | undefined]> = [];
    const stop = watch(s, (next, prev) => void log.push([next, prev]));

    s.value = 'b';
    s.value = 'c';
    expect(log).toEqual([
      ['b', 'a'],
      ['c', 'b'],
    ]);
    stop.dispose();
  });

  it('fires immediately when immediate: true', () => {
    const s = signal(42);
    const calls: Array<[number, number | undefined]> = [];
    const stop = watch(s, (v, prev) => void calls.push([v, prev]), { immediate: true });

    expect(calls).toEqual([[42, undefined]]);
    s.value = 99;
    expect(calls).toEqual([
      [42, undefined],
      [99, 42],
    ]);
    stop.dispose();
  });

  it('runs callback cleanup on dispose', () => {
    const s = signal(0);
    const cleanups: number[] = [];
    const stop = watch(s, (v) => () => cleanups.push(v));

    s.value = 1;
    stop.dispose();
    expect(cleanups).toEqual([1]);
  });

  it('prev equals the initial signal value on the first change', () => {
    const s = signal(10);
    const prevValues: Array<number | undefined> = [];
    const stop = watch(s, (_next, prev) => {
      prevValues.push(prev);
    });

    s.value = 20;
    expect(prevValues).toEqual([10]);
    s.value = 30;
    expect(prevValues).toEqual([10, 20]);
    stop.dispose();
  });
});

describe('watch — equals option', () => {
  it('custom equals suppresses watch callback when predicate returns true', () => {
    const s = signal({ x: 1, y: 2 });
    const listener = vi.fn();
    const stop = watch(s, listener, { equals: (a, b) => a.x === b.x });

    s.value = { x: 1, y: 99 };
    expect(listener).not.toHaveBeenCalled();
    s.value = { x: 2, y: 99 };
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ x: 2, y: 99 }, { x: 1, y: 2 });
    stop.dispose();
  });

  it('custom equals fires on every change when predicate always returns false', () => {
    const s = signal(0);
    const listener = vi.fn();
    const stop = watch(s, listener, { equals: () => false });

    s.value = 1;
    expect(listener).toHaveBeenCalledTimes(1);
    s.value = 1;
    expect(listener).toHaveBeenCalledTimes(1);
    s.value = 2;
    expect(listener).toHaveBeenCalledTimes(2);
    stop.dispose();
  });

  it('can suppress based on prev value from last observed change', () => {
    const s = signal(0);
    const calls: number[] = [];
    const stop = watch(
      s,
      (next) => {
        calls.push(next);
      },
      { equals: (a, b) => Math.abs((a as number) - b) <= 5 },
    );

    s.value = 3;
    expect(calls).toHaveLength(0);
    s.value = 10;
    expect(calls).toEqual([10]);
    stop.dispose();
  });

  it('custom equals returning false always fires on every source-level change', () => {
    const s = signal(5);
    const calls: number[] = [];
    const stop = watch(
      s,
      (next) => {
        calls.push(next);
      },
      { equals: () => false },
    );

    s.value = 5;
    expect(calls).toHaveLength(0);
    s.value = 6;
    expect(calls).toEqual([6]);
    stop.dispose();
  });
});

describe('watch — cleanup', () => {
  it('cleanup returned by callback runs before next invocation', () => {
    const s = signal(0);
    const log: string[] = [];
    const stop = watch(s, (next) => {
      log.push(`cb:${next}`);

      return () => {
        log.push(`cleanup:${next}`);
      };
    });

    s.value = 1;
    expect(log).toEqual(['cb:1']);
    s.value = 2;
    expect(log).toEqual(['cb:1', 'cleanup:1', 'cb:2']);
    stop.dispose();
    expect(log).toEqual(['cb:1', 'cleanup:1', 'cb:2', 'cleanup:2']);
  });

  it('fires immediately with prev=undefined when immediate: true', () => {
    const s = signal(10);
    const calls: Array<[number, number | undefined]> = [];
    const stop = watch(
      s,
      (next, prev) => {
        calls.push([next, prev]);
      },
      { immediate: true },
    );

    expect(calls).toEqual([[10, undefined]]);
    s.value = 20;
    expect(calls).toEqual([
      [10, undefined],
      [20, 10],
    ]);
    stop.dispose();
  });

  it('runs cleanup from immediate call before next change', () => {
    const s = signal(0);
    const cleanups: string[] = [];
    const stop = watch(
      s,
      (next) => {
        cleanups.push(`setup-${next}`);

        return () => cleanups.push(`cleanup-${next}`);
      },
      { immediate: true },
    );

    expect(cleanups).toEqual(['setup-0']);
    s.value = 1;
    expect(cleanups).toEqual(['setup-0', 'cleanup-0', 'setup-1']);
    stop.dispose();
    expect(cleanups).toEqual(['setup-0', 'cleanup-0', 'setup-1', 'cleanup-1']);
  });
});

describe('watch — throws when callback returns non-function', () => {
  it('throws RippleError with INVALID_CLEANUP when returning a number', () => {
    const n = signal(1);
    let caught: unknown;

    // @ts-expect-error intentional
    watch(n, () => 42);

    try {
      n.value = 2;
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidCleanupError);
    n.dispose();
  });

  it('does not throw when callback returns a function', () => {
    const n = signal(1);
    const stop = watch(n, () => () => {});

    expect(() => stop.dispose()).not.toThrow();
  });

  it('does not throw when callback returns undefined', () => {
    const n = signal(1);
    const stop = watch(n, () => undefined);

    expect(() => stop.dispose()).not.toThrow();
  });
});

describe('watch — once option', () => {
  it('fires callback exactly once then auto-disposes', () => {
    const n = signal(0);
    const calls: number[] = [];

    watch(
      n,
      (v) => {
        calls.push(v);
      },
      { once: true },
    );
    n.value = 1;
    n.value = 2;
    n.value = 3;
    expect(calls).toEqual([1]);
    n.dispose();
  });

  it('immediate:true + once:true fires immediately then auto-disposes', () => {
    const n = signal(0);
    const calls: Array<number> = [];

    watch(
      n,
      (v) => {
        calls.push(v);
      },
      { immediate: true, once: true },
    );
    n.value = 1;
    expect(calls).toEqual([0]);
    n.dispose();
  });

  it('cleanup from once callback is invoked on auto-dispose', () => {
    const n = signal(0);
    let cleaned = false;

    watch(
      n,
      () => () => {
        cleaned = true;
      },
      { once: true },
    );
    n.value = 1;
    expect(cleaned).toBe(true);
    n.dispose();
  });
});

describe('watch — subscribe-based semantics', () => {
  it('fires callback when source value changes, not on creation', () => {
    const n = signal(0);
    const log: Array<[number, number | undefined]> = [];
    const stop = watch(
      n,
      (v, prev) => {
        log.push([v, prev]);
      },
      { name: 'myWatcher' },
    );

    expect(log).toEqual([]);
    n.value = 1;
    expect(log).toEqual([[1, 0]]);
    n.value = 2;
    expect(log).toEqual([
      [1, 0],
      [2, 1],
    ]);
    stop.dispose();
    n.dispose();
  });
});
