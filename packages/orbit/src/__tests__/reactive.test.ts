import { createFloatState } from '@vielzeug/orbit/reactive';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDomRect, makeElements, setViewport } from './helpers';

// ─── createFloatState ─────────────────────────────────────────────────────────

describe('createFloatState', () => {
  beforeEach(() => setViewport());
  afterEach(() => vi.restoreAllMocks());

  it('returns a ReactiveFloatHandle with position signal, dispose, and update', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(typeof handle.dispose).toBe('function');
    expect(typeof handle.update).toBe('function');
    expect(handle.position).toBeDefined();
    expect(typeof handle.position.value).not.toBe('function');
    handle.dispose();
  });

  it('position signal is non-null after construction (autoUpdate: false)', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(handle.position.value).not.toBeNull();
    expect(handle.position.value?.placement).toBe('bottom');
    handle.dispose();
  });

  it('position signal reflects computed x/y coordinates', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(handle.position.value?.x).toBe(210);
    expect(handle.position.value?.y).toBe(340);
    handle.dispose();
  });

  it('position signal updates when update() is called', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    const firstValue = handle.position.value;

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 40, width: 100, x: 0, y: 0 }));
    handle.update();

    expect(handle.position.value).not.toBe(firstValue);
    expect(handle.position.value?.x).not.toBe(firstValue?.x);
    handle.dispose();
  });

  it('cssAnchor is false on JS-computed handles', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false });

    expect(handle.cssAnchor).toBe(false);
    handle.dispose();
  });

  it('dispose does not throw', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false });

    expect(() => handle.dispose()).not.toThrow();
  });

  it('emits a DEV warn when preferCssAnchor is true but browser does not support it', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const handle = createFloatState(reference, floating, { autoUpdate: false, preferCssAnchor: true });

    handle.dispose();

    // jsdom does not support CSS Anchor Positioning, so a DEV warn should fire.
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('preferCssAnchor'));
  });
});
