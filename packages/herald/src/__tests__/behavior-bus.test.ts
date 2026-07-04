import { createBehaviorBus } from '../behavior-bus';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: void;
};

describe('createBehaviorBus - initial values', () => {
  it('replays the initial value to the first subscriber', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 0 });
    const listener = vi.fn();

    bus.on('count', listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(0);
  });

  it('replays different initial values independently per event', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 5, greet: { name: 'Alice' } });
    const onCount = vi.fn();
    const onGreet = vi.fn();

    bus.on('count', onCount);
    bus.on('greet', onGreet);

    expect(onCount).toHaveBeenCalledWith(5);
    expect(onGreet).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('does not replay when no initial value is provided for that event', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 1 });
    const greetListener = vi.fn();

    bus.on('greet', greetListener);

    expect(greetListener).not.toHaveBeenCalled();
  });
});

describe('createBehaviorBus - latest value replay', () => {
  it('replays the latest emitted value, not the initial value', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 0 });

    bus.emit('count', 42);

    const listener = vi.fn();

    bus.on('count', listener);

    expect(listener).toHaveBeenCalledWith(42);
  });

  it('new subscribers receive the latest value after multiple emits', () => {
    const bus = createBehaviorBus<TestEvents>();

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);

    const listener = vi.fn();

    bus.on('count', listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(3);
  });

  it('subsequent emits still reach replayed subscribers', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 0 });
    const listener = vi.fn();

    bus.on('count', listener);

    expect(listener).toHaveBeenCalledWith(0);

    bus.emit('count', 1);
    bus.emit('count', 2);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenNthCalledWith(2, 1);
    expect(listener).toHaveBeenNthCalledWith(3, 2);
  });
});

describe('createBehaviorBus - once()', () => {
  it('once() fires immediately with current value and does not subscribe for future emits', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 5 });
    const listener = vi.fn();

    bus.once('count', listener);

    expect(listener).toHaveBeenCalledWith(5);

    bus.emit('count', 10);

    expect(listener).toHaveBeenCalledOnce(); // no second call
  });

  it('on() with { once: true } also fires immediately and does not subscribe', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 7 });
    const listener = vi.fn();

    bus.on('count', listener, { once: true });

    expect(listener).toHaveBeenCalledWith(7);

    bus.emit('count', 8);

    expect(listener).toHaveBeenCalledOnce();
  });

  it('once() without a current value subscribes normally for next emit', () => {
    const bus = createBehaviorBus<TestEvents>();
    const listener = vi.fn();

    bus.once('count', listener);

    expect(listener).not.toHaveBeenCalled();

    bus.emit('count', 99);

    expect(listener).toHaveBeenCalledWith(99);

    bus.emit('count', 100);

    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('createBehaviorBus - current()', () => {
  it('returns undefined before any emit and no initial value', () => {
    const bus = createBehaviorBus<TestEvents>();

    expect(bus.current('count')).toBeUndefined();
  });

  it('returns the initial value before any emit', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 10 });

    expect(bus.current('count')).toBe(10);
  });

  it('returns the latest emitted value', () => {
    const bus = createBehaviorBus<TestEvents>();

    bus.emit('count', 1);
    bus.emit('count', 2);

    expect(bus.current('count')).toBe(2);
  });

  it('tracks values for each event independently', () => {
    const bus = createBehaviorBus<TestEvents>();

    bus.emit('count', 42);
    bus.emit('greet', { name: 'Bob' });

    expect(bus.current('count')).toBe(42);
    expect(bus.current('greet')).toEqual({ name: 'Bob' });
    expect(bus.current('toggle')).toBeUndefined();
  });
});

describe('createBehaviorBus - signal and disposal', () => {
  it('does not replay when the caller signal is already aborted', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 5 });
    const listener = vi.fn();
    const controller = new AbortController();

    controller.abort();
    bus.on('count', listener, { signal: controller.signal });

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not replay on a disposed bus', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 5 });
    const listener = vi.fn();

    bus.dispose();
    bus.on('count', listener);

    expect(listener).not.toHaveBeenCalled();
  });

  it('clears current values on dispose', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 1 });

    bus.dispose();

    expect(bus.current('count')).toBeUndefined();
  });

  it('onAny fires while current() still reflects the emitted value', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 0 });
    const observer = vi.fn();

    bus.onAny(observer);
    bus.emit('count', 5);

    expect(observer).toHaveBeenCalledWith('count', 5);
    expect(bus.current('count')).toBe(5);
  });
});

describe('createBehaviorBus - bus API passthrough', () => {
  it('inherits dispose, emit, wait, and other Bus methods', async () => {
    const bus = createBehaviorBus<TestEvents>();

    expect(bus.disposed).toBe(false);

    const pending = bus.wait('count');

    bus.emit('count', 7);

    await expect(pending).resolves.toBe(7);

    bus.dispose();

    expect(bus.disposed).toBe(true);
  });
});

