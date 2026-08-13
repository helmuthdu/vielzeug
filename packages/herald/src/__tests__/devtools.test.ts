import { debugBus } from '../devtools';

type TestEvents = {
  count: number;
  greet: { name: string };
  toggle: undefined;
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
    expect(customWarn.mock.calls[0][0]).toContain('on("count")');
    expect(warnSpy).not.toHaveBeenCalled();

    bus.dispose();
    warnSpy.mockRestore();
  });

  it('passes standard BusOptions through', () => {
    const onError = vi.fn();
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const bus = debugBus<TestEvents>({ name: 'audit', onError });
    const boom = vi.fn(() => {
      throw new Error('boom');
    });

    bus.on('count', boom);
    bus.emit('count', 1);

    expect(onError).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('(audit)'));

    bus.dispose();
    spy.mockRestore();
  });
});
