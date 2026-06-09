import { BusDisposedError, combineSignals, createBus } from '../index';
import { pipeEvents } from '../pipe';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: void;
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

  it('removeAllListeners(event) removes only that event listeners', () => {
    const bus = createBus<TestEvents>();
    const countListener = vi.fn();
    const greetListener = vi.fn();

    bus.on('count', countListener);
    bus.on('greet', greetListener);

    bus.removeAllListeners('count');
    bus.emit('count', 1);
    bus.emit('greet', { name: 'Alice' });

    expect(countListener).not.toHaveBeenCalled();
    expect(greetListener).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('removeAllListeners() removes all listeners', () => {
    const bus = createBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.on('greet', vi.fn());

    bus.removeAllListeners();

    expect(bus.listenerCount()).toBe(0);
    expect(bus.eventNames()).toEqual([]);
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

  // R8: per-event count includes wildcard listeners (they fire on every emission).
  it('listenerCount(event) includes wildcard listeners', () => {
    const bus = createBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.onAny(vi.fn());
    bus.onAny(vi.fn());

    expect(bus.listenerCount('count')).toBe(3); // 1 specific + 2 wildcards
    expect(bus.listenerCount('greet')).toBe(2); // 0 specific + 2 wildcards
    expect(bus.listenerCount()).toBe(3); // 1 specific + 2 wildcards (wildcards counted once)

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

  it('rethrows listener errors by default', () => {
    const bus = createBus<TestEvents>();

    bus.on('count', () => {
      throw new Error('boom');
    });

    expect(() => bus.emit('count', 1)).toThrow('boom');
  });

  it('forwards listener errors to onError and continues remaining listeners', () => {
    const onError = vi.fn();
    const after = vi.fn();
    const bus = createBus<TestEvents>({ onError });

    bus.on('count', () => {
      throw new Error('boom');
    });
    bus.on('count', after);

    bus.emit('count', 99);

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith({
      err: expect.any(Error),
      event: 'count',
      payload: 99,
      timestamp: expect.any(Number),
    });
    expect(after).toHaveBeenCalledWith(99);
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

describe('createBus - events async generator', () => {
  it('yields values in emission order', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus.events('count');

    const first = stream.next();

    bus.emit('count', 1);

    expect((await first).value).toBe(1);

    const second = stream.next();

    bus.emit('count', 2);

    expect((await second).value).toBe(2);

    await stream.return(undefined);
  });

  it('captures events emitted before the first next() call (eager subscription)', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus.events('count');

    // Emit before starting iteration — subscription is already active
    bus.emit('count', 42);

    expect(await stream.next()).toEqual({ done: false, value: 42 });

    await stream.return(undefined);
  });

  it('throws RangeError synchronously when maxBuffer is not a positive number', () => {
    const bus = createBus<TestEvents>();

    expect(() => bus.events('count', { maxBuffer: 0 })).toThrow(RangeError);
    expect(() => bus.events('count', { maxBuffer: -1 })).toThrow(RangeError);
  });

  it('drops oldest values when maxBuffer is exceeded', async () => {
    const bus = createBus<TestEvents>();
    // Emit all synchronously to test buffer overflow behavior deterministically
    const stream = bus.events('count', { maxBuffer: 2 });
    const first = stream.next();

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);

    expect(await first).toEqual({ done: false, value: 2 });
    expect(await stream.next()).toEqual({ done: false, value: 3 });

    await stream.return(undefined);
  });

  it('finishes immediately when created with an already aborted signal', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();

    controller.abort();

    const stream = bus.events('count', { signal: controller.signal });

    await expect(stream.next()).resolves.toEqual({ done: true, value: undefined });
  });

  it('terminates when signal aborts', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const collected: number[] = [];

    const consume = (async () => {
      for await (const value of bus.events('count', { signal: controller.signal })) {
        collected.push(value);
      }
    })();

    bus.emit('count', 10);
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();

    await consume;

    expect(collected).toEqual([10]);
  });

  it('terminates when bus is disposed', async () => {
    const bus = createBus<TestEvents>();
    const collected: number[] = [];

    const consume = (async () => {
      for await (const value of bus.events('count')) {
        collected.push(value);
      }
    })();

    bus.emit('count', 10);
    await new Promise((r) => setTimeout(r, 0));
    bus.dispose();

    await consume;

    expect(collected).toEqual([10]);
  });

  it('Symbol.asyncDispose tears down the subscription', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus.events('count');

    expect(bus.listenerCount('count')).toBe(1);

    await stream[Symbol.asyncDispose]();

    expect(bus.listenerCount('count')).toBe(0);
  });

  it('supports await using for automatic cleanup', async () => {
    const bus = createBus<TestEvents>();
    const collected: number[] = [];

    {
      await using stream = bus.events('count');

      bus.emit('count', 1);
      collected.push((await stream.next()).value as number);
    }

    // After the using block, the subscription should be gone
    expect(bus.listenerCount('count')).toBe(0);
    expect(collected).toEqual([1]);
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

  it('is cleared by removeAllListeners() without argument', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.onAny(listener);
    bus.removeAllListeners();
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
    expect(bus.listenerCount()).toBe(0);
  });

  it('is NOT cleared by removeAllListeners(event)', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', vi.fn());
    bus.onAny(listener);
    bus.removeAllListeners('count');
    bus.emit('count', 1);

    expect(listener).toHaveBeenCalledWith('count', 1);
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

  it('counts toward listenerCount() total and per-event counts', () => {
    const bus = createBus<TestEvents>();

    bus.onAny(vi.fn());
    bus.onAny(vi.fn());

    expect(bus.listenerCount()).toBe(2);
    expect(bus.listenerCount('count')).toBe(2); // wildcards fire for every event
  });

  it('errors forwarded to onError and remaining wildcard listeners continue', () => {
    const onError = vi.fn();
    const after = vi.fn();
    const bus = createBus<TestEvents>({ onError });

    bus.onAny(() => {
      throw new Error('wildcard boom');
    });
    bus.onAny(after);

    bus.emit('count', 1);

    expect(onError).toHaveBeenCalledOnce();
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
    expect(spy.mock.calls[0][0]).toContain('[herald:warn]');
    expect(spy.mock.calls[0][0]).toContain('"count"');

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
    expect(spy.mock.calls[0][0]).toContain('[herald:warn]');

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

describe('createBus - debug mode', () => {
  it('logs on() and off() to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ logger: { debug: console.debug } });

    const unsub = bus.on('count', vi.fn());

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[herald:sub] on("count")'));

    unsub();

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[herald:sub] off("count")'));

    bus.dispose();
    spy.mockRestore();
  });

  it('logs emit() to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ logger: { debug: console.debug } });

    bus.emit('count', 42);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[herald:emit] emit("count")'));

    bus.dispose();
    spy.mockRestore();
  });

  it('logs dispose() to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ logger: { debug: console.debug } });

    bus.dispose();

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[herald:lifecycle] dispose()'));

    spy.mockRestore();
  });

  it('does not log anything when debug is not set', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = createBus<TestEvents>();

    const unsub = bus.on('count', vi.fn());

    unsub();
    bus.emit('count', 1);
    bus.dispose();

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});

describe('pipeEvents() - via bus tests', () => {
  it('forwards listed events from source to target', () => {
    const source = createBus<TestEvents>();
    const target = createBus<TestEvents>();
    const listener = vi.fn();

    target.on('count', listener);
    pipeEvents(source, target, ['count']);

    source.emit('count', 42);

    expect(listener).toHaveBeenCalledWith(42);

    source.dispose();
    target.dispose();
  });

  it('forwards multiple events and supports renamed entries', () => {
    type SourceEvents = { count: number; greet: { name: string } };
    type TargetEvents = { count: number; hello: { name: string } };

    const source = createBus<SourceEvents>();
    const target = createBus<TargetEvents>();
    const onCount = vi.fn();
    const onHello = vi.fn();

    target.on('count', onCount);
    target.on('hello', onHello);
    pipeEvents(source, target, ['count', { from: 'greet', to: 'hello' }]);

    source.emit('count', 1);
    source.emit('greet', { name: 'Alice' });

    expect(onCount).toHaveBeenCalledWith(1);
    expect(onHello).toHaveBeenCalledWith({ name: 'Alice' });

    source.dispose();
    target.dispose();
  });

  it('returned function stops forwarding', () => {
    const source = createBus<TestEvents>();
    const target = createBus<TestEvents>();
    const listener = vi.fn();

    target.on('count', listener);

    const stop = pipeEvents(source, target, ['count']);

    source.emit('count', 1);
    stop();
    source.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);

    source.dispose();
    target.dispose();
  });

  it('tears down automatically when target is disposed', () => {
    const source = createBus<TestEvents>();
    const target = createBus<TestEvents>();
    const listener = vi.fn();

    target.on('count', listener);
    pipeEvents(source, target, ['count']);

    source.emit('count', 1);
    target.dispose();
    source.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);

    source.dispose();
  });

  it('respects an optional external signal for teardown', () => {
    const source = createBus<TestEvents>();
    const target = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    target.on('count', listener);
    pipeEvents(source, target, ['count'], controller.signal);

    source.emit('count', 1);
    controller.abort();
    source.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();

    source.dispose();
    target.dispose();
  });
});

// F5: emit() return value
describe('createBus - emit() return value', () => {
  it('returns 0 when there are no listeners', () => {
    const bus = createBus<TestEvents>();

    expect(bus.emit('count', 1)).toBe(0);

    bus.dispose();
  });

  it('returns the number of specific listeners dispatched to', () => {
    const bus = createBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(bus.emit('count', 1)).toBe(2);

    bus.dispose();
  });

  it('includes wildcard listeners in the dispatched count', () => {
    const bus = createBus<TestEvents>();

    bus.on('count', vi.fn()); // 1 specific
    bus.onAny(vi.fn()); // 1 wildcard

    expect(bus.emit('count', 1)).toBe(2);

    bus.dispose();
  });

  it('returns 0 when the bus is disposed', () => {
    const bus = createBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.dispose();

    expect(bus.emit('count', 1)).toBe(0);
  });

  it('returns 0 when middleware blocks dispatch', () => {
    const bus = createBus<TestEvents>({
      middleware: [
        (_event, _payload, _next) => {
          /* do not call next() */
        },
      ],
    });

    bus.on('count', vi.fn());

    expect(bus.emit('count', 1)).toBe(0);

    bus.dispose();
  });
});

// F6: Middleware pipeline
describe('createBus - middleware', () => {
  it('middleware runs before listeners', () => {
    const order: string[] = [];
    const bus = createBus<TestEvents>({
      middleware: [
        (_event, _payload, next) => {
          order.push('middleware');
          next();
        },
      ],
    });

    bus.on('count', () => order.push('listener'));
    bus.emit('count', 1);

    expect(order).toEqual(['middleware', 'listener']);

    bus.dispose();
  });

  it('multiple middleware run in order before listeners', () => {
    const order: string[] = [];
    const bus = createBus<TestEvents>({
      middleware: [
        (_e, _p, next) => {
          order.push('mw1');
          next();
        },
        (_e, _p, next) => {
          order.push('mw2');
          next();
        },
      ],
    });

    bus.on('count', () => order.push('listener'));
    bus.emit('count', 1);

    expect(order).toEqual(['mw1', 'mw2', 'listener']);

    bus.dispose();
  });

  it('middleware receives event name and payload', () => {
    const captured: Array<{ event: string; payload: unknown }> = [];
    const bus = createBus<TestEvents>({
      middleware: [
        (event, payload, next) => {
          captured.push({ event, payload });
          next();
        },
      ],
    });

    bus.on('count', vi.fn());
    bus.emit('count', 42);

    expect(captured).toEqual([{ event: 'count', payload: 42 }]);

    bus.dispose();
  });

  it('middleware can block dispatch by not calling next()', () => {
    const listener = vi.fn();
    const bus = createBus<TestEvents>({
      middleware: [
        (_event, _payload, _next) => {
          /* omit next() */
        },
      ],
    });

    bus.on('count', listener);
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();

    bus.dispose();
  });

  it('middleware does not run on a disposed bus', () => {
    const mw = vi.fn((_e: string, _p: unknown, next: () => void) => next());
    const bus = createBus<TestEvents>({ middleware: [mw] });

    bus.dispose();
    bus.emit('count', 1);

    expect(mw).not.toHaveBeenCalled();
  });

  it('onAny still fires when middleware calls next()', () => {
    const bus = createBus<TestEvents>({
      middleware: [(_e, _p, next) => next()],
    });
    const observer = vi.fn();

    bus.onAny(observer);
    bus.emit('count', 7);

    expect(observer).toHaveBeenCalledWith('count', 7);

    bus.dispose();
  });

  it('middleware calling next() twice does not double-dispatch to listeners', () => {
    const listener = vi.fn();
    const bus = createBus<TestEvents>({
      middleware: [
        (_event, _payload, next) => {
          next();
          next(); // second call must be a no-op
        },
      ],
    });

    bus.on('count', listener);
    bus.emit('count', 1);

    expect(listener).toHaveBeenCalledOnce();

    bus.dispose();
  });

  it('a throwing middleware propagates out of emit()', () => {
    const bus = createBus<TestEvents>({
      middleware: [
        () => {
          throw new Error('mw boom');
        },
      ],
    });

    bus.on('count', vi.fn());

    expect(() => bus.emit('count', 1)).toThrow('mw boom');

    bus.dispose();
  });
});

// F7: validatePayload hook
describe('createBus - validatePayload', () => {
  it('allows emission when validator does not throw', () => {
    const listener = vi.fn();
    const bus = createBus<TestEvents>({
      validatePayload: (event, payload) => {
        if (event === 'count' && typeof payload !== 'number') throw new Error('must be number');
      },
    });

    bus.on('count', listener);
    bus.emit('count', 5);

    expect(listener).toHaveBeenCalledWith(5);

    bus.dispose();
  });

  it('blocks emission and rethrows when validator throws (no onError)', () => {
    const listener = vi.fn();
    const bus = createBus<TestEvents>({
      validatePayload: () => {
        throw new Error('invalid');
      },
    });

    bus.on('count', listener);

    expect(() => bus.emit('count', 1)).toThrow('invalid');
    expect(listener).not.toHaveBeenCalled();

    bus.dispose();
  });

  it('blocks emission and forwards to onError when validator throws (with onError)', () => {
    const onError = vi.fn();
    const listener = vi.fn();
    const bus = createBus<TestEvents>({
      onError,
      validatePayload: () => {
        throw new Error('invalid');
      },
    });

    bus.on('count', listener);

    const count = bus.emit('count', 1);

    expect(count).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        event: 'count',
        payload: 1,
      }),
    );

    bus.dispose();
  });

  it('runs before middleware', () => {
    const order: string[] = [];
    const bus = createBus<TestEvents>({
      middleware: [
        (_e, _p, next) => {
          order.push('middleware');
          next();
        },
      ],
      validatePayload: () => {
        order.push('validate');
      },
    });

    bus.on('count', () => order.push('listener'));
    bus.emit('count', 1);

    expect(order).toEqual(['validate', 'middleware', 'listener']);

    bus.dispose();
  });
});

// F1: EventStream filter/map operators
describe('createBus - events().filter() and events().map()', () => {
  it('filter() yields only values that pass the predicate', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus.events('count').filter((n) => n % 2 === 0);
    const results: number[] = [];

    const consume = (async () => {
      for await (const n of stream) {
        results.push(n);

        if (results.length === 2) break;
      }
    })();

    bus.emit('count', 1); // filtered out
    bus.emit('count', 2); // passes
    bus.emit('count', 3); // filtered out
    bus.emit('count', 4); // passes

    await consume;

    expect(results).toEqual([2, 4]);
  });

  it('map() transforms each yielded value', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus.events('count').map((n) => n * 10);
    const results: number[] = [];

    const consume = (async () => {
      for await (const n of stream) {
        results.push(n);

        if (results.length === 2) break;
      }
    })();

    bus.emit('count', 1);
    bus.emit('count', 2);

    await consume;

    expect(results).toEqual([10, 20]);
  });

  it('filter().map() chains work correctly', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus
      .events('count')
      .filter((n) => n > 0)
      .map((n) => `n=${n}`);
    const results: string[] = [];

    const consume = (async () => {
      for await (const s of stream) {
        results.push(s);

        if (results.length === 2) break;
      }
    })();

    bus.emit('count', -1); // filtered
    bus.emit('count', 1);
    bus.emit('count', 2);

    await consume;

    expect(results).toEqual(['n=1', 'n=2']);
  });

  it('Symbol.asyncDispose on filtered stream unsubscribes from the bus', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus.events('count').filter((n) => n > 0);

    expect(bus.listenerCount('count')).toBe(1);

    await stream[Symbol.asyncDispose]();

    expect(bus.listenerCount('count')).toBe(0);
  });

  it('Symbol.asyncDispose on mapped stream unsubscribes from the bus', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus.events('count').map((n) => n * 2);

    expect(bus.listenerCount('count')).toBe(1);

    await stream[Symbol.asyncDispose]();

    expect(bus.listenerCount('count')).toBe(0);
  });

  it('bus disposal terminates a filtered stream', async () => {
    const bus = createBus<TestEvents>();
    const collected: number[] = [];

    const consume = (async () => {
      for await (const n of bus.events('count').filter((n) => n > 0)) {
        collected.push(n);
      }
    })();

    bus.emit('count', 1);
    await new Promise((r) => setTimeout(r, 0));
    bus.dispose();

    await consume;

    expect(collected).toEqual([1]);
  });

  it('sibling streams from the same base share the subscription and disposal handle', async () => {
    // Two .filter() calls on the same base both iterate `gen`, which uses one subscription.
    const bus = createBus<TestEvents>();
    const base = bus.events('count');
    const evens = base.filter((n) => n % 2 === 0);
    const odds = base.filter((n) => n % 2 !== 0);

    // One subscription registered for both siblings.
    expect(bus.listenerCount('count')).toBe(1);

    // Disposing one sibling disposes the shared subscription — the other is also terminated.
    await evens[Symbol.asyncDispose]();

    expect(bus.listenerCount('count')).toBe(0);

    // odds generator should be done because the underlying gen is closed.
    const result = await odds.next();

    expect(result.done).toBe(true);

    bus.dispose();
  });
});

