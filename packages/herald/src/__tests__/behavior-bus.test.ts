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
