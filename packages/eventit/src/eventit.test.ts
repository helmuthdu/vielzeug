import { createEventBus, createTestEventBus } from './eventit';

type TestEvents = {
  greet: { name: string };
  count: number;
  toggle: undefined;
};

/** -------------------- createEventBus -------------------- **/

describe('createEventBus', () => {
  it('returns an EventBus instance', () => {
    const bus = createEventBus<TestEvents>();
    expect(bus).toBeDefined();
    expect(typeof bus.on).toBe('function');
    expect(typeof bus.emit).toBe('function');
  });
});

/** -------------------- on / off -------------------- **/

describe('on', () => {
  it('calls the listener when the event is emitted', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('greet', listener);
    bus.emit('greet', { name: 'Alice' });
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('supports multiple listeners on the same event', () => {
    const bus = createEventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('count', a);
    bus.on('count', b);
    bus.emit('count', 42);
    expect(a).toHaveBeenCalledWith(42);
    expect(b).toHaveBeenCalledWith(42);
  });

  it('does not cross-fire different events', () => {
    const bus = createEventBus<TestEvents>();
    const greetListener = vi.fn();
    const countListener = vi.fn();
    bus.on('greet', greetListener);
    bus.on('count', countListener);
    bus.emit('count', 1);
    expect(greetListener).not.toHaveBeenCalled();
    expect(countListener).toHaveBeenCalledWith(1);
  });

  it('returns an unsubscribe function', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    const unsub = bus.on('count', listener);
    unsub();
    bus.emit('count', 99);
    expect(listener).not.toHaveBeenCalled();
  });

  it('prints a warning when maxListeners is exceeded', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bus = createEventBus<TestEvents>({ maxListeners: 2 });
    bus.on('count', vi.fn());
    bus.on('count', vi.fn());
    bus.on('count', vi.fn()); // should trigger warning
    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('count');
    warnSpy.mockRestore();
  });
});

describe('off', () => {
  it('removes a specific listener', () => {
    const bus = createEventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('count', a);
    bus.on('count', b);
    bus.off('count', a);
    bus.emit('count', 1);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledWith(1);
  });

  it('removes all listeners for an event when no listener is provided', () => {
    const bus = createEventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('count', a);
    bus.on('count', b);
    bus.off('count');
    bus.emit('count', 5);
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it('is a no-op for an unknown event', () => {
    const bus = createEventBus<TestEvents>();
    expect(() => bus.off('count')).not.toThrow();
  });

  it('is a no-op when the listener was not registered', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    expect(() => bus.off('count', listener)).not.toThrow();
  });
});

/** -------------------- once -------------------- **/

describe('once', () => {
  it('fires the listener only on the first emit', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.once('count', listener);
    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('count', 3);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);
  });

  it('can be unsubscribed before it fires', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    const unsub = bus.once('count', listener);
    unsub();
    bus.emit('count', 42);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not affect other listeners on the same event', () => {
    const bus = createEventBus<TestEvents>();
    const once = vi.fn();
    const permanent = vi.fn();
    bus.once('count', once);
    bus.on('count', permanent);
    bus.emit('count', 1);
    bus.emit('count', 2);
    expect(once).toHaveBeenCalledOnce();
    expect(permanent).toHaveBeenCalledTimes(2);
  });
});

/** -------------------- emit -------------------- **/

describe('emit', () => {
  it('is a no-op when no listeners are registered', () => {
    const bus = createEventBus<TestEvents>();
    expect(() => bus.emit('count', 1)).not.toThrow();
  });

  it('passes the payload to the listener', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('greet', listener);
    bus.emit('greet', { name: 'Bob' });
    expect(listener).toHaveBeenCalledWith({ name: 'Bob' });
  });

  it('supports void-payload events', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('toggle', listener);
    bus.emit('toggle');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('re-throws listener errors by default', () => {
    const bus = createEventBus<TestEvents>();
    bus.on('count', () => {
      throw new Error('boom');
    });
    expect(() => bus.emit('count', 1)).toThrow('boom');
  });

  it('calls onError instead of throwing when configured', () => {
    const onError = vi.fn();
    const bus = createEventBus<TestEvents>({ onError });
    bus.on('count', () => {
      throw new Error('boom');
    });
    expect(() => bus.emit('count', 1)).not.toThrow();
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][1]).toBe('count');
  });

  it('still calls remaining listeners after one throws (with onError)', () => {
    const onError = vi.fn();
    const bus = createEventBus<TestEvents>({ onError });
    const second = vi.fn();
    bus.on('count', () => {
      throw new Error('boom');
    });
    bus.on('count', second);
    bus.emit('count', 1);
    expect(second).toHaveBeenCalledWith(1);
  });

  it('calls listeners in registration order', () => {
    const bus = createEventBus<TestEvents>();
    const order: number[] = [];
    bus.on('count', () => order.push(1));
    bus.on('count', () => order.push(2));
    bus.on('count', () => order.push(3));
    bus.emit('count', 0);
    expect(order).toEqual([1, 2, 3]);
  });
});

