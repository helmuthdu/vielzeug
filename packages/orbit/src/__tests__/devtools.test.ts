import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debugPositioner } from '../devtools';
import { makeElements, setViewport } from './helpers';

describe('debugPositioner', () => {
  beforeEach(() => setViewport());
  afterEach(() => {
    document.querySelectorAll('[data-orbit-debug]').forEach((element) => {
      element.remove();
    });
    vi.restoreAllMocks();
  });

  it('adds and removes its debug overlay with the positioner lifecycle', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const positioner = debugPositioner(reference, floating, { autoUpdate: false });

    expect(document.querySelector('[data-orbit-debug]')).not.toBeNull();
    positioner.dispose();
    expect(document.querySelector('[data-orbit-debug]')).toBeNull();
  });
});
