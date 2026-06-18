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

  it('dispose does not throw', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false });

    expect(() => handle.dispose()).not.toThrow();
  });

  it('disposed is false before dispose and true after', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false });

    expect(handle.disposed).toBe(false);
    handle.dispose();
    expect(handle.disposed).toBe(true);
  });

  it('[Symbol.dispose] sets disposed to true', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false });

    handle[Symbol.dispose]();
    expect(handle.disposed).toBe(true);
  });

  it('position.value is a ComputePositionResult after construction', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = createFloatState(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(handle.position.value).toMatchObject({ placement: 'bottom', x: 210, y: 340 });
    handle.dispose();
  });
});
