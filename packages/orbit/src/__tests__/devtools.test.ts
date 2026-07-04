import { debugFloat } from '@vielzeug/orbit/devtools';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { makeElements, setViewport } from './helpers';

// ─── debugFloat ───────────────────────────────────────────────────────────────

describe('debugFloat', () => {
  beforeEach(() => setViewport());
  afterEach(() => vi.restoreAllMocks());

  it('attaches an overlay element to document.body', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = debugFloat(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(document.body.querySelector('[data-orbit-debug]')).not.toBeNull();
    handle.dispose();
  });

  it('removes the overlay from the DOM on dispose', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = debugFloat(reference, floating, { autoUpdate: false, placement: 'bottom' });

    handle.dispose();
    expect(document.body.querySelector('[data-orbit-debug]')).toBeNull();
  });

  it('renders a placement badge reflecting the current placement', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = debugFloat(reference, floating, { autoUpdate: false, placement: 'top' });

    expect(document.body.querySelector('[data-orbit-debug]')?.textContent).toContain('top');
    handle.dispose();
  });

  it('still invokes a custom apply option alongside the overlay render', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const apply = vi.fn();
    const handle = debugFloat(reference, floating, { apply, autoUpdate: false, placement: 'bottom' });

    expect(apply).toHaveBeenCalledTimes(1);
    handle.dispose();
  });

  it('returns a FloatHandle whose getPosition() reflects the computed result', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = debugFloat(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(handle.getPosition()).toMatchObject({ placement: 'bottom' });
    handle.dispose();
  });

  it('dispose is idempotent', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = debugFloat(reference, floating, { autoUpdate: false });

    handle.dispose();
    expect(() => handle.dispose()).not.toThrow();
    expect(handle.disposed).toBe(true);
  });
});