/** -------------------- clear -------------------- **/

describe('clear', () => {
  it('removes all listeners for a specific event', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('count', listener);
    bus.clear('count');
    bus.emit('count', 1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not affect other events when clearing a specific one', () => {
    const bus = createEventBus<TestEvents>();
    const countListener = vi.fn();
    const greetListener = vi.fn();
    bus.on('count', countListener);
    bus.on('greet', greetListener);
    bus.clear('count');
    bus.emit('greet', { name: 'Alice' });
    expect(countListener).not.toHaveBeenCalled();
    expect(greetListener).toHaveBeenCalledOnce();
  });

  it('removes all listeners for all events when called with no argument', () => {
    const bus = createEventBus<TestEvents>();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('count', a);
    bus.on('greet', b);
    bus.clear();
    bus.emit('count', 1);
    bus.emit('greet', { name: 'Alice' });
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });
});

/** -------------------- has -------------------- **/

describe('has', () => {
  it('returns false for an event with no listeners', () => {
    const bus = createEventBus<TestEvents>();
    expect(bus.has('count')).toBe(false);
  });

  it('returns true after a listener is added', () => {
    const bus = createEventBus<TestEvents>();
    bus.on('count', vi.fn());
    expect(bus.has('count')).toBe(true);
  });

  it('returns false after all listeners are removed', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('count', listener);
    bus.off('count', listener);
    expect(bus.has('count')).toBe(false);
  });
});

/** -------------------- listenerCount -------------------- **/

describe('listenerCount', () => {
  it('returns 0 for an event with no listeners', () => {
    const bus = createEventBus<TestEvents>();
    expect(bus.listenerCount('count')).toBe(0);
  });

  it('returns the correct count after adding listeners', () => {
    const bus = createEventBus<TestEvents>();
    bus.on('count', vi.fn());
    bus.on('count', vi.fn());
    expect(bus.listenerCount('count')).toBe(2);
  });

  it('decrements after a listener is removed', () => {
    const bus = createEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('count', listener);
    bus.on('count', vi.fn());
    bus.off('count', listener);
    expect(bus.listenerCount('count')).toBe(1);
  });
});

/** -------------------- createTestEventBus -------------------- **/

describe('createTestEventBus', () => {
  it('records emitted payloads', () => {
    const { bus, emitted } = createTestEventBus<TestEvents>();
    bus.emit('count', 1);
    bus.emit('count', 2);
    expect(emitted.get('count')).toEqual([1, 2]);
  });

  it('still dispatches to listeners', () => {
    const { bus } = createTestEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('greet', listener);
    bus.emit('greet', { name: 'Alice' });
    expect(listener).toHaveBeenCalledWith({ name: 'Alice' });
  });

  it('records payloads for multiple different events', () => {
    const { bus, emitted } = createTestEventBus<TestEvents>();
    bus.emit('count', 10);
    bus.emit('greet', { name: 'Bob' });
    expect(emitted.get('count')).toEqual([10]);
    expect(emitted.get('greet')).toEqual([{ name: 'Bob' }]);
  });

  it('dispose clears all listeners and emitted records', () => {
    const { bus, emitted, dispose } = createTestEventBus<TestEvents>();
    const listener = vi.fn();
    bus.on('count', listener);
    bus.emit('count', 1);
    dispose();
    bus.emit('count', 2);
    expect(listener).toHaveBeenCalledOnce(); // not called after dispose
    expect(emitted.size).toBe(0);
  });
});
