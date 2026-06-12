import { debugBus } from '../devtools';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: void;
};

describe('debugBus', () => {
  it('creates a functional bus with console.debug wired as logger.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = debugBus<TestEvents>();
    const listener = vi.fn();

    bus.on('count', listener);
    bus.emit('count', 42);

    expect(listener).toHaveBeenCalledWith(42);
    expect(spy).toHaveBeenCalled();

    bus.dispose();
    spy.mockRestore();
  });

  it('routes warn through a custom logger.warn, not console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const customWarn = vi.fn();
    const bus = debugBus<TestEvents>({ logger: { warn: customWarn }, maxListeners: 1 });

    bus.on('count', vi.fn());
    bus.on('count', vi.fn());

    expect(customWarn).toHaveBeenCalledOnce();
    expect(customWarn.mock.calls[0][0]).toContain('[herald:warn]');
    expect(warnSpy).not.toHaveBeenCalled();

    bus.dispose();
    warnSpy.mockRestore();
  });

  it('passes name option through to the underlying bus', () => {
    const logs: string[] = [];
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation((m: string) => logs.push(m));
    const bus = debugBus<TestEvents>({ name: 'audit' });

    bus.emit('count', 1);

    expect(logs.some((l) => l.includes('(audit)'))).toBe(true);

    bus.dispose();
    consoleSpy.mockRestore();
  });

  it('passes standard BusOptions (maxListeners, middleware, onError) through', () => {
    const onError = vi.fn();
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = debugBus<TestEvents>({ onError });
    const boom = vi.fn(() => {
      throw new Error('boom');
    });

    bus.on('count', boom);
    bus.emit('count', 1);

    expect(onError).toHaveBeenCalledOnce();

    bus.dispose();
    spy.mockRestore();
  });
});
