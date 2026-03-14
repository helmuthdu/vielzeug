import { createBus } from './eventit';
import { createTestBus } from './test';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: undefined;
};

/** -------------------- on -------------------- **/

describe('on', () => {
  it('delivers the payload to every registered listener', () => {
    const bus = createBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();

    bus.on('count', a);
    bus.on('count', b);
    bus.emit('count', 42);
    expect(a).toHaveBeenCalledWith(42);
    expect(b).toHaveBeenCalledWith(42);
  });

  it('registering the same function twice is idempotent', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.on('count', listener);
    bus.emit('count', 1);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('returns an unsubscribe token that silences the listener; token is idempotent', () => {
    const bus = createBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    const unsub = bus.on('count', a);

    bus.on('count', b);
    unsub();
    unsub(); // safe to call multiple times
    bus.emit('count', 1);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith(1);
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

  it('is a no-op when signal is already aborted', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    controller.abort();
    bus.on('count', listener, controller.signal);
    bus.emit('count', 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('manual unsub removes itself from the signal — no dangling reference', () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const listener = vi.fn();
    const unsub = bus.on('count', listener, controller.signal);

    bus.emit('count', 1);
    unsub(); // manual removal — should also detach from signal
    controller.abort(); // firing signal after manual unsub must not call listener
    bus.emit('count', 2); // belt-and-suspenders: still silent after abort too
    expect(listener).toHaveBeenCalledOnce(); // only the first emit
  });
});

/** -------------------- once -------------------- **/

describe('once', () => {
  it('fires exactly once; subsequent emits are ignored', () => {
    const bus = createBus<TestEvents>();
    const once = vi.fn();
    const permanent = vi.fn();

    bus.once('count', once);
    bus.on('count', permanent);
    bus.emit('count', 1);
    bus.emit('count', 2);
    expect(once).toHaveBeenCalledOnce();
    expect(once).toHaveBeenCalledWith(1);
    expect(permanent).toHaveBeenCalledTimes(2);
  });

  it('can be cancelled before firing via its unsubscribe token', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const unsub = bus.once('count', listener);

    unsub();
    bus.emit('count', 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('auto-cancels when signal aborts before the event fires', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();
    const controller = new AbortController();

    bus.once('count', listener, controller.signal);
    controller.abort();
    bus.emit('count', 1);
    expect(listener).not.toHaveBeenCalled();
  });
});

/** -------------------- emit -------------------- **/

describe('emit', () => {
  it('is a no-op with no registered listeners; void events require no argument', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('toggle', listener);
    expect(() => bus.emit('count', 1)).not.toThrow(); // no listeners, no throw
    bus.emit('toggle'); // no payload argument needed or allowed
    expect(listener).toHaveBeenCalledOnce();
  });

  it('calls listeners in registration order without cross-firing other events', () => {
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

  it('snapshots listeners at call time — additions during emit do not run in the same cycle', () => {
    const bus = createBus<TestEvents>();
    const called: string[] = [];

    bus.on('count', () => {
      called.push('a');
      bus.on('count', () => called.push('late'));
    });
    bus.on('count', () => called.push('b'));
    bus.emit('count', 1);
    expect(called).toEqual(['a', 'b']);
    bus.emit('count', 2);
    expect(called).toEqual(['a', 'b', 'a', 'b', 'late']); // 'late' registered after 'b', runs after 'b' in second run
  });

  it('re-throws listener errors by default; with onError it isolates and continues', () => {
    const onError = vi.fn();
    const after = vi.fn();

    const strict = createBus<TestEvents>();

    strict.on('count', () => {
      throw new Error('boom');
    });
    expect(() => strict.emit('count', 1)).toThrow('boom');

    const resilient = createBus<TestEvents>({ onError });

    resilient.on('count', () => {
      throw new Error('boom');
    });
    resilient.on('count', after);
    resilient.emit('count', 99);
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0]).toEqual([expect.any(Error), 'count', 99]);
    expect(after).toHaveBeenCalledWith(99);
  });
});

/** -------------------- wait -------------------- **/

describe('wait', () => {
  it('resolves typed payload from the first emit and is one-shot', async () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);

    const p = bus.wait('count');

    bus.emit('count', 1);
    bus.emit('count', 2);
    await expect(p).resolves.toBe(1);
    expect(listener).toHaveBeenCalledTimes(2); // persistent listener unaffected
  });

  it('resolves with undefined for void events', async () => {
    const bus = createBus<TestEvents>();
    const p = bus.wait('toggle');

    bus.emit('toggle');
    await expect(p).resolves.toBeUndefined();
  });

  it('rejects immediately when called on an already-disposed bus', async () => {
    const bus = createBus<TestEvents>();

    bus.dispose();
    await expect(bus.wait('count')).rejects.toThrow('Bus is disposed');
  });

  it('rejects a pending wait when the bus is disposed mid-flight', async () => {
    const bus = createBus<TestEvents>();
    const p = bus.wait('count');

    bus.dispose();
    await expect(p).rejects.toThrow('Bus is disposed');
  });

  it('rejects immediately when signal is already aborted', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();

    controller.abort(new Error('cancelled'));
    await expect(bus.wait('count', controller.signal)).rejects.toThrow('cancelled');
  });

  it('rejects with signal reason when signal aborts mid-flight', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const p = bus.wait('count', controller.signal);

    controller.abort(new Error('cancelled'));
    await expect(p).rejects.toThrow('cancelled');
  });

  it('signal abort after resolution has no effect', async () => {
    const bus = createBus<TestEvents>();
    const controller = new AbortController();
    const p = bus.wait('count', controller.signal);

    bus.emit('count', 7);
    await expect(p).resolves.toBe(7);
    expect(() => controller.abort()).not.toThrow(); // no double-reject
  });
});

