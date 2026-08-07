import { createBus } from '../bus';
import { pipeEvents } from '../pipe';
import { createTestBus } from '../testing';

describe('public type and middleware contracts', () => {
  it('accepts normal TypeScript interface event maps', () => {
    interface InterfaceEvents {
      count: number;
      ready: void;
    }

    const bus = createBus<InterfaceEvents>();
    const testBus = createTestBus<InterfaceEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.emit('count', 1);
    testBus.emit('ready');

    expect(listener).toHaveBeenCalledWith(1);
    expect(testBus.emittedCount('ready')).toBe(1);
  });

  it('releases composed signal listeners after manual unsubscribe', () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const bus = createBus<{ count: number }>();

    const stop = bus.on('count', () => {}, { signal: controller.signal });

    stop();

    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('releases composed signal listeners after waits and streams settle', async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const bus = createBus<{ count: number }>();

    const pending = bus.wait('count', { signal: controller.signal });

    bus.emit('count', 1);
    await expect(pending).resolves.toBe(1);

    await using stream = bus.events('count', { signal: controller.signal });
    await stream[Symbol.asyncDispose]();

    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('releases composed signal listeners after unpipe', () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    const source = createBus<{ count: number }>();
    const target = createBus<{ count: number }>();

    const stop = pipeEvents(source, target, ['count'], { signal: controller.signal });

    stop();

    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('does not let repeated next calls bypass a blocking middleware', () => {
    const listener = vi.fn();
    const bus = createBus<{ count: number }>({
      middleware: [
        (_event, _payload, next) => {
          next();
          next();
        },
        () => {},
      ],
    });

    bus.on('count', listener);

    expect(bus.emit('count', 1)).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not dispatch from a deferred middleware continuation', () => {
    let next: (() => void) | undefined;
    const listener = vi.fn();
    const bus = createBus<{ count: number }>({
      middleware: [
        (_event, _payload, continueDispatch) => {
          next = continueDispatch;
        },
      ],
    });

    bus.on('count', listener);

    expect(bus.emit('count', 1)).toBe(0);
    next?.();
    expect(listener).not.toHaveBeenCalled();
  });

  it('rejects incompatible renamed event pipes at compile time', () => {
    type Source = { count: number };
    type Target = { label: string };

    const source = createBus<Source>();
    const target = createBus<Target>();

    // @ts-expect-error count payload cannot be forwarded to label
    pipeEvents(source, target, [{ from: 'count', to: 'label' }]);

    source.dispose();
    target.dispose();
  });
});
