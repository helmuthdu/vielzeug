import { computed, nextValue, signal, store, type Subscription, watch } from '../';

// ─── watch ────────────────────────────────────────────────────────────────────

describe('watch', () => {
  it('fires with (next, prev) on change; silent before any change', () => {
    const n = signal(0);
    const listener = vi.fn();
    const stop = watch(n, listener);

    expect(listener).not.toHaveBeenCalled();
    n.value = 5;
    expect(listener).toHaveBeenCalledWith(5, 0);
    stop();
  });

  it('selector fires only when the selected slice changes', () => {
    const s = signal({ count: 0, name: 'Alice' });
    const listener = vi.fn();
    const count$ = computed(() => s.value.count);

    watch(count$, listener);
    s.value = { count: 5, name: 'Alice' };
    expect(listener).toHaveBeenCalledWith(5, 0);
    s.value = { count: 5, name: 'Bob' }; // count unchanged — suppressed
    expect(listener).toHaveBeenCalledTimes(1);
    count$.dispose();
  });

  it('{ immediate: true } fires with the current value on subscribe', () => {
    const n = signal(3);
    const listener = vi.fn();

    watch(n, listener, { immediate: true });
    expect(listener).toHaveBeenCalledWith(3, 3);
  });

  it('{ once: true } auto-unsubscribes after the first change', () => {
    const n = signal(0);
    const listener = vi.fn();

    watch(n, listener, { once: true });
    n.value = 1;
    n.value = 2;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 0);
  });

  it('{ once: true, immediate: true } fires immediately then once on first change', () => {
    const n = signal(0);
    const listener = vi.fn();

    watch(n, listener, { immediate: true, once: true });
    expect(listener).toHaveBeenCalledTimes(1); // immediate
    n.value = 1; // fires then auto-unsubscribes
    expect(listener).toHaveBeenCalledTimes(2);
    n.value = 2; // silent
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('custom equals suppresses notification for semantically equal values', () => {
    const s = signal([1, 2, 3]);
    const listener = vi.fn();

    watch(s, listener, { equals: (a, b) => a.length === b.length });
    s.value = [4, 5, 6]; // same length — suppressed
    expect(listener).not.toHaveBeenCalled();
    s.value = [1, 2, 3, 4]; // different length — fires
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe is isolated and calling it multiple times does not throw', () => {
    const n = signal(0);
    const l1 = vi.fn();
    const l2 = vi.fn();
    const stop = watch(n, l1);

    watch(n, l2);
    stop();
    stop(); // idempotent
    n.value = 1;
    expect(l1).not.toHaveBeenCalled();
    expect(l2).toHaveBeenCalledTimes(1);
  });

  it('returns a Subscription with .dispose() and [Symbol.dispose] aliases', () => {
    const n = signal(0);
    const listener = vi.fn();
    const sub: Subscription = watch(n, listener);

    expect(typeof sub.dispose).toBe('function');
    expect(typeof sub[Symbol.dispose]).toBe('function');
    sub.dispose();
    n.value = 1;
    expect(listener).not.toHaveBeenCalled();
  });
});

// ─── nextValue() ─────────────────────────────────────────────────────────────

describe('nextValue()', () => {
  it('resolves with the next changed value', async () => {
    const n = signal(0);
    const p = nextValue(n);

    n.value = 42;
    await expect(p).resolves.toBe(42);
  });

  it('auto-disposes — does not fire again after first emission', async () => {
    const n = signal(0);
    const listener = vi.fn();
    const p = nextValue(n).then(listener);

    n.value = 1;
    n.value = 2;
    await p;
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('predicate filters values until one passes', async () => {
    const n = signal(0);
    const p = nextValue(n, (v) => v > 5);

    n.value = 3; // fails predicate
    n.value = 7; // passes
    await expect(p).resolves.toBe(7);
  });

  it('works with store.select() slices', async () => {
    const s = store({ count: 0, name: 'Alice' });
    const count$ = s.select((st) => st.count);
    const p = nextValue(count$);

    s.patch({ name: 'Bob' }); // count unchanged — no emission
    s.patch({ count: 99 });
    await expect(p).resolves.toBe(99);
    count$.dispose();
  });

  it('rejects when the AbortSignal fires before the predicate matches', async () => {
    const n = signal(0);
    const controller = new AbortController();
    const p = nextValue(n, (v) => v > 100, { signal: controller.signal });

    controller.abort(new Error('cancelled'));
    await expect(p).rejects.toThrow('cancelled');
  });

  it('resolves normally when predicate matches before abort is fired', async () => {
    const n = signal(0);
    const controller = new AbortController();
    const p = nextValue(n, (v) => v > 0, { signal: controller.signal });

    n.value = 1;
    await expect(p).resolves.toBe(1);
    controller.abort(); // no-op after resolve
  });
});
