import { presets } from '@vielzeug/orbit/presets';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Middleware } from '../types';

import {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  detectOverflow,
  float,
  flip,
  getAlignment,
  getSide,
  hide,
  offset,
  shift,
  size,
} from '../index';
import { createDomRect, makeArrow, makeElements, makeVirtualReference, setViewport, withState } from './helpers';

// ─── computePosition ──────────────────────────────────────────────────────────

describe('computePosition', () => {
  beforeEach(() => setViewport());

  it('defaults to bottom-center placement', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating);

    expect(result.placement).toBe('bottom');
    expect(result.y).toBe(340);
    expect(result.x).toBe(210);
  });

  it('positions top', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const { x, y } = computePosition(reference, floating, { placement: 'top' });

    expect(y).toBe(270);
    expect(x).toBe(210);
  });

  it('aligns start and end', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(computePosition(reference, floating, { placement: 'bottom-start' }).x).toBe(200);
    expect(computePosition(reference, floating, { placement: 'bottom-end' }).x).toBe(220);
  });

  it('silently ignores nullish middleware entries', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 20, width: 80 });

    expect(() => computePosition(reference, floating, { middleware: [null, undefined, false] })).not.toThrow();
  });

  it('collects middlewareData from custom middleware', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 50, y: 100 }, { height: 20, width: 20 });
    const mark: Middleware = () => ({ data: { custom: { ok: true } } });
    const result = computePosition(reference, floating, { middleware: [mark] });

    expect(result.middlewareData.custom).toEqual({ ok: true });
  });

  it('throws when middleware resets too many times', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 50, y: 100 }, { height: 20, width: 20 });
    const loop: Middleware = () => ({ reset: true });

    expect(() => computePosition(reference, floating, { middleware: [loop] })).toThrow(/too many resets/i);
  });

  it('supports virtual references', () => {
    const virtualReference = makeVirtualReference({ height: 40, width: 100, x: 200, y: 300 });
    const floating = document.createElement('div');

    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 80 }));

    const result = computePosition(virtualReference, floating, { placement: 'bottom' });

    expect(result.x).toBe(210);
    expect(result.y).toBe(340);
  });
});

// ─── detectOverflow ───────────────────────────────────────────────────────────

describe('detectOverflow', () => {
  beforeEach(() => setViewport());

  it('returns positive overflow offsets', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 0, y: 0 }, { height: 30, width: 80 });
    const state = withState({
      elements: { floating, reference },
      initialPlacement: 'bottom',
      placement: 'bottom',
      rects: {
        floating: { height: 30, width: 80, x: 0, y: 0 },
        reference: { height: 40, width: 100, x: 0, y: 0 },
      },
      x: 980,
      y: 760,
    });

    expect(detectOverflow(state)).toEqual({ bottom: 22, left: -980, right: 36, top: -760 });
  });

  it('supports per-side padding', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 0, y: 0 }, { height: 30, width: 80 });
    const state = withState({
      elements: { floating, reference },
      initialPlacement: 'bottom',
      placement: 'bottom',
      rects: {
        floating: { height: 30, width: 80, x: 0, y: 0 },
        reference: { height: 40, width: 100, x: 0, y: 0 },
      },
      x: 10,
      y: 10,
    });

    expect(detectOverflow(state, { padding: { left: 8, top: 4 } })).toEqual({
      bottom: -728,
      left: -2,
      right: -934,
      top: -6,
    });
  });
});

// ─── getSide / getAlignment ───────────────────────────────────────────────────

describe('getSide', () => {
  it('extracts the primary side from all placement variants', () => {
    expect(getSide('top')).toBe('top');
    expect(getSide('bottom-start')).toBe('bottom');
    expect(getSide('left-end')).toBe('left');
    expect(getSide('right')).toBe('right');
  });
});

describe('getAlignment', () => {
  it('returns null for cardinal placements', () => {
    expect(getAlignment('top')).toBeNull();
    expect(getAlignment('bottom')).toBeNull();
  });

  it('returns start/end for aligned placements', () => {
    expect(getAlignment('top-start')).toBe('start');
    expect(getAlignment('bottom-end')).toBe('end');
    expect(getAlignment('left-start')).toBe('start');
  });
});

// ─── offset ───────────────────────────────────────────────────────────────────