/** -------------------- dispose / Symbol.dispose -------------------- **/

describe('dispose', () => {
  it('blocks all operations; disposed reflects the state correctly', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    expect(bus.disposed).toBe(false);

    bus.dispose();
    expect(bus.disposed).toBe(true);

    bus.emit('count', 1); // no-op
    bus.on('count', vi.fn()); // no-op, returns harmless unsub
    bus.once('count', vi.fn()); // no-op
    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects all pending wait() promises', async () => {
    const bus = createBus<TestEvents>();
    const p1 = bus.wait('count');
    const p2 = bus.wait('greet');

    bus.dispose();
    await expect(p1).rejects.toThrow('Bus is disposed');
    await expect(p2).rejects.toThrow('Bus is disposed');
  });

  it('is idempotent — safe to call multiple times', () => {
    const bus = createBus<TestEvents>();

    bus.on('count', vi.fn());
    expect(() => {
      bus.dispose();
      bus.dispose();
      bus.dispose();
    }).not.toThrow();
    expect(bus.disposed).toBe(true);
  });

  it('[Symbol.dispose] is an alias for dispose()', () => {
    const bus = createBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus[Symbol.dispose]();
    expect(bus.disposed).toBe(true);
    bus.emit('count', 1);
    expect(listener).not.toHaveBeenCalled();
  });
});

/** -------------------- events -------------------- **/

describe('events', () => {
  it('yields each emitted value in order', async () => {
    const bus = createBus<TestEvents>();
    const gen = bus.events('count');

    // Pull-based: request next value first, then emit
    const p1 = gen.next();

    bus.emit('count', 1);
    expect((await p1).value).toBe(1);

    const p2 = gen.next();

    bus.emit('count', 2);
    expect((await p2).value).toBe(2);

    gen.return(undefined); // clean up
  });

  it('terminates when the bus is disposed', async () => {
    const bus = createBus<TestEvents>();
    const results: number[] = [];
    const done = (async () => {
      try {
        for await (const val of bus.events('count')) results.push(val);
      } catch {
        // dispose rejects the pending wait — iterator terminates
      }
    })();

    bus.emit('count', 10);
    await new Promise((r) => setTimeout(r, 0));
    bus.dispose();
    await done;
    expect(results).toEqual([10]);
  });
});

/** -------------------- createTestBus -------------------- **/

describe('createTestBus', () => {
  it('records typed payloads per event; returns empty array before any emission', () => {
    const bus = createTestBus<TestEvents>();

    expect(bus.emitted('count')).toEqual([]);
    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('greet', { name: 'Alice' });
    expect(bus.emitted('count')).toEqual([1, 2]);
    expect(bus.emitted('greet')).toEqual([{ name: 'Alice' }]);
  });

  it('dispatches events to registered listeners as a normal bus', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.emit('count', 42);
    expect(listener).toHaveBeenCalledWith(42);
  });

  it('emitted() returns a snapshot — mutations to the result do not affect records', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);

    const snap = bus.emitted('count');

    snap.push(99 as never);
    bus.emit('count', 2);
    expect(bus.emitted('count')).toEqual([1, 2]); // 99 not leaked back
  });

  it('reset clears records without affecting listeners', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.emit('count', 1);
    bus.reset();
    expect(bus.emitted('count')).toEqual([]);
    bus.emit('count', 2);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(bus.emitted('count')).toEqual([2]);
  });

  it('dispose clears records and bus; disposed getter reflects the underlying state', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.emit('count', 1);
    expect(bus.disposed).toBe(false);
    bus.dispose();
    expect(bus.disposed).toBe(true);
    bus.emit('count', 2);
    expect(listener).toHaveBeenCalledOnce();
    expect(bus.emitted('count')).toEqual([]);
  });

  it('[Symbol.dispose] clears records and disposes the bus', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus[Symbol.dispose]();
    expect(bus.disposed).toBe(true);
    expect(bus.emitted('count')).toEqual([]);
  });
});
