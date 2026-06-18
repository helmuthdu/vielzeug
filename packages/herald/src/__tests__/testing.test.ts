import { createTestBus } from '../testing';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: void;
};

describe('createTestBus - emitted()', () => {
  it('returns an empty array when no events have been emitted', () => {
    const bus = createTestBus<TestEvents>();

    expect(bus.emitted('count')).toEqual([]);

    bus.dispose();
  });

  it('records payloads in emission order', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);

    expect(bus.emitted('count')).toEqual([1, 2, 3]);

    bus.dispose();
  });

  it('records payloads independently per event', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 10);
    bus.emit('greet', { name: 'Alice' });
    bus.emit('count', 20);

    expect(bus.emitted('count')).toEqual([10, 20]);
    expect(bus.emitted('greet')).toEqual([{ name: 'Alice' }]);

    bus.dispose();
  });

  it('records void event emissions', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('toggle');
    bus.emit('toggle');

    expect(bus.emitted('toggle')).toHaveLength(2);

    bus.dispose();
  });

  it('returns a snapshot — mutating the returned array does not affect internal records', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);

    const snapshot = bus.emitted('count');

    snapshot.push(99);

    expect(bus.emitted('count')).toEqual([1]);

    bus.dispose();
  });
});

describe('createTestBus - emittedCount()', () => {
  it('returns 0 when no events have been emitted', () => {
    const bus = createTestBus<TestEvents>();

    expect(bus.emittedCount('count')).toBe(0);

    bus.dispose();
  });

  it('returns the number of times an event was emitted', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus.emit('count', 2);

    expect(bus.emittedCount('count')).toBe(2);

    bus.dispose();
  });

  it('counts independently per event', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus.emit('greet', { name: 'Bob' });
    bus.emit('count', 2);

    expect(bus.emittedCount('count')).toBe(2);
    expect(bus.emittedCount('greet')).toBe(1);
    expect(bus.emittedCount('toggle')).toBe(0);

    bus.dispose();
  });
});

describe('createTestBus - reset()', () => {
  it('clears all emitted records', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus.emit('greet', { name: 'Alice' });
    bus.reset();

    expect(bus.emitted('count')).toEqual([]);
    expect(bus.emitted('greet')).toEqual([]);

    bus.dispose();
  });

  it('does not affect active subscriptions', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.emit('count', 1);
    bus.reset();
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(bus.emitted('count')).toEqual([2]);

    bus.dispose();
  });
});

describe('createTestBus - emit() passthrough', () => {
  it('still delivers payloads to listeners when emit() is called', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.emit('count', 42);

    expect(listener).toHaveBeenCalledWith(42);

    bus.dispose();
  });

  it('returns the listener count from the underlying bus', () => {
    const bus = createTestBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(bus.emit('count', 1)).toBe(2);

    bus.dispose();
  });
});

describe('createTestBus - Symbol.dispose', () => {
  it('[Symbol.dispose] disposes the bus', () => {
    const bus = createTestBus<TestEvents>();

    bus[Symbol.dispose]();

    expect(bus.disposed).toBe(true);
  });

  it('[Symbol.dispose] clears emitted records', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus[Symbol.dispose]();

    expect(bus.emitted('count')).toEqual([]);
  });
});

describe('createTestBus - dispose()', () => {
  it('clears all records on dispose', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus.dispose();

    expect(bus.emitted('count')).toEqual([]);
  });

  it('bus is disposed after dispose()', () => {
    const bus = createTestBus<TestEvents>();

    bus.dispose();

    expect(bus.disposed).toBe(true);
  });

  it('records no more events after dispose', () => {
    const bus = createTestBus<TestEvents>();

    bus.dispose();
    bus.emit('count', 1);

    expect(bus.emitted('count')).toEqual([]);
  });
});