describe('offset', () => {
  it('moves along the main axis', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 100, y: 200 }, { height: 30, width: 80 });

    expect(computePosition(reference, floating, { middleware: [offset(8)], placement: 'bottom' }).y).toBe(248);
    expect(computePosition(reference, floating, { middleware: [offset(8)], placement: 'top' }).y).toBe(162);
    expect(computePosition(reference, floating, { middleware: [offset(8)], placement: 'left' }).x).toBe(12);
    expect(computePosition(reference, floating, { middleware: [offset(8)], placement: 'right' }).x).toBe(208);
  });

  it('supports cross-axis and function values', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 100, y: 200 }, { height: 30, width: 80 });
    const objectValue = computePosition(reference, floating, {
      middleware: [offset({ crossAxis: 5, mainAxis: 8 })],
      placement: 'bottom',
    });
    const functionValue = computePosition(reference, floating, {
      middleware: [offset((state) => ({ crossAxis: state.placement === 'right' ? 4 : 0, mainAxis: 8 }))],
      placement: 'right',
    });

    expect(objectValue.x).toBe(115);
    expect(objectValue.y).toBe(248);
    expect(functionValue.x).toBe(208);
    expect(functionValue.y).toBe(209);
  });
});

// ─── flip ─────────────────────────────────────────────────────────────────────

describe('flip', () => {
  beforeEach(() => setViewport());

  it('keeps placement when there is no overflow', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(computePosition(reference, floating, { middleware: [flip()], placement: 'bottom' }).placement).toBe(
      'bottom',
    );
  });

  it('flips to the opposite side by default', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 30, width: 80 });

    expect(computePosition(reference, floating, { middleware: [flip()], placement: 'bottom-start' }).placement).toBe(
      'top-start',
    );
  });

  it('supports explicit fallback placements', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 980, y: 720 }, { height: 80, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [flip({ fallbackPlacements: ['left', 'top'] })],
      placement: 'right',
    });

    expect(result.placement).toBe('left');
  });

  it('picks the best-effort placement when every fallback overflows', () => {
    // Ref is in the very centre of a tiny 100×100 viewport, float is 60×60.
    // No placement fits without overflow; flip should still pick the one that overflows least.
    setViewport(100, 100);

    const { floating, reference } = makeElements({ height: 10, width: 10, x: 45, y: 45 }, { height: 60, width: 60 });
    const result = computePosition(reference, floating, { middleware: [flip()], placement: 'bottom' });

    // Must produce a valid Placement (not throw)
    expect(['top', 'bottom', 'left', 'right']).toContain(getSide(result.placement));
  });
});

// ─── autoPlacement ────────────────────────────────────────────────────────────

describe('autoPlacement', () => {
  beforeEach(() => setViewport());

  it('chooses the placement with the most space', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 20, y: 700 }, { height: 60, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [autoPlacement()],
      placement: 'bottom',
    });

    expect(result.placement).toBe('right');
  });

  it('respects allowed placements', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 20, y: 700 }, { height: 60, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [autoPlacement({ allowedPlacements: ['left', 'right'] })],
      placement: 'bottom',
    });

    expect(['left', 'right']).toContain(result.placement);
  });
});

// ─── shift ────────────────────────────────────────────────────────────────────

describe('shift', () => {
  beforeEach(() => setViewport());

  it('only shifts the cross axis by default (bottom placement → x only)', () => {
    // ref at (990, 760, 100, 40), float (80, 30). base: x=990, y=800
    // overflow right = 990+80-1024=46 → shift x = -46 → 944
    // overflow bottom = 800+30-768=62 → y NOT shifted (main axis)
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 990, y: 760 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, { middleware: [shift()], placement: 'bottom-start' });

    expect(result.x).toBe(944);
    expect(result.y).toBe(800);
  });

  it('shifts the main axis when mainAxis: true', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 990, y: 760 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [shift({ mainAxis: true })],
      placement: 'bottom-start',
    });

    expect(result.x).toBe(944);
    expect(result.y).toBe(738);
  });

  it('only shifts the cross axis by default (left placement → y only)', () => {
    // For left placement: cross axis = y, main axis = x
    const { floating, reference } = makeElements({ height: 40, width: 40, x: 100, y: 730 }, { height: 80, width: 80 });
    const result = computePosition(reference, floating, { middleware: [shift()], placement: 'left' });
    const noShiftResult = computePosition(reference, floating, { placement: 'left' });

    // x (main axis) must not move
    expect(result.x).toBe(noShiftResult.x);
    // y (cross axis) must be pulled back inside the viewport
    expect(result.y).toBeLessThan(noShiftResult.y);
  });

  it('supports per-side padding', () => {
    const { floating, reference } = makeElements({ height: 40, width: 20, x: 5, y: 300 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [shift({ padding: { left: 8 } })],
      placement: 'bottom-end',
    });

    expect(result.x).toBe(8);
  });
});

// ─── size ─────────────────────────────────────────────────────────────────────

