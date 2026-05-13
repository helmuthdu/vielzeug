import { createTestBus } from './testing';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: void;
};

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
});

/** -------------------- TestBus passthrough methods -------------------- **/

describe('removeAllListeners', () => {
  it('removes all listeners; records are preserved', () => {
    const bus = createTestBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.emit('count', 1);
    bus.removeAllListeners('count');
    bus.emit('count', 2); // no listeners, but emission is still recorded
    expect(bus.listenerCount('count')).toBe(0);
    expect(bus.emitted('count')).toEqual([1, 2]);
  });
});

describe('eventNames', () => {
  it('reflects active listeners on the test bus', () => {
    const bus = createTestBus<TestEvents>();

    expect(bus.eventNames()).toEqual([]);
    bus.on('greet', vi.fn());
    expect(bus.eventNames()).toContain('greet');
  });
});

describe('waitAny', () => {
  it('resolves and records the winning event payload', async () => {
    const bus = createTestBus<TestEvents>();
    const p = bus.waitAny(['count', 'greet']);

    bus.emit('count', 7);

    const result = await p;

    expect(result.event).toBe('count');
    expect(result.payload).toBe(7);
    expect(bus.emitted('count')).toEqual([7]);
  });
});
