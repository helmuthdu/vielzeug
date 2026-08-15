import { describe, expect, it } from 'vitest';

import { toAsyncIterable } from '../async';
import { fromQuery } from '../courier';
import { fromBus, toBus } from '../herald';
import { pipe, stream } from '../index';
import { fromPresence, fromPulse } from '../pulse';
import { fromSignal, toSignal } from '../ripple';
import { createChannel } from '../subjects';

describe('public entrypoints', () => {
  it('exposes core composition and async conversion', () => {
    const source = pipe(stream<number>(() => {}));

    expect(typeof source.subscribe).toBe('function');
    expect(typeof toAsyncIterable).toBe('function');
  });

  it('exposes every optional adapter entrypoint', () => {
    expect(typeof fromQuery).toBe('function');
    expect(typeof fromBus).toBe('function');
    expect(typeof toBus).toBe('function');
    expect(typeof fromPresence).toBe('function');
    expect(typeof fromPulse).toBe('function');
    expect(typeof fromSignal).toBe('function');
    expect(typeof toSignal).toBe('function');
    expect(typeof createChannel).toBe('function');
  });
});