describe('size', () => {
  beforeEach(() => setViewport());

  it('reports available height via middlewareData.size', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );
    const result = computePosition(reference, floating, { middleware: [size()], placement: 'bottom' });

    expect(result.middlewareData.size?.availableHeight).toBe(388);
  });

  it('reports available height above for top placement', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 400 },
      { height: 100, width: 80 },
    );
    const result = computePosition(reference, floating, { middleware: [size()], placement: 'top' });

    expect(result.middlewareData.size?.availableHeight).toBe(400);
  });

  it('respects per-side padding', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );
    const result = computePosition(reference, floating, {
      middleware: [size({ padding: { bottom: 8 } })],
      placement: 'bottom',
    });

    expect(result.middlewareData.size?.availableHeight).toBe(380);
  });

  it('calls the apply callback with size data and elements', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );
    const apply = vi.fn();

    computePosition(reference, floating, { middleware: [size({ apply })], placement: 'bottom' });

    expect(apply).toHaveBeenCalledOnce();
    expect(apply.mock.calls[0][0].availableHeight).toBe(388);
    expect(apply.mock.calls[0][0].elements.floating).toBe(floating);
  });

  it('runs once after a flip reset, reflecting flipped placement', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 80, width: 80 });
    const apply = vi.fn();
    const result = computePosition(reference, floating, {
      middleware: [flip(), size({ apply })],
      placement: 'bottom',
    });

    expect(result.placement).toBe('top');
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][0].availableHeight).toBe(720);
    expect(result.middlewareData.size?.availableHeight).toBe(720);
  });
});

// ─── arrow ────────────────────────────────────────────────────────────────────

describe('arrow', () => {
  beforeEach(() => setViewport());

  it('provides x data for vertical placements', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [arrow({ element: makeArrow({ height: 10, width: 10 }) })],
      placement: 'bottom',
    });

    expect(result.middlewareData.arrow).toEqual({ centerOffset: 0, x: 35 });
  });

  it('provides y data for horizontal placements', () => {
    const { floating, reference } = makeElements({ height: 100, width: 40, x: 300, y: 200 }, { height: 80, width: 30 });
    const result = computePosition(reference, floating, {
      middleware: [arrow({ element: makeArrow({ height: 10, width: 10 }) })],
      placement: 'right',
    });

    expect(result.middlewareData.arrow).toEqual({ centerOffset: 0, y: 35 });
  });

  it('clamps arrow x when padding forces it away from ideal position', () => {
    // Ref is 5px wide; bottom-start aligns float.x to ref.x → ideal arrow x is
    // ref_center_relative_to_float = 2.5 - 5(half-arrow) = -2.5, below minX=10.
    // Arrow must be clamped to 10 and centerOffset should be non-zero.
    const { floating, reference } = makeElements({ height: 40, width: 5, x: 200, y: 300 }, { height: 30, width: 100 });
    const result = computePosition(reference, floating, {
      middleware: [arrow({ element: makeArrow({ height: 10, width: 10 }), padding: 10 })],
      placement: 'bottom-start',
    });
    const arrowData = result.middlewareData.arrow!;

    expect(arrowData.x).toBeGreaterThanOrEqual(10);
    expect(arrowData.centerOffset).not.toBe(0); // clamped away from ideal
  });
});

// ─── hide ─────────────────────────────────────────────────────────────────────

describe('hide', () => {
  beforeEach(() => setViewport());

  it('reports referenceHidden and escaped when reference is off-screen (strategy: both)', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: -140, y: 300 },
      { height: 30, width: 80 },
    );
    const result = computePosition(reference, floating, { middleware: [hide()], placement: 'bottom' });

    expect(result.middlewareData.hide?.referenceHidden).toBe(true);
    expect(result.middlewareData.hide?.escaped).toBe(true);
    expect(result.middlewareData.hide?.referenceHiddenOffsets).toBeDefined();
    expect(result.middlewareData.hide?.escapedOffsets).toBeDefined();
  });

  it('only computes referenceHidden with strategy: referenceHidden', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: -140, y: 300 },
      { height: 30, width: 80 },
    );
    const result = computePosition(reference, floating, {
      middleware: [hide({ strategy: 'referenceHidden' })],
      placement: 'bottom',
    });

    expect(result.middlewareData.hide?.referenceHidden).toBe(true);
    expect(result.middlewareData.hide?.escaped).toBeUndefined();
    expect(result.middlewareData.hide?.escapedOffsets).toBeUndefined();
  });

  it('only computes escaped with strategy: escaped', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 950, y: 300 },
      { height: 30, width: 200 },
    );
    const result = computePosition(reference, floating, {
      middleware: [offset(100), hide({ strategy: 'escaped' })],
      placement: 'right',
    });

    expect(result.middlewareData.hide?.escaped).toBe(true);
    expect(result.middlewareData.hide?.referenceHidden).toBeUndefined();
    expect(result.middlewareData.hide?.referenceHiddenOffsets).toBeUndefined();
  });

  it('reports escaped when the floating element is fully clipped', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 950, y: 300 },
      { height: 30, width: 200 },
    );
    const result = computePosition(reference, floating, {
      middleware: [offset(100), hide()],
      placement: 'right',
    });

    expect(result.middlewareData.hide).toMatchObject({ escaped: true });
  });
});

