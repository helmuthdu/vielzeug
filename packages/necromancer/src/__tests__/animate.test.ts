import { afterEach, describe, expect, it, vi } from 'vitest';

import { animate, NecromancerError, NecromancerUnsupportedError } from '../index';
import { installWaapi } from './helpers';

describe('animate', () => {
  let restoreWaapi: (() => void) | undefined;

  afterEach(() => {
    restoreWaapi?.();
    restoreWaapi = undefined;
    vi.unstubAllGlobals();
  });

  it('forwards keyframes and native timing options through its native animation', () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;

    const element = document.createElement('div');
    const keyframes = [{ opacity: 0 }, { opacity: 1 }];
    const handle = animate(element, keyframes, { duration: 180, easing: 'ease-out', fill: 'both', motion: 'full' });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      keyframes,
      options: { duration: 180, easing: 'ease-out', fill: 'both' },
    });
    expect(handle.animation).toBe(calls[0]?.animation);
    handle.dispose();
  });

  it('resolves its result after a natural native completion', async () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;

    const handle = animate(document.createElement('div'), [{ opacity: 0 }, { opacity: 1 }]);

    calls[0]?.animation.finish();

    await expect(handle.result).resolves.toEqual({ status: 'finished' });
  });

  it('disposes idempotently and cancels the owned native animation', async () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;

    const handle = animate(document.createElement('div'), [{ opacity: 0 }, { opacity: 1 }]);

    handle.dispose('owner ended');
    handle.dispose();

    expect(handle.disposed).toBe(true);
    expect(handle.disposalSignal.aborted).toBe(true);
    expect(calls[0]?.animation.cancel).toHaveBeenCalledOnce();
    await expect(handle.result).resolves.toEqual({ reason: 'owner ended', status: 'cancelled' });
  });

  it('reports the native cancellation reason without treating the handle as disposed', async () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;

    const handle = animate(document.createElement('div'), [{ opacity: 0 }, { opacity: 1 }]);

    calls[0]?.animation.cancel();

    expect(handle.disposed).toBe(false);
    await expect(handle.result).resolves.toMatchObject({ reason: expect.any(DOMException), status: 'cancelled' });
  });

  it('disposes when a later caller signal aborts', async () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;

    const controller = new AbortController();
    const handle = animate(document.createElement('div'), [{ opacity: 0 }, { opacity: 1 }], {
      signal: controller.signal,
    });

    controller.abort('route changed');

    expect(calls[0]?.animation.cancel).toHaveBeenCalledOnce();
    await expect(handle.result).resolves.toEqual({ reason: 'route changed', status: 'cancelled' });
  });

  it('throws an already-aborted caller reason without creating an animation', () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;

    const controller = new AbortController();
    const reason = new Error('route changed');

    controller.abort(reason);

    expect(() => animate(document.createElement('div'), [], { signal: controller.signal })).toThrow(reason);
    expect(calls).toHaveLength(0);
  });

  it('reduces timing while preserving requested frames and native options', async () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );

    const handle = animate(document.createElement('div'), [{ opacity: 0 }, { opacity: 1 }], {
      duration: 200,
      fill: 'both',
    });

    expect(calls[0]).toMatchObject({
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      options: { delay: 0, duration: 0, endDelay: 0, fill: 'both', iterations: 1 },
    });

    calls[0]?.animation.finish();

    await expect(handle.result).resolves.toEqual({ status: 'reduced' });
  });

  it('allows callers to select full or reduced motion', () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );

    const element = document.createElement('div');
    const full = animate(element, [], { duration: 200, motion: 'full' });
    const reduced = animate(element, [], { duration: 200, motion: 'reduced' });

    expect(calls[0]?.options).toMatchObject({ duration: 200 });
    expect(calls[1]?.options).toMatchObject({ duration: 0 });
    full.dispose();
    reduced.dispose();
  });

  it('reports an unsupported Web Animations API', () => {
    const element = document.createElement('div');

    Object.defineProperty(element, 'animate', { configurable: true, value: undefined });

    expect(() => animate(element, [])).toThrow(NecromancerUnsupportedError);
    expect(NecromancerError.is(new NecromancerUnsupportedError('missing'))).toBe(true);
  });

  it('supports explicit resource disposal', async () => {
    const { calls, restore } = installWaapi();

    restoreWaapi = restore;

    const handle = animate(document.createElement('div'), []);

    handle[Symbol.dispose]();

    expect(calls[0]?.animation.cancel).toHaveBeenCalledOnce();
    await expect(handle.result).resolves.toMatchObject({ reason: expect.any(DOMException), status: 'cancelled' });
  });
});
