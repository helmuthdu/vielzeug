import type { HeraldEvent } from '../index';
import { BusDisposedError, createBus, HeraldConfigError, HeraldError } from '../index';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: undefined;
};

describe('createBus - subscription lifecycle', () => {
  it('delivers payload to every listener of the same event', () => {
    const bus = createBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();

    bus.on('count', a);
    bus.on('count', b);

    bus.emit('count', 42);

    expect(a).toHaveBeenCalledWith(42);
    expect(b).toHaveBeenCalledWith(42);
  });

  it('allows the same listener function to be registered multiple times', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.on('count', listener);

    bus.emit('count', 1);

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('each registration returns an independent unsubscribe handle', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const unsub1 = bus.on('count', listener);
    const unsub2 = bus.on('count', listener);

    expect(unsub1).not.toBe(unsub2);

    unsub1();
    bus.emit('count', 1);

    expect(listener).toHaveBeenCalledTimes(1); // second registration still active

    unsub2();
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledTimes(1); // both removed
  });

  it('unsubscribe is idempotent and only removes its own listener', () => {
    const bus = createBus<TestEvents>();
    const removed = vi.fn();
    const kept = vi.fn();
    const unsubscribe = bus.on('count', removed);

    bus.on('count', kept);
    unsubscribe();
    unsubscribe();

    bus.emit('count', 5);

    expect(removed).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledWith(5);
  });

  it('idempotent unsub does not corrupt a subsequently registered listener', () => {
    // Regression: the captured-set reference had size 0 on second unsub call, which
    // would match the empty-set guard and delete the new event key from the map.
    const bus = createBus<TestEvents>();
    const first = vi.fn();
    const second = vi.fn();
    const unsub = bus.on('count', first);

    unsub(); // first removed; event key cleaned up
    bus.on('count', second); // new registration for same event
    unsub(); // second call — must not remove second's entry

    bus.emit('count', 1);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(1);
  });

  it('does not register when the provided signal is already aborted', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    controller.abort();

    const unsub = bus.on('count', listener, { signal: controller.signal });

    unsub(); // noop unsub — should not throw
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('auto-unsubscribes when the provided signal aborts', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    bus.on('count', listener, { signal: controller.signal });

    bus.emit('count', 1);
    controller.abort();
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('once listeners run exactly once', () => {
    const bus = createBus<TestEvents>();
    const onceListener = vi.fn();

    bus.once('count', onceListener);

    bus.emit('count', 1);
    bus.emit('count', 2);

    expect(onceListener).toHaveBeenCalledOnce();
    expect(onceListener).toHaveBeenCalledWith(1);
  });

  it('once listener can be cancelled before it fires', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const unsubscribe = bus.once('count', listener);

    unsubscribe();
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('once listener with signal does not fire after signal aborts', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    bus.once('count', listener, { signal: controller.signal });
    controller.abort();
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('allows the same listener function to be registered via once() multiple times', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.once('count', listener);
    bus.once('count', listener);

    bus.emit('count', 1); // both once registrations fire

    expect(listener).toHaveBeenCalledTimes(2);

    bus.emit('count', 2); // both consumed — no further calls

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('on() with { once: true } fires exactly once and auto-removes', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener, { once: true });

    bus.emit('count', 1);
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('on() with { once: true, signal } cancels before first fire when signal aborts', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    bus.on('count', listener, { once: true, signal: controller.signal });
    controller.abort();
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('eventNames returns only events with active listeners', () => {
    const bus = createBus<TestEvents>();
    const unsubscribe = bus.on('count', vi.fn());

    expect(bus.eventNames()).toEqual(['count']);

    unsubscribe();

    expect(bus.eventNames()).toEqual([]);
  });

  it('listenerCount reports per-event and total listeners', () => {
    const bus = createBus<TestEvents>();

    const unsubscribeA = bus.on('count', vi.fn());

    bus.on('count', vi.fn());
    bus.on('greet', vi.fn());

    expect(bus.listenerCount('count')).toBe(2);
    expect(bus.listenerCount('greet')).toBe(1);
    expect(bus.listenerCount()).toBe(3);

    unsubscribeA();

    expect(bus.listenerCount('count')).toBe(1);
    expect(bus.listenerCount()).toBe(2);
  });

  it('listenerCount(event) counts specific-event listeners only; wildcardCount() is separate', () => {
    const bus = createBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.onAny(vi.fn());
    bus.onAny(vi.fn());

    expect(bus.listenerCount('count')).toBe(1); // specific only
    expect(bus.listenerCount('greet')).toBe(0); // no specific listeners
    expect(bus.listenerCount()).toBe(1); // total specific across all events
    expect(bus.wildcardCount()).toBe(2); // onAny listeners

    bus.dispose();
  });
});

describe('createBus - emit behavior', () => {
  it('is a no-op without listeners and still supports void events', () => {
    const bus = createBus<TestEvents>();
    const toggleListener = vi.fn();

    bus.on('toggle', toggleListener);

    expect(() => bus.emit('count', 1)).not.toThrow();

    bus.emit('toggle');

    expect(toggleListener).toHaveBeenCalledOnce();
  });

  it('calls listeners in registration order and does not cross-fire other events', () => {
    const bus = createBus<TestEvents>();
    const order: number[] = [];
    const onGreet = vi.fn();

    bus.on('count', () => order.push(1));
    bus.on('count', () => order.push(2));
    bus.on('count', () => order.push(3));
    bus.on('greet', onGreet);

    bus.emit('count', 0);

    expect(order).toEqual([1, 2, 3]);
    expect(onGreet).not.toHaveBeenCalled();
  });

  it('snapshots listeners at emit start; listeners added during emit run on next emit', () => {
    const bus = createBus<TestEvents>();
    const calls: string[] = [];

    bus.on('count', () => {
      calls.push('a');
      bus.on('count', () => calls.push('late'));
    });
    bus.on('count', () => calls.push('b'));

    bus.emit('count', 1);
    bus.emit('count', 2);

    expect(calls).toEqual(['a', 'b', 'a', 'b', 'late']);
  });

  it('runs every listener before rethrowing the first error', () => {
    const bus = createBus<TestEvents>();
    const after = vi.fn();

    bus.on('count', () => {
      throw new Error('boom');
    });
    bus.on('count', after);

    expect(() => bus.emit('count', 1)).toThrow('boom');
    expect(after).toHaveBeenCalledWith(1);
  });

  it('still calls wildcard listeners before rethrowing a specific listener error', () => {
    const bus = createBus<TestEvents>();
    const wildcard = vi.fn();

    bus.on('count', () => {
      throw new Error('boom');
    });
    bus.onAny(wildcard);

    expect(() => bus.emit('count', 1)).toThrow('boom');
    expect(wildcard).toHaveBeenCalledWith('count', 1);
  });

  it('rethrows only the first error after every listener runs', () => {
    const bus = createBus<TestEvents>();
    const after = vi.fn();

    bus.on('count', () => {
      throw new Error('first');
    });
    bus.on('count', () => {
      throw new Error('second');
    });
    bus.on('count', after);

    expect(() => bus.emit('count', 1)).toThrow('first');
    expect(after).toHaveBeenCalledWith(1);
  });

  it('reports every listener error through tap as error events', () => {
    const events: HeraldEvent<TestEvents>[] = [];
    const bus = createBus<TestEvents>();

    bus.tap((e) => events.push(e));
    bus.on('count', () => {
      throw new Error('boom');
    });
    bus.on('count', () => {
      throw new Error('boom2');
    });

    expect(() => bus.emit('count', 99)).toThrow('boom');

    const errorEvents = events.filter((e) => e.type === 'error');

    expect(errorEvents).toHaveLength(2);
    expect(errorEvents[0]).toEqual({
      error: expect.any(Error),
      event: 'count',
      type: 'error',
    });
    expect(errorEvents[1]).toEqual({
      error: expect.any(Error),
      event: 'count',
      type: 'error',
    });
    bus.dispose();
  });

  it('onAny observes every emit, including emits with no specific listeners', () => {
    const bus = createBus<TestEvents>();
    const observer = vi.fn();

    bus.onAny(observer);
    bus.emit('count', 1);
    bus.on('count', vi.fn());
    bus.emit('count', 2);

    expect(observer.mock.calls).toEqual([
      ['count', 1],
      ['count', 2],
    ]);
  });

  it('does not invoke onAny listeners on a disposed bus', () => {
    const bus = createBus<TestEvents>();
    const observer = vi.fn();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.onAny(observer);
    bus.dispose();
    bus.emit('count', 1);

    expect(observer).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('createBus - wait', () => {
  it('resolves with the first matching payload only', async () => {
    const bus = createBus<TestEvents>();
    const pending = bus.wait('count');

    bus.emit('count', 1);
    bus.emit('count', 2);

    await expect(pending).resolves.toBe(1);
  });

  it('resolves to undefined for void events', async () => {
    const bus = createBus<TestEvents>();
    const pending = bus.wait('toggle');

    bus.emit('toggle');

    await expect(pending).resolves.toBeUndefined();
  });

  it('rejects immediately when bus is already disposed', async () => {
    const bus = createBus<TestEvents>();

    bus.dispose();

    await expect(bus.wait('count')).rejects.toBeInstanceOf(BusDisposedError);
  });

  it('rejects pending wait when bus is disposed', async () => {
    const bus = createBus<TestEvents>();
    const pending = bus.wait('count');

    bus.dispose();

    await expect(pending).rejects.toBeInstanceOf(BusDisposedError);
  });

  it('rejects immediately when signal is already aborted', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();

    controller.abort(new Error('cancelled'));

    await expect(bus.wait('count', { signal: controller.signal })).rejects.toThrow('cancelled');
  });

  it('rejects with signal reason when signal aborts while waiting', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const pending = bus.wait('count', { signal: controller.signal });

    controller.abort(new Error('cancelled'));

    await expect(pending).rejects.toThrow('cancelled');
  });

  it('stays resolved if signal aborts after completion', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const pending = bus.wait('count', { signal: controller.signal });

    bus.emit('count', 7);

    await expect(pending).resolves.toBe(7);
    expect(() => controller.abort()).not.toThrow();
  });
});

describe('createBus - waitAny', () => {
  it('resolves with winning event and payload', async () => {
    const bus = createBus<TestEvents>();
    const pending = bus.waitAny(['count', 'greet']);

    bus.emit('greet', { name: 'Alice' });

    await expect(pending).resolves.toEqual({ event: 'greet', payload: { name: 'Alice' } });
  });

  it('rejects immediately when bus is already disposed', async () => {
    const bus = createBus<TestEvents>();

    bus.dispose();

    await expect(bus.waitAny(['count', 'greet'])).rejects.toBeInstanceOf(BusDisposedError);
  });

  it('rejects pending waitAny when bus is disposed', async () => {
    const bus = createBus<TestEvents>();
    const pending = bus.waitAny(['count', 'greet']);

    bus.dispose();

    await expect(pending).rejects.toBeInstanceOf(BusDisposedError);
  });

  it('rejects immediately when signal is already aborted', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();

    controller.abort(new Error('cancelled'));

    await expect(bus.waitAny(['count', 'greet'], { signal: controller.signal })).rejects.toThrow('cancelled');
  });

  it('rejects with signal reason when signal aborts while waiting', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const pending = bus.waitAny(['count', 'greet'], { signal: controller.signal });

    controller.abort(new Error('cancelled'));

    await expect(pending).rejects.toThrow('cancelled');
  });

  it('resolves once and ignores later matching events', async () => {
    const bus = createBus<TestEvents>();
    const pending = bus.waitAny(['count', 'greet']);

    bus.emit('count', 1);
    bus.emit('greet', { name: 'ignored' });

    await expect(pending).resolves.toEqual({ event: 'count', payload: 1 });
  });

  it('concurrent waitAny calls resolve independently', async () => {
    const bus = createBus<TestEvents>();
    const pending1 = bus.waitAny(['count', 'greet']);
    const pending2 = bus.waitAny(['count', 'greet']);

    bus.emit('count', 1);

    await expect(pending1).resolves.toEqual({ event: 'count', payload: 1 });
    await expect(pending2).resolves.toEqual({ event: 'count', payload: 1 });
  });
});

describe('createBus - onAny (wildcard listener)', () => {
  it('receives all emitted events regardless of type', () => {
    const bus = createBus<TestEvents>();
    const received: Array<{ event: string; payload: unknown }> = [];

    bus.onAny((event, payload) => received.push({ event, payload }));

    bus.emit('count', 1);
    bus.emit('greet', { name: 'Alice' });
    bus.emit('toggle');

    expect(received).toEqual([
      { event: 'count', payload: 1 },
      { event: 'greet', payload: { name: 'Alice' } },
      { event: 'toggle', payload: undefined },
    ]);
  });

  it('fires after event-specific listeners', () => {
    const bus = createBus<TestEvents>();
    const order: string[] = [];

    bus.on('count', () => order.push('specific'));
    bus.onAny(() => order.push('wildcard'));

    bus.emit('count', 1);

    expect(order).toEqual(['specific', 'wildcard']);
  });

  it('returns an independent unsubscribe handle', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const unsub = bus.onAny(listener);

    bus.emit('count', 1);
    unsub();
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('auto-unsubscribes when the provided signal aborts', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    bus.onAny(listener, { signal: controller.signal });
    bus.emit('count', 1);
    controller.abort();
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not register when the provided signal is already aborted', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    controller.abort();
    bus.onAny(listener, { signal: controller.signal });
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('fires exactly once when { once: true } is passed', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.onAny(listener, { once: true });

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('greet', { name: 'Alice' });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith('count', 1);
  });

  it('{ once: true } with signal cancels before firing when signal aborts', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    bus.onAny(listener, { once: true, signal: controller.signal });
    controller.abort();
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('is stopped when bus is disposed', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.onAny(listener);
    bus.emit('count', 1);
    bus.dispose();
    bus.emit('count', 2); // no-op after disposal

    expect(listener).toHaveBeenCalledOnce();
  });

  it('counts are tracked separately via wildcardCount()', () => {
    const bus = createBus<TestEvents>();

    bus.onAny(vi.fn());
    bus.onAny(vi.fn());

    expect(bus.wildcardCount()).toBe(2);
    expect(bus.listenerCount()).toBe(0); // specific-only, wildcards not included
    expect(bus.listenerCount('count')).toBe(0); // no specific listeners for count
  });

  it('runs every wildcard listener before rethrowing the first error', () => {
    const after = vi.fn();
    const bus = createBus<TestEvents>();

    bus.onAny(() => {
      throw new Error('wildcard boom');
    });
    bus.onAny(after);

    expect(() => bus.emit('count', 1)).toThrow('wildcard boom');
    expect(after).toHaveBeenCalledWith('count', 1);
  });
});

describe('createBus - maxListeners', () => {
  it('warns via console.warn when listener count exceeds the threshold', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ maxListeners: 2 });

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());
    expect(spy).not.toHaveBeenCalled(); // exactly at limit — no warning

    bus.on('count', vi.fn()); // exceeds limit
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('[@vielzeug/herald]');
    expect(spy.mock.calls[0][0]).toContain('on("count")');

    spy.mockRestore();
    bus.dispose();
  });

  it('warns for onAny listeners that exceed the threshold', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ maxListeners: 1 });

    bus.onAny(vi.fn());
    expect(spy).not.toHaveBeenCalled();

    bus.onAny(vi.fn());
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toContain('[@vielzeug/herald]');

    spy.mockRestore();
    bus.dispose();
  });

  it('does not warn when maxListeners is not configured', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bus = createBus<TestEvents>();

    for (let i = 0; i < 20; i++) bus.on('count', vi.fn());

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
    bus.dispose();
  });
});

