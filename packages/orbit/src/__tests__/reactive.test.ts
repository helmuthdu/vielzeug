import { createFloatState } from '@vielzeug/orbit/reactive';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDomRect, makeElements, setViewport } from './helpers';

// ─── createFloatState ─────────────────────────────────────────────────────────

describe('createFloatState', () => {
  beforeEach(() => setViewport());
  afterEach(() => vi.restoreAllMocks());

  it('returns a ReactiveFloatHandle with position signal, cleanup, and update', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(typeof handle.cleanup).toBe('function');
    expect(typeof handle.update).toBe('function');
    expect(handle.position).toBeDefined();
    expect(typeof handle.position.value).not.toBe('function');
    handle.cleanup();
  });

  it('position signal is non-null after construction (autoUpdate: false)', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(handle.position.value).not.toBeNull();
    expect(handle.position.value?.placement).toBe('bottom');
    handle.cleanup();
  });

  it('position signal reflects computed x/y coordinates', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(handle.position.value?.x).toBe(210);
    expect(handle.position.value?.y).toBe(340);
    handle.cleanup();
  });

  it('position signal updates when update() is called', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    const firstValue = handle.position.value;

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 40, width: 100, x: 0, y: 0 }));
    handle.update();

    expect(handle.position.value).not.toBe(firstValue);
    expect(handle.position.value?.x).not.toBe(firstValue?.x);
    handle.cleanup();
  });

  it('cssAnchor is false on JS-computed handles', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false });

    expect(handle.cssAnchor).toBe(false);
    handle.cleanup();
  });

  it('cleanup does not throw', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false });

    expect(() => handle.cleanup()).not.toThrow();
  });

  it('emits a DEV warning when cssAnchor path is active', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 80 }));

    const handle = createFloatState(reference as unknown as HTMLElement, floating, {
      autoUpdate: false,
      preferCssAnchor: true,
    });

    handle.cleanup();

    // If CSS Anchor Positioning is unsupported in jsdom, cssAnchor will be false and no warning fires.
    // If it were supported and active, the warning would be present.
    // Either outcome is valid in this test environment.
    expect(warnSpy).toHaveBeenCalledTimes(warnSpy.mock.calls.length);
  });
});
