import { createBehaviorBus, createBus } from '../index';
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

describe('pipeEvents - cross-bus type piping', () => {
  it('pipes shared events from a wider source type to a narrower target type', () => {
    type Source = { 'auth:login': { userId: string }; 'ui:click': string };
    type Target = { 'auth:login': { userId: string } };

    const source = createBus<Source>();
    const target = createBus<Target>();
    const listener = vi.fn();

    target.on('auth:login', listener);
    pipeEvents(source, target, ['auth:login']);

    source.emit('auth:login', { userId: '42' });

    expect(listener).toHaveBeenCalledWith({ userId: '42' });

    source.dispose();
    target.dispose();
  });

  it('does not require source and target to have identical event maps', () => {
    type Source = { internal: string; tick: number };
    type Target = { tick: number };

    const source = createBus<Source>();
    const target = createBus<Target>();
    const listener = vi.fn();

    target.on('tick', listener);
    pipeEvents(source, target, ['tick']);

    source.emit('tick', 99);

    expect(listener).toHaveBeenCalledWith(99);

    source.dispose();
    target.dispose();
  });
});

describe('pipeEvents - event remapping', () => {
  it('forwards events under a different name on the target bus', () => {
    type Source = { 'auth:login': { userId: string } };
    type Target = { 'user:authenticated': { userId: string } };

    const source = createBus<Source>();
    const target = createBus<Target>();
    const listener = vi.fn();

    target.on('user:authenticated', listener);
    pipeEvents(source, target, [{ from: 'auth:login', to: 'user:authenticated' }]);

    source.emit('auth:login', { userId: '42' });

    expect(listener).toHaveBeenCalledWith({ userId: '42' });

    source.dispose();
    target.dispose();
  });

  it('supports mixing same-name and renamed entries', () => {
    type Source = { 'auth:login': { userId: string }; 'auth:logout': void };
    type Target = { 'auth:login': { userId: string }; 'user:signed-out': void };

    const source = createBus<Source>();
    const target = createBus<Target>();
    const onLogin = vi.fn();
    const onSignedOut = vi.fn();

    target.on('auth:login', onLogin);
    target.on('user:signed-out', onSignedOut);

    pipeEvents(source, target, ['auth:login', { from: 'auth:logout', to: 'user:signed-out' }]);

    source.emit('auth:login', { userId: '1' });
    source.emit('auth:logout');

    expect(onLogin).toHaveBeenCalledWith({ userId: '1' });
    expect(onSignedOut).toHaveBeenCalledOnce();

    source.dispose();
    target.dispose();
  });

  it('renamed pipe tears down when target disposes', () => {
    type Source = { 'auth:login': { userId: string } };
    type Target = { 'user:authenticated': { userId: string } };

    const source = createBus<Source>();
    const target = createBus<Target>();
    const listener = vi.fn();

    target.on('user:authenticated', listener);
    pipeEvents(source, target, [{ from: 'auth:login', to: 'user:authenticated' }]);

    source.emit('auth:login', { userId: '1' });
    target.dispose();
    source.emit('auth:login', { userId: '2' });

    expect(listener).toHaveBeenCalledOnce();

    source.dispose();
  });
});

describe('pipeEvents - BehaviorBus as source', () => {
  it('forwards replayed value synchronously on pipe registration when source has current value', () => {
    type Source = { count: number };
    type Target = { count: number };

    const source = createBehaviorBus<Source>({ count: 42 });
    const target = createBus<Target>();
    const listener = vi.fn();

    target.on('count', listener);

    // pipeEvents subscribes via on() — BehaviorBus replays 42 synchronously to the pipe listener,
    // which forwards it to target. Listener receives the replayed value.
    pipeEvents(source, target, ['count']);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(42);

    listener.mockClear();

    // Future emits are forwarded normally.
    source.emit('count', 99);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(99);

    source.dispose();
    target.dispose();
  });

  it('no replay forwarded when BehaviorBus source has no initial value', () => {
    type Source = { count: number };
    type Target = { count: number };

    const source = createBehaviorBus<Source>();
    const target = createBus<Target>();
    const listener = vi.fn();

    target.on('count', listener);
    pipeEvents(source, target, ['count']);

    expect(listener).not.toHaveBeenCalled();

    source.emit('count', 7);

    expect(listener).toHaveBeenCalledWith(7);

    source.dispose();
    target.dispose();
  });
});

describe('pipeEvents - runtime guards', () => {
  it('throws RangeError when entries array is empty (bypassed type system)', () => {
    const source = createBus<Events>();
    const target = createBus<Events>();

    expect(() => pipeEvents(source, target, [] as any)).toThrow(RangeError);

    source.dispose();
    target.dispose();
  });
});
