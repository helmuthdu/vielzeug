import { computed, derived, signal, store, watch, writable } from '../';

// ─── computed ─────────────────────────────────────────────────────────────────

describe('computed', () => {
  it('returns the initial computed value immediately', () => {
    const n = signal(5);

    expect(computed(() => n.value * 2).value).toBe(10);
  });

  it('updates when a dep changes', () => {
    const n = signal(1);
    const doubled = computed(() => n.value * 2);

    n.value = 4;
    expect(doubled.value).toBe(8);
  });

  it('does not notify watchers when the computed value is unchanged', () => {
    const s = store({ count: 0, name: 'Alice' });
    const name$ = computed(() => s.value.name);
    const listener = vi.fn();

    watch(name$, listener);
    s.patch({ count: 99 }); // name unchanged
    expect(listener).not.toHaveBeenCalled();
  });

  it('tracks multiple deps and stays in sync with both', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = computed(() => a.value + b.value);

    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 20;
    expect(sum.value).toBe(30);
  });

  it('is lazy — does not recompute unless .value is read after a dep change', () => {
    let computeCount = 0;
    const n = signal(0);
    const doubled = computed(() => {
      computeCount++;

      return n.value * 2;
    });

    expect(computeCount).toBe(1); // initial seed
    n.value = 5; // dep changed — should NOT recompute yet
    expect(computeCount).toBe(1);
    expect(doubled.value).toBe(10); // read triggers lazy recompute
    expect(computeCount).toBe(2);
  });

  it('.dispose() stops tracking and leaves value stale', () => {
    const n = signal(0);
    const doubled = computed(() => n.value * 2);
    const listener = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    watch(doubled, listener);
    doubled.dispose();
    n.value = 5;
    expect(doubled.value).toBe(0); // stale
    expect(listener).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns in dev when reading a disposed ComputedSignal', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = computed(() => 42);

    c.dispose();
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    c.value;
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('disposed'));
    warnSpy.mockRestore();
  });

  it('exposes .dispose() and [Symbol.dispose] for uniform cleanup', () => {
    const c = computed(() => 42);

    expect(typeof c.dispose).toBe('function');
    expect(typeof c[Symbol.dispose]).toBe('function');
    c[Symbol.dispose]();
    expect(c.stale).toBe(true);
  });

  it('custom equals suppresses downstream notifications when result is semantically unchanged', () => {
    const s = signal({ items: [1, 2, 3] });
    const len = computed(() => s.value.items.length, { equals: (a, b) => a === b });
    const listener = vi.fn();

    watch(len, listener);
    s.value = { items: [4, 5, 6] }; // same length — downstream suppressed
    expect(listener).not.toHaveBeenCalled();
    s.value = { items: [1, 2, 3, 4] }; // length changed — fires
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(4, 3);
  });
});

// ─── computed({ lazy: true }) ─────────────────────────────────────────────────

describe('computed({ lazy: true })', () => {
  it('does not run the compute fn until .value is first read', () => {
    let runs = 0;
    const n = signal(0);
    const c = computed(
      () => {
        runs++;

        return n.value * 2;
      },
      { lazy: true },
    );

    expect(runs).toBe(0); // not yet computed
    expect(c.value).toBe(0); // triggers first compute
    expect(runs).toBe(1);
  });

  it('behaves like a normal computed after first read', () => {
    const n = signal(1);
    const c = computed(() => n.value + 10, { lazy: true });

    expect(c.value).toBe(11);
    n.value = 5;
    expect(c.value).toBe(15);
  });
});

// ─── computed({ lazy: true }) + dispose + peek() ─────────────────────────────

describe('computed({ lazy: true }) + dispose + peek()', () => {
  it('peek() on a lazy disposed computed warns in dev and returns undefined', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const c = computed(() => 42, { lazy: true }); // never read before dispose

    c.dispose();

    const result = c.peek();

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('disposed lazy'));
    warnSpy.mockRestore();
  });

  it('peek() on a normally-disposed (non-lazy) computed returns the last valid value, not undefined', () => {
    const n = signal(7);
    const c = computed(() => n.value * 2); // eagerly seeded

    c.dispose();

    // Non-lazy: value was seeded at construction, so peek() returns that — no warn
    expect(c.peek()).toBe(14);
  });
});

// ─── ComputedSignal.stale ─────────────────────────────────────────────────────

describe('ComputedSignal.stale', () => {
  it('is false after initial computation', () => {
    const c = computed(() => 42);

    expect(c.stale).toBe(false);
  });

  it('becomes true when a dep changes before re-read', () => {
    const n = signal(0);
    const c = computed(() => n.value);

    expect(c.stale).toBe(false);
    n.value = 1;
    expect(c.stale).toBe(true);
  });

  it('returns false again after re-reading the value', () => {
    const n = signal(0);
    const c = computed(() => n.value);

    n.value = 1;
    expect(c.stale).toBe(true);
    expect(c.value).toBe(1);
    expect(c.stale).toBe(false);
  });

  it('is true after dispose', () => {
    const c = computed(() => 1);

    c.dispose();
    expect(c.stale).toBe(true);
  });
});

// ─── writable ─────────────────────────────────────────────────────────────────

describe('writable', () => {
  it('get tracks reactively from the provided getter', () => {
    const n = signal(2);
    const doubled = writable(
      () => n.value * 2,
      (v) => {
        n.value = v / 2;
      },
    );

    expect(doubled.value).toBe(4);
    n.value = 5;
    expect(doubled.value).toBe(10);
  });

  it('set forwards the write to the provided setter', () => {
    const n = signal(2);
    const doubled = writable(
      () => n.value * 2,
      (v) => {
        n.value = v / 2;
      },
    );

    doubled.value = 20;
    expect(n.value).toBe(10);
  });

  it('.dispose() stops tracking and leaves value stale', () => {
    const n = signal(0);
    const w = writable(
      () => n.value + 1,
      () => {},
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    w.dispose();
    n.value = 99;
    expect(w.value).toBe(1); // stale
    warnSpy.mockRestore();
  });
});

// ─── derived ──────────────────────────────────────────────────────────────────

describe('derived', () => {
  it('combines multiple source signals through a projector', () => {
    const price = signal(10);
    const qty = signal(3);
    const total = derived([price, qty], (p, q) => p * q);

    expect(total.value).toBe(30);
  });

  it('updates when any source changes', () => {
    const a = signal(1);
    const b = signal(2);
    const sum = derived([a, b], (x, y) => x + y);

    a.value = 10;
    expect(sum.value).toBe(12);
    b.value = 5;
    expect(sum.value).toBe(15);
  });

  it('supports custom equals to suppress redundant downstream notifications', () => {
    const n = signal(1);
    const listener = vi.fn();
    // Math.sign: only changes when sign flips
    const sign = derived([n], (x) => Math.sign(x), { equals: (p, q) => p === q });

    watch(sign, listener);
    n.value = 2; // sign(2) = 1 = same — suppressed
    expect(listener).not.toHaveBeenCalled();
    n.value = -1; // sign(-1) = -1 — fires
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(-1, 1);
  });

  it('dispose stops reactivity', () => {
    const n = signal(0);
    const d = derived([n], (x) => x * 2);
    const listener = vi.fn();

    watch(d, listener);
    d.dispose();
    n.value = 5;
    expect(listener).not.toHaveBeenCalled();
  });
});