describe('createTestBus - validatePayload interaction', () => {
  it('does not record payload when validatePayload throws without onError', () => {
    const bus = createTestBus<TestEvents>({
      validatePayload: () => {
        throw new TypeError('rejected');
      },
    });

    expect(() => bus.emit('count', 1)).toThrow(TypeError);
    expect(bus.emitted('count')).toEqual([]);

    bus.dispose();
  });

  it('does not record payload when validatePayload rejects, even when onError swallows the error', () => {
    const onError = vi.fn();
    const bus = createTestBus<TestEvents>({
      onError,
      validatePayload: () => {
        throw new TypeError('rejected');
      },
    });

    bus.emit('count', 1);

    expect(onError).toHaveBeenCalledOnce();
    expect(bus.emitted('count')).toEqual([]);

    bus.dispose();
  });

  it('records payload normally when validatePayload passes', () => {
    const bus = createTestBus<TestEvents>({
      validatePayload: (event, payload) => {
        if (event === 'count' && typeof payload !== 'number') throw new TypeError('bad');
      },
    });

    bus.emit('count', 42);

    expect(bus.emitted('count')).toEqual([42]);

    bus.dispose();
  });
});

describe('createTestBus - allEmitted()', () => {
  it('returns empty object when nothing has been emitted', () => {
    const bus = createTestBus<TestEvents>();

    expect(bus.allEmitted()).toEqual({});

    bus.dispose();
  });

  it('returns snapshot of all recorded events keyed by event name', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('greet', { name: 'Alice' });

    expect(bus.allEmitted()).toEqual({
      count: [1, 2],
      greet: [{ name: 'Alice' }],
    });

    bus.dispose();
  });

  it('snapshot is independent of internal records (copy not reference)', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 10);

    const snap = bus.allEmitted();

    bus.emit('count', 20);

    expect(snap.count).toEqual([10]);

    bus.dispose();
  });

  it('returns empty object after reset()', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 5);
    bus.reset();

    expect(bus.allEmitted()).toEqual({});

    bus.dispose();
  });
});

describe('createTestBus - on() SubscribeOptions forwarding', () => {
  it('{ once: true } — listener fires once then auto-removes', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener, { once: true });
    bus.emit('count', 1);
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);

    bus.dispose();
  });

  it('{ signal } — listener auto-removes when signal aborts', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();
    const ctrl = new AbortController();

    bus.on('count', listener, { signal: ctrl.signal });
    bus.emit('count', 1);
    ctrl.abort();
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);

    bus.dispose();
  });
});

describe('createTestBus - removeAllListeners()', () => {
  it('removes all on() listeners for the given event', () => {
    const bus = createTestBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();

    bus.on('count', a);
    bus.on('count', b);
    bus.removeAllListeners('count');
    bus.emit('count', 1);

    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();

    bus.dispose();
  });

  it('does not affect listeners on other events', () => {
    const bus = createTestBus<TestEvents>();
    const countListener = vi.fn();
    const greetListener = vi.fn();

    bus.on('count', countListener);
    bus.on('greet', greetListener);
    bus.removeAllListeners('count');
    bus.emit('count', 1);
    bus.emit('greet', { name: 'Alice' });

    expect(countListener).not.toHaveBeenCalled();
    expect(greetListener).toHaveBeenCalledOnce();

    bus.dispose();
  });

  it('is a no-op when no listeners are registered for the event', () => {
    const bus = createTestBus<TestEvents>();

    expect(() => bus.removeAllListeners('count')).not.toThrow();

    bus.dispose();
  });

  it('preserves emitted records after removing listeners', () => {
    const bus = createTestBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.emit('count', 42);
    bus.removeAllListeners('count');

    expect(bus.emitted('count')).toEqual([42]);

    bus.dispose();
  });
});

describe('createTestBus - Bus API passthrough', () => {
  it('supports on/off via returned unsubscribe', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();

    const unsub = bus.on('count', listener);

    bus.emit('count', 1);
    unsub();
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);

    bus.dispose();
  });

  it('supports wait()', async () => {
    const bus = createTestBus<TestEvents>();
    const pending = bus.wait('count');

    bus.emit('count', 99);

    await expect(pending).resolves.toBe(99);

    bus.dispose();
  });

  it('supports BusOptions pass-through (e.g. onError)', () => {
    const onError = vi.fn();
    const bus = createTestBus<TestEvents>({ onError });
    const listener = vi.fn(() => {
      throw new Error('boom');
    });

    bus.on('count', listener);
    bus.emit('count', 1);

    expect(onError).toHaveBeenCalledOnce();

    bus.dispose();
  });
});
