import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  computePositionAsync,
  computePositionRaf,
  createPositioner,
  detectOverflow,
  flip,
  getAlignment,
  getClippingAncestorRect,
  getSide,
  hide,
  limitShift,
  OrbitConfigError,
  OrbitError,
  shift,
  size,
} from '../index';
import type { Middleware } from '../types';
import { createDomRect, makeArrow, makeElements, makeVirtualReference, setViewport, withState } from './helpers';

describe('computePosition', () => {
  beforeEach(() => setViewport());
  afterEach(() => vi.restoreAllMocks());

  it('computes default bottom placement', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(computePosition(reference, floating)).toMatchObject({ placement: 'bottom', x: 210, y: 340 });
  });

  it('supports aligned placements and virtual references', () => {
    const reference = makeVirtualReference({ height: 40, width: 100, x: 200, y: 300 });
    const floating = document.createElement('div');

    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 80 }));

    expect(computePosition(reference, floating, { placement: 'top-end' })).toMatchObject({ x: 220, y: 270 });
  });

  it('runs middleware in supplied order', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 100, y: 100 }, { height: 20, width: 40 });
    const first: Middleware = (state) => ({ x: state.x + 4 });
    const second: Middleware = (state) => ({ data: { marker: state.x }, y: state.y + 8 });

    expect(computePosition(reference, floating, { middleware: [first, second] })).toMatchObject({
      middlewareData: { marker: 104 },
      x: 104,
      y: 128,
    });
  });

  it('throws after excessive middleware resets', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40 }, { height: 20, width: 40 });
    const loop: Middleware = () => ({ reset: {} });

    expect(() => computePosition(reference, floating, { middleware: [loop] })).toThrow(OrbitConfigError);
  });

  it('supports reset placement, explicit rects, and remeasurement', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 100, y: 100 }, { height: 20, width: 40 });
    const replacement = {
      floating: { height: 30, width: 60, x: 0, y: 0 },
      reference: { height: 10, width: 20, x: 20, y: 30 },
    };
    let resetOnce = true;
    const reset: Middleware = vi.fn(() => {
      if (!resetOnce) return;

      resetOnce = false;

      return { reset: { placement: 'top', rects: replacement, remeasure: false } };
    });

    const result = computePosition(reference, floating, { middleware: [reset] });

    expect(result).toMatchObject({ placement: 'top', x: 0, y: 0 });
  });

  it('keeps middleware data isolated from Object.prototype', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40 }, { height: 20, width: 40 });
    const unsafe: Middleware = () => ({ data: JSON.parse('{"__proto__":{"polluted":true}}') });

    computePosition(reference, floating, { middleware: [unsafe] });

    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it('supports synchronous, microtask, and animation-frame scheduling', async () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 100, y: 100 }, { height: 20, width: 40 });

    await expect(computePositionAsync(reference, floating)).resolves.toMatchObject({ x: 100, y: 120 });
    await expect(computePositionRaf(reference, floating)).resolves.toMatchObject({ x: 100, y: 120 });
  });
});

describe('middleware', () => {
  beforeEach(() => setViewport());

  it('positions and constrains arrows', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 100, y: 100 }, { height: 20, width: 80 });
    const arrowElement = makeArrow({ height: 8, width: 8 });

    expect(
      computePosition(reference, floating, { middleware: [arrow({ element: arrowElement })] }).middlewareData.arrow,
    ).toMatchObject({
      constrained: false,
    });
  });

  it('flips, shifts, sizes, and hides against the boundary', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 10, y: 740 }, { height: 60, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [flip(), shift({ padding: 8 }), size(), hide()],
    });

    expect(result.placement).toBe('top');
    expect(result.middlewareData.size).toBeDefined();
    expect(result.middlewareData.hide).toBeDefined();
  });

  it('selects an automatic placement', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 10, y: 740 }, { height: 60, width: 80 });

    expect(computePosition(reference, floating, { middleware: [autoPlacement()] }).placement).toBe('top');
  });

  it('limits shift drift', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 0, y: 100 }, { height: 20, width: 100 });
    const result = computePosition(reference, floating, { middleware: [shift({ limiter: limitShift() })] });

    expect(result.middlewareData.shift).toBeDefined();
  });

  it('reports overflow for middleware authors', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40 }, { height: 20, width: 80 });
    const state = withState({
      elements: { floating, reference },
      initialPlacement: 'bottom',
      placement: 'bottom',
      rects: { floating: { height: 20, width: 80, x: 0, y: 0 }, reference: { height: 20, width: 40, x: 0, y: 0 } },
      x: 1000,
      y: 760,
    });

    expect(detectOverflow(state).right).toBeGreaterThan(0);
  });
});

