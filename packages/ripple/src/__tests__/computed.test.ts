import { computed, effect, onCleanup, signal } from '../';
import { RippleComputedCycleError, RippleError } from '../';

describe('computed', () => {
  it('derives values reactively', () => {
    const n = signal(2);
    const doubled = computed(() => n.value * 2);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(doubled.value);
    });

    n.value = 4;
    expect(seen).toEqual([4, 8]);
    stop.dispose();
    doubled.dispose();
  });

  it('returns last value silently when read after dispose (inert node)', () => {
    const n = signal(1);
    const c = computed(() => n.value + 1);

    expect(c.value).toBe(2);
    c.dispose();
    expect(c.value).toBe(2);
    expect(c.peek()).toBe(2);
  });

  it('returns undefined when disposed before first evaluation', () => {
    const n = signal(1);
    const c = computed(() => n.value + 1);

    c.dispose();
    expect(c.peek()).toBeUndefined();
  });

  it('subscribe() on disposed computed returns an already-disposed no-op Subscription', () => {
    const n = signal(1);
    const c = computed(() => n.value + 1);

    c.dispose();

    const listener = vi.fn();
    const sub = c.subscribe(listener);

    expect(sub.disposed).toBe(true);
    expect(listener).not.toHaveBeenCalled();
    expect(() => sub.dispose()).not.toThrow();
  });

  it('auto-disposes computed created inside an effect when the effect re-runs', () => {
    const toggle = signal(false);
    const inner = signal(0);
    const computedLog: number[] = [];
    const stop = effect(() => {
      if (toggle.value) {
        const c = computed(() => inner.value + 100);

        computedLog.push(c.value);
      }
    });

    toggle.value = true;
    inner.value = 5;
    toggle.value = false;
    toggle.value = true;
    expect(computedLog).toEqual([100, 105, 105]);
    stop.dispose();
  });

  it('throws RippleComputedCycleError on circular computed dependency', () => {
    const proxy = { fn: (): number => 0 };
    const a = computed(() => proxy.fn() + 1);
    const b = computed(() => a.value + 1);

    proxy.fn = () => b.value;

    let caught: unknown;

    try {
      void a.value;
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleComputedCycleError);
    expect((caught as RippleComputedCycleError).name).toBe('RippleComputedCycleError');
    a.dispose();
    b.dispose();
  });

  it('unsubscribes stale branch dependencies in conditionals', () => {
    const toggle = signal(true);
    const left = signal(1);
    const right = signal(10);
    const selected = computed(() => (toggle.value ? left.value : right.value));
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(selected.value);
    });

    toggle.value = false;
    left.value = 2;
    right.value = 11;
    expect(seen).toEqual([1, 10, 11]);
    stop.dispose();
    selected.dispose();
  });

  it('suppresses downstream effects when equals says value is unchanged', () => {
    const n = signal(0);
    const parity = computed(() => n.value % 2);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(parity.value);
    });

    n.value = 2;
    n.value = 4;
    n.value = 5;
    expect(seen).toEqual([0, 1]);
    stop.dispose();
    parity.dispose();
  });

  it('preserves the original computed error when a dep throws on removal', () => {
    const trigger = signal(false);
    const badDep = signal(0);
    const compRef = computed<number>(() => {
      if (!trigger.value) {
        void badDep.value;

        return 0;
      }

      throw new Error('computed-boom');
    });

    expect(compRef.value).toBe(0);

    let caught: unknown;

    try {
      trigger.value = true;
      void compRef.value;
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('computed-boom');
    compRef.dispose();
  });

  it('remains lazy when there are no subscribers', () => {
    const a = signal(2);
    const b = computed(() => a.value * 3);

    a.value = 10;
    expect(b.value).toBe(30);
  });

  it('throws on compute error', () => {
    const n = signal(0);
    const risky = computed(() => {
      if (n.value > 0) throw new Error('too big');

      return n.value;
    });

    expect(risky.value).toBe(0);
    n.value = 1;

    let caught: unknown;

    try {
      void risky.value;
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('too big');
    risky.dispose();
  });

  it('subscribe respects computed equality suppression', () => {
    const n = signal(0);
    const parity = computed(() => n.value % 2);
    const listener = vi.fn();
    const unsubscribe = parity.subscribe(listener);

    n.value = 2;
    n.value = 4;
    n.value = 5;
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe.dispose();
    parity.dispose();
  });

  it('computed subscribe eagerly establishes dependencies without emitting an initial callback', () => {
    const n = signal(1);
    let computeRuns = 0;
    const doubled = computed(() => {
      computeRuns++;

      return n.value * 2;
    });
    const listener = vi.fn();
    const unsubscribe = doubled.subscribe(listener);

    expect(computeRuns).toBe(1);
    expect(listener).not.toHaveBeenCalled();
    n.value = 2;
    expect(computeRuns).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe.dispose();
    doubled.dispose();
  });

  it('projects source reactively', () => {
    const n = signal(3);
    const doubled = computed(() => n.value * 2);

    expect(doubled.value).toBe(6);
    n.value = 5;
    expect(doubled.value).toBe(10);
    doubled.dispose();
  });

  it('name option propagates', () => {
    const n = signal(0);
    const named = computed(() => n.value + 1, { name: 'inc' });

    expect(named.name).toBe('inc');
    named.dispose();
  });

  it('name option sets the computed name', () => {
    const n = signal(1);
    const s = computed(() => n.value * 2, { name: 'doubler' });

    expect(s.name).toBe('doubler');
    s.dispose();
  });

  it('without name option has undefined name', () => {
    const n = signal(1);
    const s = computed(() => n.value);

    expect(s.name).toBeUndefined();
    s.dispose();
  });

  it('computed.name is accessible on Readable interface', () => {
    const n = signal(0);
    const c: import('../types').Computed<number> = computed(() => n.value, { name: 'doubled' });

    expect(c.name).toBe('doubled');
    c.dispose();
    n.dispose();
  });

  it('auto-disposes when created inside an effect', async () => {
    const a = signal(1);
    const toggle = signal(true);
    let disposeCount = 0;
    const stop = effect(() => {
      if (!toggle.value) return;

      const c = computed(() => a.value * 2);
      const origDispose = c.dispose.bind(c);

      c.dispose = () => {
        disposeCount++;
        origDispose();
      };
      void c.value;
    });

    expect(disposeCount).toBe(0);
    toggle.value = false;
    expect(disposeCount).toBe(1);
    stop.dispose();
  });
});

