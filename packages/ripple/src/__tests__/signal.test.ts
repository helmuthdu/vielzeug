import { computed, effect, onCleanup, readonly, signal, untrack } from '../';

describe('signals', () => {
  it('notifies subscribers when value changes', () => {
    const count = signal(0);
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(count.value);
    });

    count.value = 1;
    expect(seen).toEqual([0, 1]);
    stop.dispose();
  });

  it('custom equals suppresses redundant updates', () => {
    const count = signal(0, { equals: () => true });
    const listener = vi.fn();
    const stop = count.subscribe(listener);

    count.value = 1;
    expect(listener).not.toHaveBeenCalled();
    stop.dispose();
  });

  it('dispose makes signal inert — reads return last value, writes are silently ignored', () => {
    const n = signal(42);

    n.dispose();
    n.value = 99;
    expect(n.peek()).toBe(42);
  });

  it('subscribe() on disposed signal returns an already-disposed no-op Subscription', () => {
    const n = signal(1);

    n.dispose();

    const listener = vi.fn();
    const sub = n.subscribe(listener);

    expect(sub.disposed).toBe(true);
    expect(listener).not.toHaveBeenCalled();
    expect(() => sub.dispose()).not.toThrow();
  });

  it('dispose drops existing subscribers', () => {
    const n = signal(1);
    const listener = vi.fn();
    const stop = effect(() => {
      listener(n.value);
    });

    expect(listener).toHaveBeenCalledTimes(1);
    n.dispose();
    n.value = 2;
    expect(listener).toHaveBeenCalledTimes(1);
    stop.dispose();
  });

  it('supports using declaration via Symbol.dispose', () => {
    let disposed = false;
    const n = signal(0);
    const stop = effect(() => {
      void n.value;
      onCleanup(() => {
        disposed = true;
      });
    });

    stop.dispose();
    expect(disposed).toBe(true);
  });

  it('direct assignment performs read-modify-write', () => {
    const n = signal(10);

    n.value = n.peek() * 2;
    expect(n.value).toBe(20);
    n.value = n.peek() - 5;
    expect(n.value).toBe(15);
  });

  it('does not notify when written with the same value', () => {
    const n = signal(5);
    const listener = vi.fn();
    const stop = n.subscribe(listener);

    n.value = n.peek();
    expect(listener).not.toHaveBeenCalled();
    stop.dispose();
  });

  it('returns the name for a named signal', () => {
    const n = signal(0, { name: 'mySignal' });

    expect(n.name).toBe('mySignal');
  });

  it('returns undefined for an unnamed signal', () => {
    const n = signal(0);

    expect(n.name).toBeUndefined();
  });
});