describe('createPositioner', () => {
  beforeEach(() => setViewport());
  afterEach(() => vi.restoreAllMocks());

  it('owns strategy, clipping boundary, update, and disposal', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 100, y: 100 }, { height: 20, width: 80 });
    const positioner = createPositioner(reference, floating, { autoUpdate: false, strategy: 'fixed' });

    positioner.start();

    expect(positioner.getPosition()).toMatchObject({ x: 80, y: 120 });
    expect(floating.style.position).toBe('fixed');
    positioner.dispose();
    expect(positioner.disposed).toBe(true);
  });

  it('does not start or update after disposal', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 100, y: 100 }, { height: 20, width: 80 });
    const apply = vi.fn();
    const positioner = createPositioner(reference, floating, { apply, autoUpdate: false });

    positioner.dispose();
    positioner.start();
    positioner.update();

    expect(positioner.getPosition()).toBeNull();
    expect(apply).not.toHaveBeenCalled();
  });

  it('uses absolute coordinates for the floating offset parent', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 100, y: 100 }, { height: 20, width: 80 });
    const parent = document.createElement('div');

    Object.defineProperty(floating, 'offsetParent', { configurable: true, value: parent });
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 100, width: 100, x: 20, y: 30 }));

    const positioner = createPositioner(reference, floating, { autoUpdate: false, strategy: 'absolute' });

    positioner.start();

    expect(positioner.getPosition()).toMatchObject({ x: 60, y: 90 });
    positioner.dispose();
  });

  it('resolves clipping ancestors by default', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 100, y: 100 }, { height: 20, width: 80 });
    const ancestor = document.createElement('div');

    ancestor.append(floating);
    vi.spyOn(ancestor, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 100, width: 100, x: 0, y: 0 }));
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      overflow: 'hidden',
      overflowX: 'hidden',
      overflowY: 'hidden',
    } as CSSStyleDeclaration);

    expect(getClippingAncestorRect(floating)).toMatchObject({ height: 100, width: 100 });
    createPositioner(reference, floating, { autoUpdate: false }).start();
  });
});

describe('autoUpdate', () => {
  it('updates immediately and returns cleanup', () => {
    const { floating, reference } = makeElements({ height: 20, width: 40 }, { height: 20, width: 80 });
    const update = vi.fn();

    const cleanup = autoUpdate(reference, floating, update, { observeFloating: false });

    expect(update).toHaveBeenCalledOnce();
    cleanup();
  });

  it('throttles repeated updates and cancels pending work during cleanup', () => {
    vi.useFakeTimers();

    const { floating, reference } = makeElements({ height: 20, width: 40 }, { height: 20, width: 80 });
    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update, { observeFloating: false, throttle: 50 });

    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    cleanup();
    vi.advanceTimersByTime(50);

    expect(update).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

describe('utilities and errors', () => {
  it('reads placement parts', () => {
    expect(getSide('bottom-start')).toBe('bottom');
    expect(getAlignment('bottom-start')).toBe('start');
    expect(getAlignment('bottom')).toBeNull();
  });

  it('recognizes Orbit errors', () => {
    expect(OrbitError.is(new OrbitConfigError('bad config'))).toBe(true);
    expect(OrbitError.is(new Error('plain'))).toBe(false);
  });
});
