import { createBus } from '../bus';
import { createTestBus } from '../testing';

describe('public type contracts', () => {
  it('accepts normal TypeScript interface event maps', () => {
    interface InterfaceEvents {
      count: number;
      ready: undefined;
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
});
