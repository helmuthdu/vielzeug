// Guards the FLIP helper's safety contract: motion is an enhancement, so every
// path that cannot animate (no rows, no stable keys, zeroed duration tokens as
// reduced motion sets them, a disposed lifecycle) must still run the mutation
// exactly once. jsdom has no Web Animations API, which is also what the
// try/catch around animate() is for.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRowMotion } from '../datagrid-motion';

function gridWithRows(count: number, keyed: boolean): HTMLElement {
  const host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const table = document.createElement('table');

  for (const index of Array.from({ length: count }, (_, i) => i)) {
    const row = document.createElement('tr');
    row.setAttribute('part', 'row');
    if (keyed) row.dataset.rowKey = String(index);
    table.append(row);
  }
  root.append(table);

  return host;
}

describe('createRowMotion', () => {
  let controller: AbortController;

  beforeEach(() => {
    controller = new AbortController();
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);

      return 0;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the mutation when there are no rows', () => {
    const host = gridWithRows(0, true);
    const mutate = vi.fn();

    createRowMotion(host, controller.signal).run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('runs the mutation when rows lack stable keys', () => {
    const host = gridWithRows(3, false);
    const mutate = vi.fn();

    createRowMotion(host, controller.signal).run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('runs the mutation when the duration token is zeroed (reduced motion)', () => {
    const host = gridWithRows(3, true);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      new Proxy(
        {
          getPropertyValue: (name: string) => (name === '--duration-200' ? '0ms' : ''),
        } as unknown as CSSStyleDeclaration,
        {
          get: (target, prop) => (prop === 'getPropertyValue' ? target.getPropertyValue : undefined),
        },
      ),
    );
    const mutate = vi.fn();

    createRowMotion(host, controller.signal).run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('runs the mutation and survives when WAAPI is unavailable (jsdom)', () => {
    const host = gridWithRows(3, true);
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(
      new Proxy({ getPropertyValue: () => '' } as unknown as CSSStyleDeclaration, {
        get: (target, prop) => (prop === 'getPropertyValue' ? target.getPropertyValue : undefined),
      }),
    );
    const mutate = vi.fn();

    // '' duration -> skip path; with a real duration but no WAAPI, the
    // try/catch inside the frame must swallow NecromancerUnsupportedError.
    createRowMotion(host, controller.signal).run(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('skips the animation frame work after the signal aborts', () => {
    const host = gridWithRows(3, true);
    controller.abort();
    const mutate = vi.fn();

    expect(() => createRowMotion(host, controller.signal).run(mutate)).not.toThrow();
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