describe('createBus - disposal', () => {
  it('dispose is idempotent', () => {
    const bus = createBus<TestEvents>();

    expect(() => {
      bus.dispose();
      bus.dispose();
      bus.dispose();
    }).not.toThrow();
    expect(bus.disposed).toBe(true);
  });

  it('prevents further subscriptions and emissions after disposal', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.dispose();

    bus.on('count', vi.fn());
    bus.once('count', vi.fn());
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
    expect(bus.listenerCount()).toBe(0);
  });

  it('Symbol.dispose delegates to dispose', () => {
    const bus = createBus<TestEvents>();

    bus[Symbol.dispose]();

    expect(bus.disposed).toBe(true);
  });
});

describe('createBus - disposalSignal', () => {
  it('starts as a live (non-aborted) signal', () => {
    const bus = createBus<TestEvents>();

    expect(bus.disposalSignal.aborted).toBe(false);

    bus.dispose();
  });

  it('fires with BusDisposedError reason when bus is disposed', () => {
    const bus = createBus<TestEvents>();
    const signal = bus.disposalSignal;

    bus.dispose();

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBeInstanceOf(BusDisposedError);
  });

  it('is already aborted when read after disposal', () => {
    const bus = createBus<TestEvents>();

    bus.dispose();

    expect(bus.disposalSignal.aborted).toBe(true);
  });

  it('can be used to tie an external subscription to the bus lifetime', () => {
    const bus = createBus<TestEvents>();
    const other = createBus<TestEvents>();
    const listener = vi.fn();

    other.on('count', listener, { signal: bus.disposalSignal });

    other.emit('count', 1);
    expect(listener).toHaveBeenCalledOnce();

    bus.dispose(); // disposes bus → disposalSignal fires → unsubs from other

    other.emit('count', 2);
    expect(listener).toHaveBeenCalledOnce(); // no second call

    other.dispose();
  });
});

