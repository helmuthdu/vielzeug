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