describe('createBehaviorBus - replay error handling', () => {
  it('listener throws during replay: error propagates when no onError is configured', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 1 });

    expect(() => {
      bus.on('count', () => {
        throw new Error('replay boom');
      });
    }).toThrow('replay boom');

    bus.dispose();
  });

  it('listener throws during replay: error forwarded to onError when configured', () => {
    const onError = vi.fn();
    const bus = createBehaviorBus<TestEvents>({ count: 1 }, { onError });

    expect(() => {
      bus.on('count', () => {
        throw new Error('replay boom');
      });
    }).not.toThrow();

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        event: 'count',
        payload: 1,
        timestamp: expect.any(Number),
      }),
    );

    bus.dispose();
  });
});

describe('createBehaviorBus - BusOptions passthrough (logger / maxListeners)', () => {
  it('routes debug output through logger.debug', () => {
    const logs: string[] = [];
    const bus = createBehaviorBus<TestEvents>({}, { logger: { debug: (m) => logs.push(m) } });

    bus.emit('count', 1);

    expect(logs.some((l) => l.includes('[herald:emit]'))).toBe(true);

    bus.dispose();
  });

  it('warns when maxListeners is exceeded', () => {
    const warns: string[] = [];
    const bus = createBehaviorBus<TestEvents>({}, { logger: { warn: (m) => warns.push(m) }, maxListeners: 1 });

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain('on("count")');

    bus.dispose();
  });

  it('bus name appears in log messages', () => {
    const logs: string[] = [];
    const bus = createBehaviorBus<TestEvents>({}, { logger: { debug: (m) => logs.push(m) }, name: 'settings' });

    bus.emit('count', 5);

    expect(logs.some((l) => l.includes('(settings)'))).toBe(true);

    bus.dispose();
  });
});

describe('createBehaviorBus - reset()', () => {
  it('reset(event) clears the buffer for that event — new subscribers get no replay', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 42 });

    bus.reset('count');

    const listener = vi.fn();

    bus.on('count', listener);

    expect(listener).not.toHaveBeenCalled();

    bus.dispose();
  });

  it('reset(event) does not affect other events', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 1, greet: { name: 'Alice' } });

    bus.reset('count');

    const onCount = vi.fn();
    const onGreet = vi.fn();

    bus.on('count', onCount);
    bus.on('greet', onGreet);

    expect(onCount).not.toHaveBeenCalled();
    expect(onGreet).toHaveBeenCalledWith({ name: 'Alice' });

    bus.dispose();
  });

  it('reset() with no argument clears all buffers', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 1, greet: { name: 'Bob' } });

    bus.reset();

    const onCount = vi.fn();
    const onGreet = vi.fn();

    bus.on('count', onCount);
    bus.on('greet', onGreet);

    expect(onCount).not.toHaveBeenCalled();
    expect(onGreet).not.toHaveBeenCalled();

    bus.dispose();
  });

  it('reset() clears current() — returns undefined after reset', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 99 });

    expect(bus.current('count')).toBe(99);
    bus.reset('count');
    expect(bus.current('count')).toBeUndefined();

    bus.dispose();
  });

  it('reset() on an event with no buffer is a safe no-op', () => {
    const bus = createBehaviorBus<TestEvents>();

    expect(() => bus.reset('count')).not.toThrow();

    bus.dispose();
  });

  it('emitting after reset() updates the buffer again', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 1 });

    bus.reset('count');
    bus.emit('count', 7);

    const listener = vi.fn();

    bus.on('count', listener);

    expect(listener).toHaveBeenCalledWith(7);

    bus.dispose();
  });
});

describe('createBehaviorBus - middleware passthrough', () => {
  it('middleware runs before listeners', () => {
    const order: string[] = [];
    const bus = createBehaviorBus<TestEvents>(
      {},
      {
        middleware: [
          (_event, _payload, next) => {
            order.push('middleware');
            next();
          },
        ],
      },
    );

    bus.on('count', () => order.push('listener'));
    bus.emit('count', 1);

    expect(order).toEqual(['middleware', 'listener']);

    bus.dispose();
  });

  it('middleware blocking dispatch does not update the replay buffer', () => {
    const bus = createBehaviorBus<TestEvents>(
      { count: 0 },
      {
        middleware: [
          (_event, _payload, _next) => {
            // deliberately not calling next() — blocks dispatch
          },
        ],
      },
    );

    bus.emit('count', 99);

    // Buffer must still hold the initial value since middleware blocked
    expect(bus.current('count')).toBe(0);

    bus.dispose();
  });
});