describe('createBus - tap()', () => {
  it('emits subscribe and unsubscribe events', () => {
    const events: HeraldEvent<TestEvents>[] = [];
    const bus = createBus<TestEvents>();

    bus.tap((e) => events.push(e));
    const unsub = bus.on('count', vi.fn());

    expect(events).toContainEqual({ event: 'count', type: 'subscribe' });

    unsub();

    expect(events).toContainEqual({ event: 'count', type: 'unsubscribe' });
    bus.dispose();
  });

  it('emits subscribe-any and unsubscribe-any for wildcard listeners', () => {
    const events: HeraldEvent<TestEvents>[] = [];
    const bus = createBus<TestEvents>();

    bus.tap((event) => events.push(event));
    const unsubscribe = bus.onAny(vi.fn());

    expect(events).toContainEqual({ type: 'subscribe-any' });

    unsubscribe();

    expect(events).toContainEqual({ type: 'unsubscribe-any' });
    bus.dispose();
  });

  it('emits emit events with listener count and payload', () => {
    const events: HeraldEvent<TestEvents>[] = [];
    const bus = createBus<TestEvents>();

    bus.tap((e) => events.push(e));
    bus.on('count', vi.fn());
    bus.emit('count', 42);

    const emitEvent = events.find((e) => e.type === 'emit');

    expect(emitEvent).toEqual({ event: 'count', listeners: 1, payload: 42, type: 'emit' });
    bus.dispose();
  });

  it('emits dispose event', () => {
    const events: HeraldEvent<TestEvents>[] = [];
    const bus = createBus<TestEvents>();

    bus.tap((e) => events.push(e));
    bus.dispose();

    expect(events).toContainEqual({ type: 'dispose' });
  });

  it('emits error events before rethrowing a listener failure', () => {
    const events: HeraldEvent<TestEvents>[] = [];
    const bus = createBus<TestEvents>();

    bus.tap((e) => events.push(e));
    bus.on('count', () => {
      throw new Error('boom');
    });

    expect(() => bus.emit('count', 1)).toThrow('boom');

    const errorEvent = events.find((e) => e.type === 'error');

    expect(errorEvent).toBeDefined();
    expect(errorEvent).toEqual({
      error: expect.any(Error),
      event: 'count',
      type: 'error',
    });
    bus.dispose();
  });

  it('returns unsubscribe that stops events', () => {
    const events: HeraldEvent<TestEvents>[] = [];
    const bus = createBus<TestEvents>();

    const stop = bus.tap((e) => events.push(e));

    stop();
    bus.on('count', vi.fn());
    bus.emit('count', 1);

    expect(events).toHaveLength(0);
    bus.dispose();
  });

  it('auto-detaches on signal abort', () => {
    const events: HeraldEvent<TestEvents>[] = [];
    const bus = createBus<TestEvents>();
    const controller = new AbortController();

    bus.tap((e) => events.push(e), { signal: controller.signal });
    controller.abort();
    bus.on('count', vi.fn());
    bus.emit('count', 1);

    expect(events).toHaveLength(0);
    bus.dispose();
  });

  it('swallows handler errors', () => {
    const bus = createBus<TestEvents>();

    bus.tap(() => {
      throw new Error('tap handler error');
    });

    expect(() => bus.emit('count', 1)).not.toThrow();
    bus.dispose();
  });
});