describe('diamond dep deduplication', () => {
  it('changing A in A→B, A→C, B+C→D only recomputes D once', () => {
    const a = signal(1);
    const b = computed(() => a.value * 2);
    const c = computed(() => a.value * 3);
    let dRuns = 0;
    const d = computed(() => {
      dRuns++;

      return b.value + c.value;
    });

    expect(d.value).toBe(5);
    expect(dRuns).toBe(1);

    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(d.value);
    });

    expect(dRuns).toBe(1);
    a.value = 2;
    expect(dRuns).toBe(2);
    expect(d.value).toBe(10);
    expect(seen.at(-1)).toBe(10);
    stop.dispose();
    b.dispose();
    c.dispose();
    d.dispose();
  });

  it('version fast-path skips recompute when deps have not changed', () => {
    const a = signal(1);
    let runs = 0;
    const c = computed(() => {
      runs++;

      return a.value + 1;
    });

    expect(c.value).toBe(2);
    expect(runs).toBe(1);
    expect(c.value).toBe(2);
    expect(runs).toBe(1);
    c.dispose();
  });
});

describe('graph propagation correctness', () => {
  it('nested effects do not leak subscriptions across scope boundaries', () => {
    const a = signal(0);
    const b = signal(0);
    const outerLog: number[] = [];
    const innerLog: number[] = [];
    const stopOuter = effect(() => {
      outerLog.push(a.value);

      const stopInner = effect(() => {
        innerLog.push(b.value);
      });

      onCleanup(() => stopInner.dispose());
    });

    b.value = 1;
    expect(innerLog).toEqual([0, 1]);
    expect(outerLog).toEqual([0]);
    a.value = 1;
    expect(outerLog).toEqual([0, 1]);
    stopOuter.dispose();
  });

  it('runs effect subscribed to source+computed once per source write', () => {
    const n = signal(1);
    const doubled = computed(() => n.value * 2);
    const runs: number[] = [];
    const stop = effect(() => {
      void n.value;
      void doubled.value;
      runs.push(1);
    });

    expect(runs).toHaveLength(1);
    n.value = 5;
    expect(runs).toHaveLength(2);
    stop.dispose();
    doubled.dispose();
  });

  it('keeps signal+computed snapshots consistent', () => {
    const n = signal(1);
    const doubled = computed(() => n.value * 2);
    const seen: Array<[number, number]> = [];
    const stop = effect(() => {
      seen.push([n.value, doubled.value]);
    });

    n.value = 5;
    stop.dispose();
    for (const [raw, derived] of seen) expect(derived).toBe(raw * 2);
    expect(seen.at(-1)).toEqual([5, 10]);
  });

  it('keeps multi-computed snapshots consistent', () => {
    const n = signal(1);
    const doubled = computed(() => n.value * 2);
    const tripled = computed(() => n.value * 3);
    const seen: Array<[number, number, number]> = [];
    const stop = effect(() => {
      seen.push([n.value, doubled.value, tripled.value]);
    });

    n.value = 5;
    expect(seen).toHaveLength(2);
    expect(seen.at(-1)).toEqual([5, 10, 15]);
    stop.dispose();
    doubled.dispose();
    tripled.dispose();
  });

  it('cascade writes are not suppressed when an effect subscribes to both source and derived signal', () => {
    const x = signal(0);
    const y = signal(0);
    const seen: Array<[number, number]> = [];
    const stopB = effect(() => {
      seen.push([x.value, y.value]);
    });
    const stopA = effect(() => {
      if (x.value === 1) y.value = 7;
    });

    x.value = 1;
    expect(seen.at(-1)).toEqual([1, 7]);
    expect(seen).toContainEqual([1, 0]);
    stopB.dispose();
    stopA.dispose();
  });
});
