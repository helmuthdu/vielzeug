import { afterEach, describe, expect, it } from 'vitest';

import { animateEach, NecromancerConfigError } from '../index';
import { installFakeAnimations } from '../testing';

describe('animateEach', () => {
  let restoreWaapi: (() => void) | undefined;

  afterEach(() => {
    restoreWaapi?.();
    restoreWaapi = undefined;
  });

  it('animates unique elements in stable order with accumulated delays', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const first = document.createElement('div');
    const second = document.createElement('div');
    const group = animateEach([first, second, first], [{ opacity: 0 }, { opacity: 1 }], {
      delay: 20,
      motion: 'full',
      stagger: 30,
    });

    expect(group.handles).toHaveLength(2);
    expect(calls.map((call) => call.options?.delay)).toEqual([20, 50]);
    group.dispose();
  });

  it('resolves every keyframe factory before the first native animation starts', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const first = document.createElement('div');
    const second = document.createElement('div');

    expect(() =>
      animateEach([first, second], (_, index) => {
        if (index === 1) throw new Error('invalid second frame');

        return [];
      }),
    ).toThrow('invalid second frame');
    expect(calls).toEqual([]);
  });

  it('provides a keyframe factory with the unique-element index and total', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const elements = [document.createElement('div'), document.createElement('div')];
    const group = animateEach(elements, (_, index, total) => [{ opacity: index / total }, { opacity: 1 }]);

    expect(calls.map((call) => call.keyframes)).toEqual([
      [{ opacity: 0 }, { opacity: 1 }],
      [{ opacity: 0.5 }, { opacity: 1 }],
    ]);
    group.dispose();
  });

  it('disposes started children when a later native animation fails to start', () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const first = document.createElement('div');
    const second = document.createElement('div');

    Object.defineProperty(second, 'animate', {
      configurable: true,
      value: () => {
        throw new Error('native animation failed');
      },
    });

    expect(() => animateEach([first, second], [])).toThrow('native animation failed');
    expect(calls[0]?.animation.cancelCallCount).toBe(1);
  });

  it('rejects invalid stagger and incompatible nonnumeric delays', () => {
    const { restore } = installFakeAnimations();

    restoreWaapi = restore;

    const element = document.createElement('div');

    expect(() => animateEach([element], [], { stagger: -1 })).toThrow(NecromancerConfigError);
    expect(() => animateEach([element], [], { stagger: Number.NaN })).toThrow(NecromancerConfigError);
    expect(() =>
      animateEach([element, element.cloneNode() as Element], [], { delay: '20ms' as never, stagger: 10 }),
    ).toThrow(NecromancerConfigError);
  });

  it('creates an empty group for an empty iterable', async () => {
    const { restore } = installFakeAnimations();

    restoreWaapi = restore;

    const group = animateEach([], []);

    expect(group.handles).toEqual([]);
    await expect(group.results).resolves.toEqual([]);
  });

  it('disposes every child through one lifecycle owner', async () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const group = animateEach([document.createElement('div'), document.createElement('div')], []);

    group.dispose('scope ended');

    for (const call of calls) {
      expect(call.animation.cancelCallCount).toBe(1);
    }
    await expect(group.results).resolves.toEqual([
      { reason: 'scope ended', status: 'cancelled' },
      { reason: 'scope ended', status: 'cancelled' },
    ]);
  });

  it('owns a parent abort signal as one group lifecycle', async () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const controller = new AbortController();
    const group = animateEach([document.createElement('div'), document.createElement('div')], [], {
      signal: controller.signal,
    });

    controller.abort('route changed');

    expect(group.disposed).toBe(true);
    for (const call of calls) expect(call.animation.cancelCallCount).toBe(1);
    await expect(group.results).resolves.toEqual([
      { reason: 'route changed', status: 'cancelled' },
      { reason: 'route changed', status: 'cancelled' },
    ]);
  });

  it('preserves every child result', async () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const group = animateEach([document.createElement('div'), document.createElement('div')], [], {
      motion: 'reduced',
    });

    for (const call of calls) call.animation.finish();

    await expect(group.results).resolves.toEqual([{ status: 'reduced' }, { status: 'reduced' }]);
  });

  it('reports natural child completion and exposes resource disposal', async () => {
    const { calls, restore } = installFakeAnimations();

    restoreWaapi = restore;

    const group = animateEach([document.createElement('div'), document.createElement('div')], []);

    for (const call of calls) call.animation.finish();
    await expect(group.results).resolves.toEqual([{ status: 'finished' }, { status: 'finished' }]);

    group[Symbol.dispose]();
    expect(group.disposed).toBe(true);
  });
});