describe('createBus - name option', () => {
  it('BusDisposedError message includes the bus name', async () => {
    const bus = createBus<TestEvents>({ name: 'myBus' });
    const pending = bus.wait('count');

    bus.dispose();

    await expect(pending).rejects.toThrow('"myBus"');
  });

  it('BusDisposedError message is generic when no name is provided', async () => {
    const bus = createBus<TestEvents>();
    const pending = bus.wait('count');

    bus.dispose();

    await expect(pending).rejects.toThrow('Bus is disposed');
  });

  it('warn messages include the bus name', () => {
    const warns: string[] = [];
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((m: string) => warns.push(m));
    const bus = createBus<TestEvents>({ maxListeners: 1, name: 'auth' });

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(warns[0]).toContain('on("count")');
    expect(warns[0]).toContain('(auth)');

    bus.dispose();
    warnSpy.mockRestore();
  });
});

describe('createBus - wait() edge cases', () => {
  it('rejects immediately when bus is already disposed at call time', async () => {
    const bus = createBus<TestEvents>();

    bus.dispose();

    await expect(bus.wait('count')).rejects.toBeInstanceOf(BusDisposedError);
  });
});

describe('createBus - waitAny() edge cases', () => {
  it('rejects immediately when provided signal is already aborted', async () => {
    const bus = createBus<TestEvents>();
    const signal = AbortSignal.abort('already-aborted');

    await expect(bus.waitAny(['count', 'greet'], { signal })).rejects.toBe('already-aborted');

    bus.dispose();
  });
});