// ─── autoUpdate ───────────────────────────────────────────────────────────────

describe('autoUpdate', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls update immediately on registration', () => {
    const { floating, reference } = makeElements({}, {});
    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update);

    expect(update).toHaveBeenCalledOnce();
    cleanup();
  });

  it('removes scroll, resize, and visualViewport listeners on cleanup', () => {
    setViewport();

    const { floating, reference } = makeElements({}, {});
    const update = vi.fn();
    const windowAddSpy = vi.spyOn(window, 'addEventListener');
    const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');
    const vv = window.visualViewport!;
    const vvAddSpy = vi.spyOn(vv, 'addEventListener');
    const vvRemoveSpy = vi.spyOn(vv, 'removeEventListener');
    const cleanup = autoUpdate(reference, floating, update);

    const addedWindowTypes = windowAddSpy.mock.calls.map((c) => c[0]);
    const addedVvTypes = vvAddSpy.mock.calls.map((c) => c[0]);

    cleanup();

    const removedWindowTypes = windowRemoveSpy.mock.calls.map((c) => c[0]);
    const removedVvTypes = vvRemoveSpy.mock.calls.map((c) => c[0]);

    for (const type of addedWindowTypes) {
      expect(removedWindowTypes).toContain(type);
    }

    for (const type of addedVvTypes) {
      expect(removedVvTypes).toContain(type);
    }
  });

  it('supports animation frame updates', () => {
    const { floating, reference } = makeElements({}, {});
    const update = vi.fn();
    let frameCallback: FrameRequestCallback | undefined;

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      frameCallback = cb;

      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const cleanup = autoUpdate(reference, floating, update, { animationFrame: true });

    frameCallback?.(16);
    expect(update).toHaveBeenCalledTimes(2);
    cleanup();
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
  });

  it('throttles update calls when throttle option is set', () => {
    vi.useFakeTimers();

    const { floating, reference } = makeElements({}, {});
    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update, { throttle: 100 });

    // Leading call happens immediately
    expect(update).toHaveBeenCalledTimes(1);

    // Simulate rapid scroll events (all within the throttle window)
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    // No additional calls fired yet
    expect(update).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);

    // Trailing call fires after throttle window
    expect(update).toHaveBeenCalledTimes(2);

    cleanup();
    vi.useRealTimers();
  });

  it('does not fire the trailing call after cleanup', () => {
    vi.useFakeTimers();

    const { floating, reference } = makeElements({}, {});
    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update, { throttle: 100 });

    // Queue a trailing call
    window.dispatchEvent(new Event('scroll'));
    expect(update).toHaveBeenCalledTimes(1);

    // Clean up before the trailing timeout fires
    cleanup();
    vi.advanceTimersByTime(200);

    // The trailing call must not fire
    expect(update).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('works with virtual references', () => {
    const virtualReference = makeVirtualReference({ height: 40, width: 100, x: 200, y: 300 });
    const floating = document.createElement('div');
    const update = vi.fn();

    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 80 }));

    const cleanup = autoUpdate(virtualReference, floating, update);

    expect(update).toHaveBeenCalledOnce();
    cleanup();
  });
});

// ─── float ────────────────────────────────────────────────────────────────────