describe('combineSignals', () => {
  it('returns a if b is not provided', () => {
    const ctrl = new AbortController();

    expect(combineSignals(ctrl.signal)).toBe(ctrl.signal);
  });

  it('returns a immediately if a is already aborted', () => {
    const a = AbortSignal.abort('reason-a');
    const b = new AbortController().signal;

    expect(combineSignals(a, b)).toBe(a);
  });

  it('returns b immediately if b is already aborted', () => {
    const a = new AbortController().signal;
    const b = AbortSignal.abort('reason-b');

    expect(combineSignals(a, b)).toBe(b);
  });

  it('aborts when a aborts', () => {
    const ctrlA = new AbortController();
    const ctrlB = new AbortController();
    const combined = combineSignals(ctrlA.signal, ctrlB.signal);

    expect(combined.aborted).toBe(false);
    ctrlA.abort('from-a');
    expect(combined.aborted).toBe(true);
    expect(combined.reason).toBe('from-a');
  });

  it('aborts when b aborts', () => {
    const ctrlA = new AbortController();
    const ctrlB = new AbortController();
    const combined = combineSignals(ctrlA.signal, ctrlB.signal);

    ctrlB.abort('from-b');
    expect(combined.aborted).toBe(true);
    expect(combined.reason).toBe('from-b');
  });

  it('does not leak listeners when neither signal aborts', () => {
    const ctrlA = new AbortController();
    const ctrlB = new AbortController();
    const combined = combineSignals(ctrlA.signal, ctrlB.signal);

    ctrlA.abort();
    expect(combined.aborted).toBe(true);
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

  it('debug log messages are suffixed with the bus name', () => {
    const logs: string[] = [];
    const bus = createBus<TestEvents>({ logger: { debug: (m) => logs.push(m) }, name: 'auth' });

    bus.emit('count', 1);

    expect(logs[0]).toContain('(auth)');

    bus.dispose();
  });

  it('warn messages include the bus name', () => {
    const warns: string[] = [];
    const bus = createBus<TestEvents>({ logger: { warn: (m) => warns.push(m) }, maxListeners: 1, name: 'auth' });

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(warns[0]).toContain('[herald:warn:auth]');

    bus.dispose();
  });
});

describe('createBus - waitAny runtime guard', () => {
  it('throws RangeError when fewer than 2 events are provided', () => {
    const bus = createBus<TestEvents>();

    expect(() => bus.waitAny(['count'] as unknown as [string, string])).toThrow(RangeError);
    expect(() => bus.waitAny([] as unknown as [string, string])).toThrow(RangeError);

    bus.dispose();
  });

  it('resolves normally with 2 or more events', async () => {
    const bus = createBus<TestEvents>();
    const pending = bus.waitAny(['count', 'greet']);

    bus.emit('count', 7);

    await expect(pending).resolves.toEqual({ event: 'count', payload: 7 });

    bus.dispose();
  });
});

describe('createBus - events().take()', () => {
  it('yields exactly n values then stops', async () => {
    const bus = createBus<TestEvents>();
    const collected: number[] = [];

    const consume = (async () => {
      for await (const n of bus.events('count').take(3)) {
        collected.push(n);
      }
    })();

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);
    bus.emit('count', 4); // should not be collected

    await consume;

    expect(collected).toEqual([1, 2, 3]);

    bus.dispose();
  });

  it('throws RangeError for non-positive n', () => {
    const bus = createBus<TestEvents>();

    expect(() => bus.events('count').take(0)).toThrow(RangeError);
    expect(() => bus.events('count').take(-1)).toThrow(RangeError);
    expect(() => bus.events('count').take(1.5)).toThrow(RangeError);

    bus.dispose();
  });

  it('terminates early when bus disposes before n values', async () => {
    const bus = createBus<TestEvents>();
    const collected: number[] = [];

    const consume = (async () => {
      for await (const n of bus.events('count').take(10)) {
        collected.push(n);
      }
    })();

    bus.emit('count', 1);
    await new Promise((r) => setTimeout(r, 0));
    bus.dispose();

    await consume;

    expect(collected).toEqual([1]);
  });

  it('can be chained after filter()', async () => {
    const bus = createBus<TestEvents>();
    const collected: number[] = [];

    const consume = (async () => {
      for await (const n of bus
        .events('count')
        .filter((n) => n % 2 === 0)
        .take(2)) {
        collected.push(n);
      }
    })();

    bus.emit('count', 1); // filtered
    bus.emit('count', 2); // passes, count=1
    bus.emit('count', 3); // filtered
    bus.emit('count', 4); // passes, count=2 → stops
    bus.emit('count', 6); // not reached

    await consume;

    expect(collected).toEqual([2, 4]);

    bus.dispose();
  });
});

describe('createBus - events() filter + map chaining', () => {
  it('filter then map transforms values correctly', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus
      .events('count')
      .filter((n) => n > 0)
      .map((n) => n * 10);
    const results: number[] = [];

    const consume = (async () => {
      for await (const n of stream) {
        results.push(n);

        if (results.length === 2) break;
      }
    })();

    bus.emit('count', -1); // filtered
    bus.emit('count', 2); // → 20
    bus.emit('count', 3); // → 30

    await consume;

    expect(results).toEqual([20, 30]);

    bus.dispose();
  });

  it('map then filter works in sequence', async () => {
    const bus = createBus<TestEvents>();
    const stream = bus
      .events('count')
      .map((n) => n * 2)
      .filter((n) => n > 4);
    const results: number[] = [];

    const consume = (async () => {
      for await (const n of stream) {
        results.push(n);

        if (results.length === 2) break;
      }
    })();

    bus.emit('count', 1); // 1*2=2, filtered (<= 4)
    bus.emit('count', 3); // 3*2=6, passes
    bus.emit('count', 4); // 4*2=8, passes

    await consume;

    expect(results).toEqual([6, 8]);

    bus.dispose();
  });
});

