import { BusDisposedError, createBus } from '../index';

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

    const unsub = bus.on('count', listener, controller.signal);

    unsub(); // noop unsub — should not throw
    bus.emit('count', 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('auto-unsubscribes when the provided signal aborts', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    bus.on('count', listener, controller.signal);

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

    bus.once('count', listener, controller.signal);
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
    expect(onError.mock.calls[0]).toEqual([expect.any(Error), 'count', 99]);
    expect(after).toHaveBeenCalledWith(99);
  });

  it('calls onDispatch for every emit, including emits with no listeners', () => {
    const onDispatch = vi.fn();
    const bus = createBus<TestEvents>({ onDispatch });

    bus.emit('count', 1);
    bus.on('count', vi.fn());
    bus.emit('count', 2);

    expect(onDispatch.mock.calls).toEqual([
      ['count', 1],
      ['count', 2],
    ]);
  });

  it('does not call onDispatch or run listeners on a disposed bus', () => {
    const onDispatch = vi.fn();
    const listener = vi.fn();
    const bus = createBus<TestEvents>({ onDispatch });

    bus.on('count', listener);
    bus.dispose();
    bus.emit('count', 1);

    expect(onDispatch).not.toHaveBeenCalled();
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

    await expect(bus.wait('count', controller.signal)).rejects.toThrow('cancelled');
  });

  it('rejects with signal reason when signal aborts while waiting', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const pending = bus.wait('count', controller.signal);

    controller.abort(new Error('cancelled'));

    await expect(pending).rejects.toThrow('cancelled');
  });

  it('stays resolved if signal aborts after completion', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const pending = bus.wait('count', controller.signal);

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

    await expect(bus.waitAny(['count', 'greet'], controller.signal)).rejects.toThrow('cancelled');
  });

  it('rejects with signal reason when signal aborts while waiting', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const pending = bus.waitAny(['count', 'greet'], controller.signal);

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

    other.on('count', listener, bus.disposalSignal);

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
    const bus = createBus<TestEvents>({ debug: true });

    const unsub = bus.on('count', vi.fn());

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[herald:sub] on("count")'));

    unsub();

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[herald:sub] off("count")'));

    bus.dispose();
    spy.mockRestore();
  });

  it('logs emit() to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ debug: true });

    bus.emit('count', 42);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('[herald:emit] emit("count")'));

    bus.dispose();
    spy.mockRestore();
  });

  it('logs dispose() to console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = createBus<TestEvents>({ debug: true });

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