describe('subscriptions and interop', () => {
  it('supports detached subscribe method references', () => {
    const n = signal(0);
    const listener = vi.fn();
    const subscribe = n.subscribe;
    const unsubscribe = subscribe(listener);

    n.value = 1;
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe.dispose();
  });

  it('subscribe skips initial emission and only reacts to changes', () => {
    const n = signal(0);
    const listener = vi.fn();
    const unsubscribe = n.subscribe(listener);

    expect(listener).not.toHaveBeenCalled();
    n.value = 1;
    n.value = 2;
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe.dispose();
    n.value = 3;
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('subscribe returns the Subscription shape', () => {
    const n = signal(0);
    const unsubscribe = n.subscribe(() => {});

    expect(typeof unsubscribe.dispose).toBe('function');
    expect(typeof unsubscribe[Symbol.dispose]).toBe('function');
    unsubscribe.dispose();
  });

  it('no-op subscription does not notify listener and is immediately disposed', () => {
    const n = signal(1);

    n.dispose();

    const listener = vi.fn();
    const sub = n.subscribe(listener);

    expect(sub.disposed).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('read helpers', () => {
  it('untrack reads without registering dependencies', () => {
    const n = signal(0);
    const log: number[] = [];
    const stop = effect(() => {
      const v = untrack(() => n.value);

      log.push(v);
    });

    n.value = 1;
    n.value = 2;
    expect(log).toEqual([0]);
    stop.dispose();
  });

  it('peek reads signal value without subscribing', () => {
    const n = signal(0);
    const log: number[] = [];
    const stop = effect(() => {
      log.push(n.peek());
    });

    n.value = 1;
    n.value = 2;
    expect(log).toEqual([0]);
    stop.dispose();
  });

  it('peek reads computed value without subscribing', () => {
    const n = signal(2);
    const doubled = computed(() => n.value * 2);
    const log: number[] = [];
    const stop = effect(() => {
      log.push(doubled.peek());
    });

    n.value = 5;
    expect(log).toEqual([4]);
    expect(doubled.peek()).toBe(10);
    stop.dispose();
    doubled.dispose();
  });
});

describe('SubscriptionImpl', () => {
  it('disposed is false before dispose()', () => {
    const n = signal(0);
    const sub = n.subscribe(() => {});

    expect(sub.disposed).toBe(false);
    sub.dispose();
    n.dispose();
  });

  it('disposed is true after dispose()', () => {
    const n = signal(0);
    const sub = n.subscribe(() => {});

    sub.dispose();
    expect(sub.disposed).toBe(true);
    n.dispose();
  });

  it('disposed is true after second dispose() call (idempotency)', () => {
    const n = signal(0);
    const sub = n.subscribe(() => {});

    sub.dispose();
    sub.dispose();
    expect(sub.disposed).toBe(true);
    n.dispose();
  });
});

describe('readonly() wrapper', () => {
  it('returns a read-only computed view over the same source', () => {
    const n = signal(1);
    const ro = readonly(n);

    expect(ro.value).toBe(1);
    n.value = 2;
    expect(ro.value).toBe(2);
    expect(ro.peek()).toBe(2);
    expect(() => {
      (ro as { value: number }).value = 3;
    }).toThrow();
    expect((ro as { update?: unknown }).update).toBeUndefined();
  });

  it('creates a read-only view that tracks deps', () => {
    const n = signal(2);
    const ro = readonly(n);

    expect(ro.value).toBe(2);
    n.value = 5;
    expect(ro.value).toBe(5);
  });

  it('on a readonly wraps correctly', () => {
    const n = signal(10);
    const ro = readonly(n);

    expect(ro.value).toBe(10);
  });

  it('readonly(readonly(s)) creates a distinct wrapper but value is correct', () => {
    const s = signal(0);
    const r1 = readonly(s);
    const r2 = readonly(r1);

    expect(r2).not.toBe(r1);
    expect(r2.value).toBe(0);
    s.value = 99;
    expect(r2.value).toBe(99);
  });

  it('readonly(computed()) creates a wrapper — does not return computed directly', () => {
    const c = computed(() => 1);
    const r = readonly(c);

    expect(r).not.toBe(c);
    expect(r.value).toBe(1);
    c.dispose();
  });

  it('readonly() on a computed tracks deps through the wrapper', () => {
    const n = signal(2);
    const doubled = computed(() => n.value * 2);
    const ro = readonly(doubled);

    n.value = 3;
    expect(ro.value).toBe(6);
    doubled.dispose();
  });

  it('disposed is false before source is disposed', () => {
    const n = signal(1);
    const ro = readonly(n);

    expect(ro.disposed).toBe(false);
    n.dispose();
  });

  it('disposed is true after source signal is disposed', () => {
    const n = signal(1);
    const ro = readonly(n);

    n.dispose();
    expect(ro.disposed).toBe(true);
  });

  it('disposed is true after source computed is disposed', () => {
    const c = computed(() => 42);
    const ro = readonly(c);

    expect(ro).not.toBe(c);
    c.dispose();
    expect(ro.disposed).toBe(true);
  });

  it('readonly(computed) reads through to source — no dispose method', () => {
    const n = signal(1);
    const doubled = computed(() => n.value * 2);
    const r = readonly(doubled);

    expect(r.value).toBe(2);
    expect(typeof (r as Record<string, unknown>).dispose).toBe('undefined');
    n.value = 5;
    expect(r.value).toBe(10);
    expect(doubled.disposed).toBe(false);
    doubled.dispose();
    n.dispose();
  });

  it('readonly(signal) reads through to source — no dispose method', () => {
    const n = signal(42);
    const ro = readonly(n);

    expect(typeof (ro as Record<string, unknown>).dispose).toBe('undefined');
    expect(ro.value).toBe(42);
    n.value = 99;
    expect(ro.value).toBe(99);
    n.dispose();
  });

  it('computed() on readonly — tracks deps through the wrapper', () => {
    const n = signal(4);
    const ro = readonly(n);
    const doubled = computed(() => ro.value * 2);

    expect(doubled.value).toBe(8);
    n.value = 3;
    expect(doubled.value).toBe(6);
    doubled.dispose();
  });

  it('computed() on readonly — projects to a narrowed type', () => {
    const mixed = signal<string | number>(42);
    const ro = readonly(mixed);
    const asString = computed(() => String(ro.value));

    expect(asString.value).toBe('42');
    mixed.value = 'hello';
    expect(asString.value).toBe('hello');
    asString.dispose();
  });
});

describe('Readable.name property', () => {
  it('signal.name is accessible on Readable interface', () => {
    const n = signal(0, { name: 'counter' });
    const rs: import('../types').Readable<number> = n;

    expect(rs.name).toBe('counter');
    n.dispose();
  });

  it('unnamed signal.name is undefined', () => {
    const n = signal(0);
    const rs: import('../types').Readable<number> = n;

    expect(rs.name).toBeUndefined();
    n.dispose();
  });
});