describe('createBus - maxListeners warning', () => {
  it('warns via console.warn when maxListeners is exceeded', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ maxListeners: 1 });

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('on("count")');

    bus.dispose();
    warnSpy.mockRestore();
  });
});

describe('createBus - waitAny() guards', () => {
  it('throws HeraldConfigError when called with fewer than 2 event keys', () => {
    const bus = createBus<TestEvents>();

    expect(() => bus.waitAny(['count'] as unknown as ['count', 'greet'])).toThrow(HeraldConfigError);
    expect(() => bus.waitAny(['count'] as unknown as ['count', 'greet'])).toThrow(
      'waitAny() requires at least 2 event keys',
    );

    bus.dispose();
  });
});

describe('HeraldError instanceof', () => {
  it('returns true for BusDisposedError and HeraldConfigError instances', () => {
    expect(new BusDisposedError()).toBeInstanceOf(HeraldError);
    expect(new HeraldConfigError('bad config')).toBeInstanceOf(HeraldError);
  });

  it('returns false for a plain Error or a non-error value', () => {
    expect(new Error('plain')).not.toBeInstanceOf(HeraldError);
    expect('not an error').not.toBeInstanceOf(HeraldError);
    expect(undefined).not.toBeInstanceOf(HeraldError);
  });
});
