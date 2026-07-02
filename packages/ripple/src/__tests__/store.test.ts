import { batch, computed, effect, isReactive, signal, store, watch } from '../';
import { RippleError, RippleInvalidStoreError } from '../';

describe('store — basics', () => {
  it('supports patch, replace, and reset', () => {
    const user = store({ count: 0, profile: { name: 'Ada' } });

    user.patch({ count: 1 });
    user.replace((state) => ({ ...state, count: state.count + 1 }));
    user.reset();
    expect(user.peek()).toEqual({ count: 0, profile: { name: 'Ada' } });
  });

  it('is branded as reactive', () => {
    const user = store({ count: 0 });

    expect(isReactive(user)).toBe(true);
  });

  it('throws RippleInvalidStoreError when created or patched with non-object values', () => {
    let caught: unknown;

    try {
      store(42 as unknown as { count: number });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidStoreError);

    const ok = store({ count: 0 });
    let patchCaught: unknown;

    try {
      ok.patch(null as unknown as Partial<{ count: number }>);
    } catch (e) {
      patchCaught = e;
    }

    expect(patchCaught).toBeInstanceOf(RippleError);
    expect(patchCaught).toBeInstanceOf(RippleInvalidStoreError);
  });

  it('replace() is a no-op when the callback returns the same reference', () => {
    const s = store({ count: 5 });
    const listener = vi.fn();
    const stop = s.subscribe(listener);

    s.replace((state) => state);
    expect(s.peek().count).toBe(5);
    expect(listener).not.toHaveBeenCalled();
    stop.dispose();
  });

  it('returns the name for a named store', () => {
    const s = store({ x: 0 }, { name: 'myStore' });

    expect(s.name).toBe('myStore');
  });

  it('returns undefined for an unnamed store', () => {
    const s = store({ x: 0 });

    expect(s.name).toBeUndefined();
  });
});

