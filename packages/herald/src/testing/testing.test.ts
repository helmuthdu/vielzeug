import { pipeEvents } from '..';
import { createTestBus } from './testing';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: void;
};

describe('createTestBus - recording', () => {
  it('records payloads per event and starts empty', () => {
    const bus = createTestBus<TestEvents>();

    expect(bus.emitted('count')).toEqual([]);
    bus.emit('count', 1);
    bus.emit('count', 2);
    bus.emit('greet', { name: 'Alice' });
    expect(bus.emitted('count')).toEqual([1, 2]);
    expect(bus.emitted('greet')).toEqual([{ name: 'Alice' }]);
  });

  it('returns snapshots from emitted() without exposing internal state', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);

    const snap = bus.emitted('count');

    snap.push(99 as never);
    bus.emit('count', 2);

    expect(bus.emitted('count')).toEqual([1, 2]);
  });

  it('records emits even when no listeners are registered', () => {
    const bus = createTestBus<TestEvents>();

    bus.emit('count', 1);
    bus.emit('count', 2);

    expect(bus.emitted('count')).toEqual([1, 2]);
  });
});

describe('createTestBus - bus behavior passthrough', () => {
  it('dispatches to listeners like a normal bus', () => {
    const bus = createTestBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.emit('count', 42);
    expect(listener).toHaveBeenCalledWith(42);
  });

  it('calls a middleware hook with event and payload on each emit', () => {
    const onDispatch = vi.fn();
    const bus = createTestBus<TestEvents>({
      middleware: [
        (event, payload, next) => {
          onDispatch(event, payload);
          next();
        },
      ],
    });

    bus.emit('count', 42);
    bus.emit('toggle');

    expect(onDispatch.mock.calls).toEqual([
      ['count', 42],
      ['toggle', undefined],
    ]);
  });

  it('supports waitAny and preserves recording for winning event', async () => {
    const bus = createTestBus<TestEvents>();
    const pending = bus.waitAny(['count', 'greet']);

    bus.emit('count', 7);

    await expect(pending).resolves.toEqual({ event: 'count', payload: 7 });
    expect(bus.emitted('count')).toEqual([7]);
  });
});

describe('createTestBus - lifecycle helpers', () => {
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

  it('dispose clears records and disposes underlying bus', () => {
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

  it('removeAllListeners removes listeners but keeps historical records', () => {
    const bus = createTestBus<TestEvents>();

    bus.on('count', vi.fn());
    bus.emit('count', 1);
    bus.removeAllListeners('count');
    bus.emit('count', 2); // no listeners, but emission is still recorded
    expect(bus.listenerCount('count')).toBe(0);
    expect(bus.emitted('count')).toEqual([1, 2]);
  });

  it('eventNames reflects active listener events', () => {
    const bus = createTestBus<TestEvents>();

    expect(bus.eventNames()).toEqual([]);
    bus.on('greet', vi.fn());
    expect(bus.eventNames()).toContain('greet');
  });

  it('onAny is delegated and receives all emitted events', () => {
    const bus = createTestBus<TestEvents>();
    const received: Array<{ event: string; payload: unknown }> = [];

    bus.onAny((event, payload) => received.push({ event, payload }));

    bus.emit('count', 7);
    bus.emit('toggle');

    expect(received).toEqual([
      { event: 'count', payload: 7 },
      { event: 'toggle', payload: undefined },
    ]);

    // emitted() still records correctly alongside onAny
    expect(bus.emitted('count')).toEqual([7]);
  });

  it('pipeEvents() forwards events to the target bus', () => {
    const source = createTestBus<TestEvents>();
    const target = createTestBus<TestEvents>();
    const listener = vi.fn();

    target.on('count', listener);
    pipeEvents(source, target, ['count']);

    source.emit('count', 42);

    expect(listener).toHaveBeenCalledWith(42);
    expect(source.emitted('count')).toEqual([42]);
    expect(target.emitted('count')).toEqual([42]);

    source.dispose();
    target.dispose();
  });
});