describe('createBus - events().take() subscription cleanup', () => {
  it('cleans up the subscription after natural exhaustion (no lingering listeners)', async () => {
    const bus = createBus<TestEvents>();

    const consume = (async () => {
      for await (const _ of bus.events('count').take(2)) {
        // consume
      }
    })();

    bus.emit('count', 1);
    bus.emit('count', 2);

    await consume;

    // After take(2) exhausted, the subscription must be removed
    expect(bus.listenerCount('count')).toBe(0);

    bus.dispose();
  });

  it('map() then take() yields mapped values and stops', async () => {
    const bus = createBus<TestEvents>();
    const collected: number[] = [];

    const consume = (async () => {
      for await (const n of bus
        .events('count')
        .map((n) => n * 3)
        .take(2)) {
        collected.push(n);
      }
    })();

    bus.emit('count', 1); // → 3
    bus.emit('count', 2); // → 6
    bus.emit('count', 3); // not collected

    await consume;

    expect(collected).toEqual([3, 6]);

    bus.dispose();
  });
});

describe('createBus - middleware double-next with chain', () => {
  it('double-next in first middleware does not cause second middleware to run twice', () => {
    const order: string[] = [];
    const bus = createBus<TestEvents>({
      middleware: [
        (_event, _payload, next) => {
          order.push('mw1-before');
          next();
          next(); // second call is no-op
          order.push('mw1-after');
        },
        (_event, _payload, next) => {
          order.push('mw2');
          next();
        },
      ],
    });

    bus.on('count', () => order.push('listener'));
    bus.emit('count', 1);

    expect(order).toEqual(['mw1-before', 'mw2', 'listener', 'mw1-after']);

    bus.dispose();
  });
});

describe('createBus - logger option', () => {
  it('routes debug output through logger.debug', () => {
    const logDebug = vi.fn();
    const bus = createBus<TestEvents>({ logger: { debug: logDebug } });

    bus.emit('count', 1);

    expect(logDebug).toHaveBeenCalled();
    expect(logDebug.mock.calls[0][0]).toContain('[herald:emit]');

    bus.dispose();
  });

  it('routes warn output through logger.warn when maxListeners is exceeded', () => {
    const logWarn = vi.fn();
    const bus = createBus<TestEvents>({ logger: { warn: logWarn }, maxListeners: 1 });

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(logWarn).toHaveBeenCalledOnce();
    expect(logWarn.mock.calls[0][0]).toContain('[herald:warn]');

    bus.dispose();
  });

  it('suppresses debug output when logger.debug is not provided', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ logger: {} });

    bus.emit('count', 1);

    expect(spy).not.toHaveBeenCalled();

    bus.dispose();
    spy.mockRestore();
  });

  it('suppresses warn output when logger.warn is not provided', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ logger: {}, maxListeners: 1 });

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(spy).not.toHaveBeenCalled();

    bus.dispose();
    spy.mockRestore();
  });
});
