import {
  _SIGNAL_BRAND,
  computed,
  effect,
  type EffectCallback,
  isSignal,
  isStore,
  peekValue,
  readonly,
  type ReadonlySignal,
  signal,
  store,
  toValue,
  watch,
  writable,
} from '../';

// ─── signal ───────────────────────────────────────────────────────────────────

describe('signal', () => {
  it('holds and reflects the initial value', () => {
    expect(signal(42).value).toBe(42);
  });

  it('updates and reflects the new value on write', () => {
    const n = signal(0);

    n.value = 7;
    expect(n.value).toBe(7);
  });

  it('peek() returns the value without creating a reactive subscription', () => {
    const n = signal(1);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(n.peek());
    });

    n.value = 2; // n read only via peek — effect does NOT re-run
    expect(seen).toEqual([1]);
    stop();
  });

  it('write is a no-op when the new value is the same (Object.is)', () => {
    const n = signal(5);
    const listener = vi.fn();

    watch(n, listener);
    n.value = 5;
    expect(listener).not.toHaveBeenCalled();
  });

  it('custom equals suppresses writes for semantically equal values', () => {
    const pos = signal({ x: 0, y: 0 }, { equals: (a, b) => a.x === b.x && a.y === b.y });
    const listener = vi.fn();

    watch(pos, listener);
    pos.value = { x: 0, y: 0 }; // same coords, different ref — suppressed
    expect(listener).not.toHaveBeenCalled();
    pos.value = { x: 1, y: 0 }; // different — fires
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('update() applies the updater function to the current value', () => {
    const n = signal(5);

    n.update((v) => v * 2);
    expect(n.value).toBe(10);
  });

  it('update() skips notification when the result is equal (Object.is)', () => {
    const n = signal(5);
    const listener = vi.fn();

    watch(n, listener);
    n.update((v) => v); // returns the same value — should not fire
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── signal.update() ─────────────────────────────────────────────────────────

describe('signal.update()', () => {
  it('applies the updater and writes the result', () => {
    const n = signal(5);

    n.update((v) => v * 2);
    expect(n.value).toBe(10);
  });

  it('skips notification when the result is the same (Object.is)', () => {
    const n = signal(5);
    const listener = vi.fn();

    watch(n, listener);
    n.update((v) => v); // same value — no-op
    expect(listener).not.toHaveBeenCalled();
  });

  it('update() chaining accumulates correctly', () => {
    const n = signal(1);

    n.update((v) => v + 1);
    n.update((v) => v * 3);
    expect(n.value).toBe(6);
  });
});

// ─── type guards and utilities ────────────────────────────────────────────────

describe('type guards and utilities', () => {
  it('isSignal() is true for signal, computed, writable, and store', () => {
    expect(isSignal(signal(0))).toBe(true);
    expect(isSignal(computed(() => 1))).toBe(true);
    expect(
      isSignal(
        writable(
          () => 0,
          () => {},
        ),
      ),
    ).toBe(true);
    expect(isSignal(store({ x: 1 }))).toBe(true);
  });

  it('isSignal() is false for primitives, null, and plain objects', () => {
    expect(isSignal(null)).toBe(false);
    expect(isSignal(42)).toBe(false);
    expect(isSignal({ value: 0 })).toBe(false);
  });

  it('isStore() is true only for Store instances', () => {
    expect(isStore(store({ x: 0 }))).toBe(true);
    expect(isStore(signal(0))).toBe(false);
    expect(isStore(null)).toBe(false);
    expect(isStore({ x: 0 })).toBe(false);
  });

  it('isStore() narrows the type so Store methods are accessible', () => {
    const value: unknown = store({ name: 'Alice' });

    if (isStore<{ name: string }>(value)) {
      value.patch({ name: 'Bob' });
      expect(value.value.name).toBe('Bob');
    }
  });

  it('toValue() unwraps a signal and passes plain values through unchanged', () => {
    const n = signal(10);

    expect(toValue(n)).toBe(10);
    expect(toValue(42)).toBe(42);
  });

  it('readonly() returns a ReadonlySignal view that tracks reactively', () => {
    const n = signal(1);
    const ro = readonly(n);

    expect(ro.value).toBe(1);

    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(ro.value);
    });

    n.value = 2;
    expect(seen).toEqual([1, 2]);
    stop();
  });

  it('readonly() returns the same cached wrapper for repeated calls', () => {
    const n = signal(1);

    expect(readonly(n)).toBe(readonly(n));
  });

  it('_SIGNAL_BRAND is exported so consumers can create conforming mock signals', () => {
    const mockSig: ReadonlySignal<number> = {
      [_SIGNAL_BRAND]: true,
      peek: () => 42,
      value: 42,
    };

    expect(isSignal(mockSig)).toBe(true);
    expect(mockSig.value).toBe(42);
  });

  it('EffectCallback is exported and matches the effect fn signature', () => {
    const fn: EffectCallback = () => {};
    const stop = effect(fn);

    stop();
  });
});

// ─── peekValue() ─────────────────────────────────────────────────────────────

describe('peekValue()', () => {
  it('unwraps a signal without creating a reactive subscription', () => {
    const n = signal(1);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(peekValue(n));
    });

    n.value = 2; // n read via peekValue — effect does NOT re-run
    expect(seen).toEqual([1]);
    stop();
  });

  it('passes plain values through unchanged', () => {
    expect(peekValue(42)).toBe(42);
    expect(peekValue('hello')).toBe('hello');
  });

  it('returns the latest value without tracking even mid-effect', () => {
    const a = signal(10);
    const b = signal(20);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(a.value); // tracked
      peekValue(b); // not tracked
    });

    b.value = 99; // b changed — effect must NOT re-run
    expect(seen).toEqual([10]);
    a.value = 11; // a changed — effect re-runs, peekValue(b) returns 99
    expect(seen).toEqual([10, 11]);
    stop();
  });
});