describe('createBehaviorBus - validatePayload interaction', () => {
  it('does not update buffer when validatePayload throws (no onError)', () => {
    const bus = createBehaviorBus<TestEvents>(
      { count: 1 },
      {
        validatePayload: (_event, payload) => {
          if (typeof payload === 'number' && payload < 0) throw new RangeError('negative not allowed');
        },
      },
    );

    expect(() => bus.emit('count', -5)).toThrow(RangeError);

    // Buffer must still hold the initial value, not the rejected -5
    expect(bus.current('count')).toBe(1);

    const listener = vi.fn();

    bus.on('count', listener);

    expect(listener).toHaveBeenCalledWith(1);

    bus.dispose();
  });

  it('updates buffer when validatePayload passes', () => {
    const bus = createBehaviorBus<TestEvents>(
      {},
      {
        validatePayload: (_event, payload) => {
          if (typeof payload === 'number' && payload < 0) throw new RangeError('negative not allowed');
        },
      },
    );

    bus.emit('count', 10);

    expect(bus.current('count')).toBe(10);

    bus.dispose();
  });

  it('does not update buffer when validatePayload throws and onError swallows the error', () => {
    const errors: unknown[] = [];
    const bus = createBehaviorBus<TestEvents>(
      { count: 1 },
      {
        onError: ({ err }) => errors.push(err),
        validatePayload: (_event, payload) => {
          if (typeof payload === 'number' && payload < 0) throw new RangeError('negative not allowed');
        },
      },
    );

    bus.emit('count', -99);

    expect(errors).toHaveLength(1);
    // Buffer must still hold the initial value, not the rejected -99
    expect(bus.current('count')).toBe(1);

    bus.dispose();
  });
});

describe('createBehaviorBus - once() with buffered value', () => {
  it('once() fires immediately with buffered value and returns noop', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 7 });
    const listener = vi.fn();

    const unsub = bus.once('count', listener);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(7);
    expect(() => unsub()).not.toThrow();

    bus.dispose();
  });

  it('once() via on(once:true) does not register for future emits when buffer exists', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 1 });
    const listener = vi.fn();

    bus.on('count', listener, { once: true });
    listener.mockClear();

    bus.emit('count', 2);

    expect(listener).not.toHaveBeenCalled();

    bus.dispose();
  });

  it('once() registers for future emit when no buffer exists', () => {
    const bus = createBehaviorBus<TestEvents>();
    const listener = vi.fn();

    bus.once('count', listener);
    bus.emit('count', 42);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(42);

    bus.dispose();
  });
});

describe('createBehaviorBus - snapshot()', () => {
  it('returns all currently buffered event values', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 0, greet: { name: 'Alice' } });

    expect(bus.snapshot()).toEqual({ count: 0, greet: { name: 'Alice' } });

    bus.dispose();
  });

  it('reflects the latest value after emit', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 0 });

    bus.emit('count', 99);

    expect(bus.snapshot()).toEqual({ count: 99 });

    bus.dispose();
  });

  it('omits events that have no buffered value', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 5 });

    const snap = bus.snapshot();

    expect('greet' in snap).toBe(false);
    expect('toggle' in snap).toBe(false);
    expect(snap.count).toBe(5);

    bus.dispose();
  });

  it('returns empty object when no values are buffered', () => {
    const bus = createBehaviorBus<TestEvents>();

    expect(bus.snapshot()).toEqual({});

    bus.dispose();
  });

  it('returns empty object after reset()', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 1 });

    bus.reset();

    expect(bus.snapshot()).toEqual({});

    bus.dispose();
  });

  it('does not let a "__proto__"/"constructor"/"prototype" event name hijack the snapshot object', () => {
    // Regression: bracket-assigning `result['__proto__'] = value` on a plain object literal
    // invokes Object.prototype's __proto__ accessor and reassigns the object's own prototype
    // instead of setting an own property — a real prototype-hijack risk when event names can be
    // dynamically/externally determined.
    const bus = createBehaviorBus<Record<string, unknown>>();
    const malicious = { polluted: true };

    bus.emit('__proto__', malicious);
    bus.emit('constructor', malicious);
    bus.emit('prototype', malicious);
    bus.emit('count', 1);

    const snap = bus.snapshot();

    expect(Object.getPrototypeOf(snap)).toBe(Object.prototype);
    expect((snap as { polluted?: boolean }).polluted).toBeUndefined();
    expect(Object.keys(snap)).toEqual(['count']);

    bus.dispose();
  });
});

describe('createBehaviorBus - aborted signal', () => {
  it('returns noop immediately when signal is already aborted — no replay', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 42 });
    const listener = vi.fn();
    const signal = AbortSignal.abort('cancelled');

    const unsub = bus.on('count', listener, { signal });

    expect(listener).not.toHaveBeenCalled();
    expect(unsub).toBeTypeOf('function');

    bus.dispose();
  });

  it('returns noop immediately when signal is already aborted — once variant', () => {
    const bus = createBehaviorBus<TestEvents>({ count: 7 });
    const listener = vi.fn();
    const signal = AbortSignal.abort('cancelled');

    bus.once('count', listener, { signal });

    expect(listener).not.toHaveBeenCalled();

    bus.dispose();
  });
});