describe('store — peek() frozen snapshot', () => {
  it('throws TypeError when attempting to write a top-level property on store.peek()', () => {
    const s = store({ count: 0, name: 'Ada' });
    const snapshot = s.peek();
    let caught: unknown;

    try {
      (snapshot as { count: number }).count = 99;
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(TypeError);
    expect(s.peek().count).toBe(0);
  });

  it('throws TypeError when attempting to delete a property on store.peek()', () => {
    const s = store<{ count: number; name?: string }>({ count: 0, name: 'Ada' });
    const snapshot = s.peek();
    let caught: unknown;

    try {
      delete (snapshot as { name?: string }).name;
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(TypeError);
    expect(s.peek().name).toBe('Ada');
  });

  it('read access through store.peek() works normally', () => {
    const s = store({ x: 1, y: 2 });

    expect(s.peek().x).toBe(1);
    expect(s.peek().y).toBe(2);
  });

  it('peek() returns a snapshot — not a live view', () => {
    const s = store({ x: 1 });
    const snap = s.peek();

    s.patch({ x: 99 });
    expect(snap.x).toBe(1);
    expect(s.peek().x).toBe(99);
  });

  it('peek() returns a deep clone — nested mutations do not corrupt live state', () => {
    const s = store({ outer: { inner: 0 } });
    const snap = s.peek();

    (snap as { outer: { inner: number } }).outer.inner = 999;
    expect(s.peek().outer.inner).toBe(0);
  });
});

describe('store.value — reactive tracked read', () => {
  it('store.value returns the current state', () => {
    const s = store({ x: 1, y: 2 });

    expect(s.value.x).toBe(1);
    s.patch({ x: 10 });
    expect(s.value.x).toBe(10);
  });

  it('store.value in effect re-runs on any patch', () => {
    const s = store({ a: 0, b: 0 });
    const log: number[] = [];
    const stop = effect(() => {
      log.push(s.value.a + s.value.b);
    });

    s.patch({ a: 1 });
    s.patch({ b: 2 });
    stop.dispose();
    expect(log).toEqual([0, 1, 3]);
  });

  it('store.value does not re-run effect when same value patched', () => {
    const s = store({ x: 5 });
    const log: number[] = [];
    const stop = effect(() => {
      log.push(s.value.x);
    });

    s.patch({ x: 5 });
    stop.dispose();
    expect(log).toEqual([5]);
  });
});

describe('store.lens()', () => {
  it('reads and writes a specific key of the store', () => {
    const s = store({ age: 30, name: 'Alice' });
    const nameLens = s.lens('name');

    expect(nameLens.value).toBe('Alice');
    nameLens.value = 'Bob';
    expect(s.peek().name).toBe('Bob');
  });

  it('lens is cached — store.lens("x") === store.lens("x")', () => {
    const s = store({ x: 1, y: 2 });

    expect(s.lens('x')).toBe(s.lens('x'));
  });

  it('lens write propagates via patch — other keys unchanged', () => {
    const s = store({ x: 1, y: 2 });
    const xLens = s.lens('x');

    xLens.value = 99;
    expect(s.peek().x).toBe(99);
    expect(s.peek().y).toBe(2);
  });

  it('effect on lens re-runs only when that key changes', () => {
    const s = store({ x: 0, y: 0 });
    const xLens = s.lens('x');
    const log: number[] = [];
    const stop = effect(() => {
      log.push(xLens.value);
    });

    s.patch({ y: 99 });
    expect(log).toEqual([0]);
    s.patch({ x: 5 });
    expect(log).toEqual([0, 5]);
    stop.dispose();
  });

  it('lens.subscribe works', () => {
    const s = store({ x: 0 });
    const xLens = s.lens('x');
    const listener = vi.fn();
    const unsub = xLens.subscribe(listener);

    s.patch({ x: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub.dispose();
  });

  it('dispose() evicts the lens from cache — re-acquisition creates a fresh working lens', () => {
    const s = store({ x: 1 });
    const lens1 = s.lens('x');

    lens1.dispose();

    const lens2 = s.lens('x');

    expect(lens2).not.toBe(lens1);
    expect(lens2.value).toBe(1);
    lens2.value = 42;
    expect(s.peek().x).toBe(42);
  });

  it('with dot-notation path reads nested values', () => {
    const s = store({ user: { address: { city: 'NY' }, name: 'Alice' } });
    const city = s.lens('user.address.city');

    expect(city.value).toBe('NY');
  });

  it('with dot-notation path writes nested values immutably', () => {
    const s = store({ user: { address: { city: 'NY' }, name: 'Alice' } });
    const city = s.lens('user.address.city');

    city.value = 'LA';
    expect(s.peek().user.address.city).toBe('LA');
    expect(s.peek().user.name).toBe('Alice');
  });

  it('nested lens is cached — same path returns same instance', () => {
    const s = store({ a: { b: 1 } });

    expect(s.lens('a.b')).toBe(s.lens('a.b'));
  });

  it('nested lens effect fires only when that path changes', () => {
    const s = store({ meta: { count: 0, label: 'x' }, value: 0 });
    const count = s.lens('meta.count');
    const log: number[] = [];
    const stop = effect(() => {
      log.push(count.value);
    });

    s.patch({ value: 99 });
    expect(log).toEqual([0]);
    s.replace((st) => ({ ...st, meta: { ...st.meta, count: 5 } }));
    expect(log).toEqual([0, 5]);
    stop.dispose();
  });

  it('nested lens no-ops when value is the same', () => {
    const s = store({ a: { b: 'hello' } });
    const b = s.lens('a.b');
    const listener = vi.fn();
    const stop = b.subscribe(listener);

    b.value = 'hello';
    expect(listener).not.toHaveBeenCalled();
    stop.dispose();
  });

  it('throws RippleError when writing through a null intermediate path segment', () => {
    const s = store({ user: null as unknown as { city: string } });
    const city = s.lens('user.city');
    let caught: unknown;

    try {
      city.value = 'NY';
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidStoreError);
  });
});

describe('store.lens() — double-notification regression', () => {
  it('effect reading both a top-level lens and store.value fires exactly once per lens write', () => {
    const s = store({ x: 0, y: 0 });
    const xLens = s.lens('x');
    const log: number[] = [];
    const stop = effect(() => {
      void s.value;
      void xLens.value;
      log.push(s.peek().x);
    });

    expect(log).toEqual([0]);
    log.length = 0;
    xLens.value = 1;
    expect(log).toEqual([1]);
    stop.dispose();
    s.dispose();
  });
});

describe('store.lens() — name property', () => {
  it('named store lens exposes the composite name', () => {
    const s = store({ count: 0 }, { name: 'myStore' });

    expect(s.lens('count').name).toBe('myStore.count');
  });

  it('unnamed store lens exposes just the key name', () => {
    const s = store({ count: 0 });

    expect(s.lens('count').name).toBe('count');
  });

  it('nested lens name includes the full dot path', () => {
    const s = store({ a: { b: 0 } }, { name: 'ns' });

    expect(s.lens('a.b').name).toBe('ns.a.b');
  });
});

describe('store — propSignal naming', () => {
  it('named store prop signals carry storeName.key name', () => {
    const s = store({ count: 0 }, { name: 'myStore' }) as unknown as {
      propSignalFor_: (k: string) => { name: string | undefined };
    };

    expect(s.propSignalFor_('count').name).toBe('myStore.count');
  });

  it('unnamed store prop signals carry just the key name', () => {
    const s = store({ count: 0 }) as unknown as {
      propSignalFor_: (k: string) => { name: string | undefined };
    };

    expect(s.propSignalFor_('count').name).toBe('count');
  });
});

describe('computed() projecting from store lenses', () => {
  it('projected from a store lens', () => {
    const cart = store({ count: 0, label: 'empty' });
    const countLens = cart.lens('count');
    const doubled = computed(() => countLens.value * 2);

    expect(doubled.value).toBe(0);
    cart.patch({ count: 5 });
    expect(doubled.value).toBe(10);
    doubled.dispose();
  });

  it('selector suppresses downstream effects when projected value is unchanged', () => {
    const cart = store({ count: 0, label: 'empty' });
    const labelLens = cart.lens('label');
    const listener = vi.fn();
    const unsubscribe = labelLens.subscribe(listener);

    cart.patch({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
    cart.patch({ label: 'full' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe.dispose();
  });

  it('computed() on lens projects the lens value', () => {
    const s = store({ active: false, name: 'test' });
    const activeLens = s.lens('active');
    const asString = computed(() => String(activeLens.value));

    expect(asString.value).toBe('false');
    s.patch({ active: true });
    expect(asString.value).toBe('true');
    asString.dispose();
  });
});

describe('store.patch() — prototype pollution guard', () => {
  it('throws RippleError for __proto__ top-level key via JSON.parse input', () => {
    const s = store({ count: 0 } as Record<string, unknown>);

    expect(() => {
      s.patch(JSON.parse('{"__proto__": {"evil": true}}') as Record<string, unknown>);
    }).toThrow(RippleError);
  });

  it('throws RippleError for constructor top-level key', () => {
    const s = store({ count: 0 } as Record<string, unknown>);

    expect(() => {
      const partial: Record<string, unknown> = Object.create(null);

      partial['constructor'] = 'hacked';
      s.patch(partial as { count: number });
    }).toThrow(RippleError);
  });

  it('patch() is atomic — a safe key before an unsafe key is never applied, and no subscriber fires', () => {
    const s = store({ a: 0, count: 0 } as Record<string, unknown>);
    const listener = vi.fn();
    const stop = s.subscribe(listener);

    expect(() => {
      // JSON.parse produces a real own "__proto__" key positioned after the safe "a" key.
      s.patch(JSON.parse('{"a":1,"__proto__":{"evil":true}}') as Record<string, unknown>);
    }).toThrow(RippleInvalidStoreError);

    // The safe "a" key must not have been silently applied ahead of the rejected key.
    expect(s.peek()['a']).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    stop.dispose();
  });

  it('store() rejects an unsafe top-level key in the initial state', () => {
    expect(() => {
      store(JSON.parse('{"a":1,"__proto__":{"evil":true}}') as Record<string, unknown>);
    }).toThrow(RippleInvalidStoreError);
  });

  it('replace() is atomic — new keys are validated before any mutation is applied', () => {
    const s = store({ count: 0 } as Record<string, unknown>);
    const listener = vi.fn();
    const stop = s.subscribe(listener);

    expect(() => {
      s.replace((state) => {
        const next: Record<string, unknown> = { ...state, count: 1 };

        // Simulate a __proto__ own-key added by e.g. JSON round-tripping inside a replace fn.
        Object.defineProperty(next, '__proto__', { enumerable: true, value: 'evil' });

        return next as never;
      });
    }).toThrow(RippleInvalidStoreError);

    expect(s.peek()['count']).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    stop.dispose();
  });
});

describe('store.lens() — unsafe path guard', () => {
  it('throws RippleInvalidStoreError for __proto__ path segment', () => {
    const s = store({ x: 0 } as Record<string, unknown>);
    let caught: unknown;

    try {
      s.lens('__proto__');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidStoreError);
  });

  it('throws RippleInvalidStoreError for constructor path segment', () => {
    const s = store({ x: 0 } as Record<string, unknown>);
    let caught: unknown;

    try {
      s.lens('constructor');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidStoreError);
  });

  it('throws RippleInvalidStoreError for nested path with __proto__ segment', () => {
    const s = store({ a: { b: 0 } } as Record<string, unknown>);
    let caught: unknown;

    try {
      s.lens('a.__proto__');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(RippleError);
    expect(caught).toBeInstanceOf(RippleInvalidStoreError);
  });
});

describe('store.patch() — invalid input types', () => {
  it('throws INVALID_STORE when passed an array', () => {
    const s = store({ x: 1 });

    expect(() => s.patch([] as unknown as Partial<{ x: number }>)).toThrow(RippleError);
  });

  it('throws INVALID_STORE when passed null', () => {
    const s = store({ x: 1 });

    expect(() => s.patch(null as unknown as Partial<{ x: number }>)).toThrow(RippleError);
  });
});

describe('store.lens() — path depth guard', () => {
  it('throws INVALID_STORE for a path exceeding 32 segments', () => {
    const s = store({ a: { b: 1 } } as Record<string, unknown>);
    const deepPath = Array.from({ length: 33 }, (_, i) => `k${i}`).join('.');

    expect(() => s.lens(deepPath as never)).toThrow(RippleError);
  });

  it('accepts a path with exactly 32 segments', () => {
    const obj: Record<string, unknown> = {};
    let ref = obj;

    for (let i = 0; i < 31; i++) {
      ref[`k${i}`] = {};
      ref = ref[`k${i}`] as Record<string, unknown>;
    }
    ref['k31'] = 42;

    const s = store(obj);
    const path = Array.from({ length: 32 }, (_, i) => `k${i}`).join('.');

    expect(() => s.lens(path as never)).not.toThrow();
  });
});

describe('store.lens() — empty path segment guard', () => {
  it('throws INVALID_STORE for consecutive dots (empty segment)', () => {
    const s = store({ a: { b: 1 } } as Record<string, unknown>);

    expect(() => s.lens('a..b' as never)).toThrow(RippleError);
  });

  it('throws INVALID_STORE for leading dot', () => {
    const s = store({ a: 1 } as Record<string, unknown>);

    expect(() => s.lens('.a' as never)).toThrow(RippleError);
  });

  it('throws INVALID_STORE for trailing dot', () => {
    const s = store({ a: 1 } as Record<string, unknown>);

    expect(() => s.lens('a.' as never)).toThrow(RippleError);
  });
});

describe('store.replace() — new keys', () => {
  it('adds keys that were not in the original shape', () => {
    const s = store<{ a: number; b?: number }>({ a: 1 });

    s.replace((state) => ({ ...state, b: 99 }));
    expect(s.peek().a).toBe(1);
    expect(s.peek().b).toBe(99);
  });
});

describe('store.replace() — callback receives plain object, not proxy', () => {
  it('mutations on the callback argument do not throw', () => {
    const s = store({ count: 0 });

    expect(() => {
      s.replace((state) => {
        (state as { count: number }).count = 99;

        return { count: state.count + 1 };
      });
    }).not.toThrow();
    expect(s.peek().count).toBe(100);
  });
});

describe('store.replace() — deep snapshot safety', () => {
  it('mutating a nested object in the snapshot does not corrupt live state', () => {
    const s = store({ outer: { inner: 0 } });
    const runs: number[] = [];
    const stop = effect(() => {
      runs.push(s.value.outer.inner);
    });

    runs.length = 0;
    s.replace((state) => {
      (state as { outer: { inner: number } }).outer.inner = 42;

      return { outer: { inner: 99 } };
    });
    expect(s.peek().outer.inner).toBe(99);
    expect(runs).toHaveLength(1);
    stop.dispose();
  });

  it('no-op when fn returns the same snapshot ref — nested mutation has no effect', () => {
    const s = store({ outer: { inner: 0 } });
    const runs: number[] = [];
    const stop = effect(() => {
      runs.push(s.value.outer.inner);
    });

    runs.length = 0;
    s.replace((state) => {
      (state as { outer: { inner: number } }).outer.inner = 42;

      return state;
    });
    expect(s.peek().outer.inner).toBe(0);
    expect(runs).toHaveLength(0);
    stop.dispose();
  });
});

describe('store.dispose()', () => {
  it('disposes without error', () => {
    const s = store({ x: 1, y: 2 });

    expect(() => s.dispose()).not.toThrow();
  });

  it('is idempotent', () => {
    const s = store({ x: 1 });

    expect(() => {
      s.dispose();
      s.dispose();
    }).not.toThrow();
  });

  it('[Symbol.dispose] works', () => {
    const s = store({ x: 1 });

    expect(() => s[Symbol.dispose]()).not.toThrow();
  });

  it('disposes cached lenses on dispose', () => {
    const s = store({ count: 0 });
    const l = s.lens('count');

    expect(l.disposed).toBe(false);
    s.dispose();
    expect(l.disposed).toBe(true);
  });

  it('disposes internal version signal (lens effects not re-run after dispose)', () => {
    const runs: number[] = [];
    const s = store({ n: 0 });
    const nLens = s.lens('n');
    const stop = effect(() => {
      void nLens.value;
      runs.push(1);
    });

    expect(runs).toHaveLength(1);
    s.dispose();
    s.patch({ n: 1 });
    expect(runs).toHaveLength(1);
    stop.dispose();
  });
});