describe('float', () => {
  beforeEach(() => setViewport());

  it('applies default left/top styles immediately', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const cleanup = float(reference, floating, { placement: 'bottom' });

    expect(floating.style.left).toBe('210px');
    expect(floating.style.top).toBe('340px');
    cleanup();
  });

  it('supports a custom apply function', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const apply = vi.fn();
    const cleanup = float(reference, floating, { apply, middleware: [hide()] });

    expect(apply).toHaveBeenCalledOnce();
    expect(apply.mock.calls[0][0]).toMatchObject({ placement: 'bottom', x: 210, y: 340 });
    expect(apply.mock.calls[0][0].middlewareData.hide).toBeDefined();
    cleanup();
  });

  it('positions once and returns a no-op cleanup when autoUpdate: false', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const cleanup = float(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(floating.style.left).toBe('210px');
    expect(() => cleanup()).not.toThrow();
  });

  it('accepts nested autoUpdate options', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const cleanup = float(reference, floating, {
      autoUpdate: { animationFrame: false, observeFloating: false },
      placement: 'bottom',
    });

    expect(floating.style.left).toBe('210px');
    cleanup();
  });

  it('uses JS path (not CSS anchor) when a custom apply is provided with preferCssAnchor', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const apply = vi.fn();
    const cleanup = float(reference, floating, { apply, placement: 'top', preferCssAnchor: true });

    // custom apply must be called because CSS anchor path is bypassed
    expect(apply).toHaveBeenCalledOnce();
    cleanup();
  });
});

// ─── Custom middleware ────────────────────────────────────────────────────────

describe('custom middleware', () => {
  it('can modify coordinates and return data', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const snap =
      (grid: number): Middleware =>
      ({ x, y }) => ({
        data: { snap: { grid } },
        x: Math.round(x / grid) * grid,
        y: Math.round(y / grid) * grid,
      });

    const result = computePosition(reference, floating, {
      middleware: [snap(10)],
      placement: 'bottom',
    });

    expect(result.x % 10).toBe(0);
    expect(result.y % 10).toBe(0);
    expect(result.middlewareData.snap).toEqual({ grid: 10 });
  });

  it('supports reset: true (simple restart)', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    let callCount = 0;
    const onceMiddleware: Middleware = () => {
      callCount += 1;

      if (callCount === 1) return { reset: true };
    };

    expect(() =>
      computePosition(reference, floating, { middleware: [onceMiddleware], placement: 'bottom' }),
    ).not.toThrow();
    expect(callCount).toBe(2);
  });
});

// ─── Composed middleware data ─────────────────────────────────────────────────

describe('middleware data composition', () => {
  beforeEach(() => setViewport());

  it('contains arrow and hide data after composition', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: -140, y: 300 },
      { height: 30, width: 80 },
    );
    const result = computePosition(reference, floating, {
      middleware: [arrow({ element: makeArrow({ height: 10, width: 10 }) }), hide()],
      placement: 'bottom',
    });

    expect(result.middlewareData.arrow?.centerOffset).toBeTypeOf('number');
    expect(result.middlewareData.hide?.referenceHidden).toBe(true);
  });

  it('contains size data when size middleware is included', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [flip(), shift(), size()],
      placement: 'bottom',
    });

    expect(result.middlewareData.size).toMatchObject({
      availableHeight: expect.any(Number),
      availableWidth: expect.any(Number),
    });
  });
});

// ─── presets ─────────────────────────────────────────────────────────────────

describe('presets', () => {
  it('tooltip() returns a valid preset with placement and middleware', () => {
    const preset = presets.tooltip();

    expect(preset.placement).toBeTypeOf('string');
    expect(Array.isArray(preset.middleware)).toBe(true);
    expect(preset.middleware.length).toBeGreaterThan(0);
  });

  it('dropdown() returns a valid preset with placement and middleware', () => {
    const preset = presets.dropdown();

    expect(preset.placement).toBeTypeOf('string');
    expect(Array.isArray(preset.middleware)).toBe(true);
  });

  it('dropdown() includes offset middleware when offset option is provided', () => {
    const withOffset = presets.dropdown({ offset: 8 });
    const withoutOffset = presets.dropdown();

    expect(withOffset.middleware.length).toBeGreaterThan(withoutOffset.middleware.length);
  });

  it('popover() returns a valid preset', () => {
    const preset = presets.popover();

    expect(preset.placement).toBeTypeOf('string');
    expect(Array.isArray(preset.middleware)).toBe(true);
  });

  it('contextMenu() returns a valid preset', () => {
    const preset = presets.contextMenu();

    expect(preset.placement).toBeTypeOf('string');
    expect(Array.isArray(preset.middleware)).toBe(true);
  });

  it('contextMenu() includes offset middleware when offset option is provided', () => {
    const withOffset = presets.contextMenu({ offset: 8 });
    const withoutOffset = presets.contextMenu();

    expect(withOffset.middleware.length).toBeGreaterThan(withoutOffset.middleware.length);
  });

  it('contextMenu() respects a custom placement override', () => {
    expect(presets.contextMenu({ placement: 'top-start' }).placement).toBe('top-start');
  });

  it('presets can be spread into computePosition options', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    setViewport();

    expect(() => computePosition(reference, floating, { ...presets.tooltip() })).not.toThrow();
  });
});
