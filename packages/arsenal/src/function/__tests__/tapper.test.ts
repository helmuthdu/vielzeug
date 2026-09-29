import { describe, expect, it, vi } from 'vitest';

import { tapper } from '../tapper';

type TestEvent = { type: 'a' } | { type: 'b'; value?: number };

describe('tapper', () => {
  it('delivers events to every handler in registration order', () => {
    const tappers = tapper<TestEvent>();
    const seen: string[] = [];

    tappers.tap(() => seen.push('first'));
    tappers.tap(() => seen.push('second'));
    tappers.emit({ type: 'a' });

    expect(seen).toEqual(['first', 'second']);
  });

  it('swallows handler errors and keeps dispatching to remaining handlers', () => {
    const tappers = tapper<TestEvent>();
    const after = vi.fn();

    tappers.tap(() => {
      throw new Error('handler blew up');
    });
    tappers.tap(after);

    expect(() => tappers.emit({ type: 'a' })).not.toThrow();
    expect(after).toHaveBeenCalledOnce();
  });

  it('stops dispatching to a handler after unsubscribe', () => {
    const tappers = tapper<TestEvent>();
    const handler = vi.fn();

    const unsubscribe = tappers.tap(handler);
    unsubscribe();
    tappers.emit({ type: 'a' });

    expect(handler).not.toHaveBeenCalled();
    expect(tappers.size).toBe(0);
  });

  it('auto-detaches when the abort signal fires', () => {
    const tappers = tapper<TestEvent>();
    const handler = vi.fn();
    const controller = new AbortController();

    tappers.tap(handler, { signal: controller.signal });
    controller.abort();
    tappers.emit({ type: 'a' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('never registers a handler when the signal is already aborted', () => {
    const tappers = tapper<TestEvent>();
    const handler = vi.fn();

    tappers.tap(handler, { signal: AbortSignal.abort() });
    tappers.emit({ type: 'a' });

    expect(handler).not.toHaveBeenCalled();
    expect(tappers.size).toBe(0);
  });

  it('clear removes all handlers', () => {
    const tappers = tapper<TestEvent>();
    const handler = vi.fn();

    tappers.tap(handler);
    tappers.clear();
    tappers.emit({ type: 'a' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('removes the abort listener when unsubscribing manually', () => {
    const tappers = tapper<TestEvent>();
    const controller = new AbortController();
    const spy = vi.spyOn(controller.signal, 'removeEventListener');

    const unsubscribe = tappers.tap(vi.fn(), { signal: controller.signal });
    unsubscribe();

    expect(spy).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('dispatches to handlers registered during emission exactly once', () => {
    const tappers = tapper<TestEvent>();
    const late = vi.fn();

    tappers.tap(() => tappers.tap(late));
    tappers.emit({ type: 'a' });
    expect(late).not.toHaveBeenCalled();

    tappers.emit({ type: 'b' });
    expect(late).toHaveBeenCalledOnce();
  });
});
