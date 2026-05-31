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

  it('forwards onDispatch hook while still capturing current values', () => {
    const onDispatch = vi.fn();
    const bus = createBehaviorBus<TestEvents>({ count: 0 }, { onDispatch });

    bus.emit('count', 5);

    expect(onDispatch).toHaveBeenCalledWith('count', 5);
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

// F4: replay window
describe('createBehaviorBus - replay window (options.replay)', () => {
  it('replay: 2 replays the last two values to new subscribers', () => {
    const bus = createBehaviorBus<TestEvents>({}, { replay: 2 });
    const listener = vi.fn();

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3); // drops 1, buffer is [2, 3]

    bus.on('count', listener);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, 2);
    expect(listener).toHaveBeenNthCalledWith(2, 3);

    bus.dispose();
  });

  it('replay: 3 replays up to three values in order', () => {
    const bus = createBehaviorBus<TestEvents>({}, { replay: 3 });
    const listener = vi.fn();

    bus.emit('count', 10);
    bus.emit('count', 20);

    bus.on('count', listener);

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenNthCalledWith(1, 10);
    expect(listener).toHaveBeenNthCalledWith(2, 20);

    bus.dispose();
  });

  it('once() with replay > 1 fires only the latest value', () => {
    const bus = createBehaviorBus<TestEvents>({}, { replay: 3 });
    const listener = vi.fn();

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);

    bus.once('count', listener);

    // once() fires exactly once with the latest value only
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(3);

    bus.dispose();
  });

  it('current() always returns the latest value regardless of replay window', () => {
    const bus = createBehaviorBus<TestEvents>({}, { replay: 3 });

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);

    expect(bus.current('count')).toBe(3);

    bus.dispose();
  });

  it('new subscriber after replay receives future emits normally', () => {
    const bus = createBehaviorBus<TestEvents>({}, { replay: 2 });
    const listener = vi.fn();

    bus.emit('count', 1);
    bus.emit('count', 2);

    bus.on('count', listener);

    // 2 replayed + 1 future
    bus.emit('count', 3);

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenNthCalledWith(3, 3);

    bus.dispose();
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

  it('on() with replay window: error on first replayed value forwarded, remaining values still replayed', () => {
    const onError = vi.fn();
    const bus = createBehaviorBus<TestEvents>({}, { onError, replay: 3 });

    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);

    const received: number[] = [];
    let callCount = 0;

    bus.on('count', (n) => {
      callCount++;

      if (callCount === 1) throw new Error('first replay boom');

      received.push(n);
    });

    // First replayed value (1) threw — forwarded to onError. Values 2 and 3 still replayed.
    expect(onError).toHaveBeenCalledOnce();
    expect(received).toEqual([2, 3]);

    bus.dispose();
  });
});
