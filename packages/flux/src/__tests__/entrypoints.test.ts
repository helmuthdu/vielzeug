import { describe, expect, it } from 'vitest';

import { createChannel, fromStore, fromSubscribe, pipe, stream, toAsyncIterable } from '../index';

describe('public entrypoints', () => {
  it('exposes core composition and async conversion', () => {
    const source = pipe(stream<number>(() => {}));

    expect(typeof source.subscribe).toBe('function');
    expect(typeof toAsyncIterable).toBe('function');
  });

  it('exposes fromSubscribe bridge and channels', () => {
    expect(typeof fromStore).toBe('function');
    expect(typeof fromSubscribe).toBe('function');
    expect(typeof createChannel).toBe('function');
  });
});
