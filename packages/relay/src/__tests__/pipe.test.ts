import { createBus } from '../index';
import { pipeEvents } from '../pipe';

type Events = {
  count: number;
  greet: { name: string };
  toggle: void;
};

describe('pipeEvents - basic forwarding', () => {
  it('forwards listed events from source to target', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();
    const listener = vi.fn();

    target.on('count', listener);
    pipeEvents(source, target, ['count']);

    source.emit('count', 42);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(42);

    source.dispose();
    target.dispose();
  });

  it('forwards multiple events independently', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();
    const onCount = vi.fn();
    const onGreet = vi.fn();

    target.on('count', onCount);
    target.on('greet', onGreet);
    pipeEvents(source, target, ['count', 'greet']);

    source.emit('count', 1);
    source.emit('greet', { name: 'Alice' });

    expect(onCount).toHaveBeenCalledWith(1);
    expect(onGreet).toHaveBeenCalledWith({ name: 'Alice' });

    source.dispose();
    target.dispose();
  });

  it('does not forward unlisted events', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();
    const listener = vi.fn();

    target.on('greet', listener);
    pipeEvents(source, target, ['count']); // only count is piped

    source.emit('greet', { name: 'Bob' });

    expect(listener).not.toHaveBeenCalled();

    source.dispose();
    target.dispose();
  });

  it('forwards void events', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();
    const listener = vi.fn();

    target.on('toggle', listener);
    pipeEvents(source, target, ['toggle']);

    source.emit('toggle');

    expect(listener).toHaveBeenCalledOnce();

    source.dispose();
    target.dispose();
  });
});

describe('pipeEvents - teardown', () => {
  it('returned unsub stops forwarding', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();
    const listener = vi.fn();

    target.on('count', listener);

    const unsub = pipeEvents(source, target, ['count']);

    source.emit('count', 1);
    unsub();
    source.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);

    source.dispose();
    target.dispose();
  });

  it('stops forwarding automatically when the target bus is disposed', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();
    const listener = vi.fn();

    target.on('count', listener);
    pipeEvents(source, target, ['count']);

    source.emit('count', 1);
    target.dispose(); // target disposed → pipe tears down
    source.emit('count', 2); // source still alive, but pipe is gone

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);

    source.dispose();
  });

  it('stops forwarding automatically when the source bus is disposed', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();
    const listener = vi.fn();

    target.on('count', listener);
    pipeEvents(source, target, ['count']);

    source.emit('count', 1);
    source.dispose(); // source disposed → all source subscriptions torn down
    // target.emit is never called after source disposal

    expect(listener).toHaveBeenCalledOnce();

    target.dispose();
  });

  it('stops forwarding when the provided signal aborts', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();
    const controller = new AbortController();
    const listener = vi.fn();

    target.on('count', listener);
    pipeEvents(source, target, ['count'], controller.signal);

    source.emit('count', 1);
    controller.abort();
    source.emit('count', 2);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(1);

    source.dispose();
    target.dispose();
  });

  it('calling the returned unsub after auto-teardown is safe', () => {
    // When the target bus disposes, the pipe auto-tears down via pipeSignal.
    // Calling the returned unsub a second time must be a safe no-op.
    const source = createBus<Events>();
    const target = createBus<Events>();
    const unsub = pipeEvents(source, target, ['count']);

    target.dispose(); // auto-tears down the pipe

    expect(() => unsub()).not.toThrow();

    source.dispose();
  });
});
