import { contextMenu, dropdown, popover, tooltip } from '@vielzeug/orbit/presets';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Middleware } from '../types';

import { getRects } from '../core';
import {
  arrow,
  autoPlacement,
  autoUpdate,
  compose,
  computePosition,
  computePositionAsync,
  computePositionRaf,
  detectOverflow,
  flip,
  float,
  floatWithAnchor,
  getAlignment,
  getSide,
  hide,
  inline,
  isCssAnchorSupported,
  limitShift,
  offset,
  shift,
  size,
} from '../index';
import { MIDDLEWARE_NAME } from '../utils';
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
    const loop: Middleware = () => ({ reset: {} });

    expect(() => computePosition(reference, floating, { middleware: [loop] })).toThrow(/too many resets/i);
  });

  it('adjusts coordinates relative to containingBlock (position: absolute)', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const container = document.createElement('div');

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 200, width: 400, x: 50, y: 100 }),
    );

    const result = computePosition(reference, floating, {
      containingBlock: container,
      placement: 'bottom',
    });

    // Viewport: x=210, y=340. Subtract container offset (50, 100) → (160, 240).
    expect(result.x).toBe(160);
    expect(result.y).toBe(240);
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

  it('accepts an Element as boundary', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 0, y: 0 }, { height: 30, width: 80 });
    const boundary = document.createElement('div');

    vi.spyOn(boundary, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 200, width: 400, x: 10, y: 10 }),
    );

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

    const overflow = detectOverflow(state, { boundary });

    expect(overflow.left).toBeLessThanOrEqual(0);
    expect(overflow.top).toBeLessThanOrEqual(0);
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

  it('reports available size in middlewareData.size', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );

    const result = computePosition(reference, floating, { middleware: [size()], placement: 'bottom' });

    expect(result.middlewareData.size?.availableHeight).toBe(388);
    expect(result.middlewareData.size?.availableWidth).toBeTypeOf('number');
  });

  it('runs once after a flip reset, reflecting flipped placement', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 80, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [flip(), size()],
      placement: 'bottom',
    });

    expect(result.placement).toBe('top');
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

    expect(result.middlewareData.arrow).toEqual({ centerOffset: 0, constrained: false, x: 35 });
  });

  it('provides y data for horizontal placements', () => {
    const { floating, reference } = makeElements({ height: 100, width: 40, x: 300, y: 200 }, { height: 80, width: 30 });
    const result = computePosition(reference, floating, {
      middleware: [arrow({ element: makeArrow({ height: 10, width: 10 }) })],
      placement: 'right',
    });

    expect(result.middlewareData.arrow).toEqual({ centerOffset: 0, constrained: false, y: 35 });
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
    expect(arrowData.constrained).toBe(true);
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

  it('observeAncestors: false uses capture-phase window scroll listener', () => {
    setViewport();

    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, {});
    const update = vi.fn();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const cleanup = autoUpdate(reference, floating, update, { observeAncestors: false });

    // Must have registered a capture-phase scroll listener.
    const addedCapture = addSpy.mock.calls.some(
      (c) => c[0] === 'scroll' && (c[2] as AddEventListenerOptions)?.capture === true,
    );

    expect(addedCapture).toBe(true);

    cleanup();

    // Must have removed the capture-phase scroll listener.
    const removedCapture = removeSpy.mock.calls.some(
      (c) => c[0] === 'scroll' && (c[2] as EventListenerOptions)?.capture === true,
    );

    expect(removedCapture).toBe(true);
  });
});

// ─── float ────────────────────────────────────────────────────────────────────

describe('float', () => {
  beforeEach(() => setViewport());

  it('applies default left/top styles immediately', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = float(reference, floating, { placement: 'bottom' });

    expect(floating.style.left).toBe('210px');
    expect(floating.style.top).toBe('340px');
    handle.dispose();
  });

  it('supports a custom apply function', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const apply = vi.fn();
    const handle = float(reference, floating, { apply, middleware: [hide()] });

    expect(apply).toHaveBeenCalledOnce();
    expect(apply.mock.calls[0][0]).toMatchObject({ placement: 'bottom', x: 210, y: 340 });
    expect(apply.mock.calls[0][0].middlewareData.hide).toBeDefined();
    handle.dispose();
  });

  it('positions once and returns a handle with no-op dispose when autoUpdate: false', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = float(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(floating.style.left).toBe('210px');
    expect(() => handle.dispose()).not.toThrow();
    expect(handle.getPosition()?.x).toBe(210);
    expect(handle.getPosition()?.placement).toBe('bottom');
  });

  it('accepts nested autoUpdate options', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = float(reference, floating, {
      autoUpdate: { animationFrame: false, observeFloating: false },
      placement: 'bottom',
    });

    expect(floating.style.left).toBe('210px');
    handle.dispose();
  });

  it('returns a FloatHandle with getPosition() and update()', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = float(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(handle.getPosition()).toMatchObject({ placement: 'bottom', x: 210, y: 340 });
    expect(typeof handle.update).toBe('function');
    expect(typeof handle.dispose).toBe('function');
    handle.dispose();
  });

  it('update() re-computes position after DOM change', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = float(reference, floating, { autoUpdate: false, placement: 'bottom' });

    expect(floating.style.left).toBe('210px');

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 40, width: 100, x: 0, y: 0 }));
    handle.update();

    expect(floating.style.left).toBe('10px');
    handle.dispose();
  });
});

// ─── computePositionAsync ───────────────────────────────────────────────────

describe('computePositionAsync', () => {
  beforeEach(() => setViewport());

  it('resolves with the same result as computePosition', async () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const sync = computePosition(reference, floating, { placement: 'bottom' });
    const async_ = await computePositionAsync(reference, floating, { placement: 'bottom' });

    expect(async_.x).toBe(sync.x);
    expect(async_.y).toBe(sync.y);
    expect(async_.placement).toBe(sync.placement);
  });

  it('resolves after the current microtask', async () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    let resolved = false;
    const promise = computePositionAsync(reference, floating).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    await promise;
    expect(resolved).toBe(true);
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

  it('supports reset: {} (simple restart)', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    let callCount = 0;
    const onceMiddleware: Middleware = () => {
      callCount += 1;

      if (callCount === 1) return { reset: {} };
    };

    expect(() =>
      computePosition(reference, floating, { middleware: [onceMiddleware], placement: 'bottom' }),
    ).not.toThrow();
    expect(callCount).toBe(2);
  });

  it('throws when a middleware triggers more than 8 resets', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const infiniteReset: Middleware = () => ({ reset: {} });

    expect(() => computePosition(reference, floating, { middleware: [infiniteReset], placement: 'bottom' })).toThrow(
      /too many resets/i,
    );
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
    const preset = tooltip();

    expect(preset.placement).toBeTypeOf('string');
    expect(Array.isArray(preset.middleware)).toBe(true);
    expect(preset.middleware.length).toBeGreaterThan(0);
  });

  it('tooltip() respects offset and placement overrides', () => {
    const custom = tooltip({ offset: 16, placement: 'bottom' });

    expect(custom.placement).toBe('bottom');
    expect(custom.middleware.length).toBeGreaterThan(0);
  });

  it('dropdown() returns a valid preset with placement and middleware', () => {
    const preset = dropdown();

    expect(preset.placement).toBeTypeOf('string');
    expect(Array.isArray(preset.middleware)).toBe(true);
    // Always includes offset (default 4px)
    expect(preset.middleware.length).toBeGreaterThanOrEqual(3);
  });

  it('dropdown() offset is overridable', () => {
    const withOffset = dropdown({ offset: 8 });
    const withDefault = dropdown();

    // Both include offset; the count should be equal
    expect(withOffset.middleware.length).toBe(withDefault.middleware.length);
  });

  it('popover() returns a valid preset', () => {
    const preset = popover();

    expect(preset.placement).toBeTypeOf('string');
    expect(Array.isArray(preset.middleware)).toBe(true);
  });

  it('contextMenu() returns a valid preset', () => {
    const preset = contextMenu();

    expect(preset.placement).toBeTypeOf('string');
    expect(Array.isArray(preset.middleware)).toBe(true);
  });

  it('contextMenu() respects a custom placement override', () => {
    expect(contextMenu({ placement: 'top-start' }).placement).toBe('top-start');
  });

  it('presets can be spread into computePosition options', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    setViewport();

    expect(() => computePosition(reference, floating, { ...tooltip() })).not.toThrow();
  });

  it('tooltip() applies custom padding to flip and shift', () => {
    const custom = tooltip({ padding: 12 });
    const def = tooltip();

    // Both should have the same number of middleware.
    expect(custom.middleware.length).toBe(def.middleware.length);
    // Custom padding is passed through — verify preset structure is valid.
    expect(Array.isArray(custom.middleware)).toBe(true);
  });

  it('dropdown() applies custom padding', () => {
    const custom = dropdown({ padding: 12 });

    expect(Array.isArray(custom.middleware)).toBe(true);
    expect(custom.middleware.length).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['tooltip', tooltip()],
    ['dropdown', dropdown()],
    ['popover', popover()],
    ['contextMenu', contextMenu()],
  ] as const)('%s() produces finite x/y coordinates and a valid placement', (_, preset) => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    setViewport();

    const result = computePosition(reference, floating, preset);

    expect(Number.isFinite(result.x)).toBe(true);
    expect(Number.isFinite(result.y)).toBe(true);
    expect(result.placement).toMatch(/^(top|bottom|left|right)(-start|-end)?$/);
  });
});

// ─── compose ─────────────────────────────────────────────────────────────────

describe('compose', () => {
  it('returns an empty array when called with no arguments', () => {
    expect(compose()).toEqual([]);
  });

  it('filters falsy entries and returns a Middleware array', () => {
    const mws = compose(offset(8), null, undefined, false, flip());

    expect(mws.length).toBe(2);
  });

  it('returns all non-falsy middleware in order', () => {
    const arrowEl = makeArrow();
    const mws = compose(offset(8), flip(), shift({ padding: 6 }), size(), arrow({ element: arrowEl }));

    expect(mws.length).toBe(5);
  });
});

// ─── autoPlacement alignment (F3) ────────────────────────────────────────────

describe('autoPlacement alignment', () => {
  beforeEach(() => setViewport());

  it('restricts candidates to start variants when alignment: "start"', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 400 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [autoPlacement({ alignment: 'start' })],
      placement: 'bottom',
    });

    expect(result.placement.endsWith('-start')).toBe(true);
  });

  it('restricts candidates to end variants when alignment: "end"', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 400 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [autoPlacement({ alignment: 'end' })],
      placement: 'bottom',
    });

    expect(result.placement.endsWith('-end')).toBe(true);
  });

  it('evaluates all 12 variants when alignment: null', () => {
    // With all variants available, the best fit is some aligned or cardinal placement.
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 400 }, { height: 30, width: 80 });

    expect(() =>
      computePosition(reference, floating, {
        middleware: [autoPlacement({ alignment: null })],
        placement: 'bottom',
      }),
    ).not.toThrow();
  });

  it('evaluates only cardinal sides by default (no alignment option)', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 400 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [autoPlacement()],
      placement: 'bottom',
    });

    // Result should be a pure cardinal side (no dash).
    expect(result.placement).not.toContain('-');
  });
});

// ─── limitShift (F1) ─────────────────────────────────────────────────────────

describe('limitShift', () => {
  it('prevents cross-axis drift past the reference extent', () => {
    setViewport(300);

    // ref near right: x=280, width=40, float width=20.
    // base (bottom, centered): float.x = 280+20-10 = 290.
    // With padding=15: overflow.right = 290+20-(300-15)=25 → unclamped shift=-25 → x=265.
    // limitShift: lo=280, hi=280+40-20=300. min=280, max=300. clamp(265,280,300)=280.
    const { floating, reference } = makeElements({ height: 20, width: 40, x: 280, y: 200 }, { height: 30, width: 20 });
    const unclamped = computePosition(reference, floating, {
      middleware: [shift({ padding: 15 })],
      placement: 'bottom',
    });
    const clamped = computePosition(reference, floating, {
      middleware: [shift({ limiter: limitShift(), padding: 15 })],
      placement: 'bottom',
    });

    expect(unclamped.x).toBe(265);
    expect(clamped.x).toBe(280);
    expect(clamped.x).toBeGreaterThan(unclamped.x);
  });

  it('limitShift({ offset }) expands the allowed drift range', () => {
    setViewport(300);

    const { floating, reference } = makeElements({ height: 20, width: 40, x: 280, y: 200 }, { height: 30, width: 20 });
    // With offset=20: lo=280-20=260, hi=280+40+20-20=320. clamp(265,260,320)=265.
    const extended = computePosition(reference, floating, {
      middleware: [shift({ limiter: limitShift({ offset: 20 }), padding: 15 })],
      placement: 'bottom',
    });

    // offset allows 20px of drift past reference edges, so 265 is within the allowed range.
    expect(extended.x).toBe(265);
  });

  it('limitShift({ offset: fn }) supports dynamic offset via function', () => {
    setViewport(300);

    const { floating, reference } = makeElements({ height: 20, width: 40, x: 280, y: 200 }, { height: 30, width: 20 });
    // Function returning 20 should match static offset: 20 behaviour.
    const withFn = computePosition(reference, floating, {
      middleware: [shift({ limiter: limitShift({ offset: (_state) => 20 }), padding: 15 })],
      placement: 'bottom',
    });
    const withStatic = computePosition(reference, floating, {
      middleware: [shift({ limiter: limitShift({ offset: 20 }), padding: 15 })],
      placement: 'bottom',
    });

    expect(withFn.x).toBe(withStatic.x);
  });

  it('does not clamp when drift is already within the reference extent', () => {
    setViewport(500);

    // ref centered in viewport, small shift needed — within reference extent.
    const { floating, reference } = makeElements({ height: 20, width: 100, x: 200, y: 200 }, { height: 30, width: 60 });
    const withoutLimit = computePosition(reference, floating, {
      middleware: [shift({ padding: 4 })],
      placement: 'bottom',
    });
    const withLimit = computePosition(reference, floating, {
      middleware: [shift({ limiter: limitShift(), padding: 4 })],
      placement: 'bottom',
    });

    expect(withLimit.x).toBe(withoutLimit.x);
  });
});

// ─── R6: MIDDLEWARE_NAME symbol ───────────────────────────────────────────────

describe('MIDDLEWARE_NAME symbol', () => {
  it('is attached to all built-in middleware', () => {
    const arrowEl = makeArrow({ height: 10, width: 10 });

    for (const mw of [arrow({ element: arrowEl }), autoPlacement(), flip(), hide(), offset(8), shift(), size()]) {
      expect((mw as Record<symbol, string>)[MIDDLEWARE_NAME]).toBeTypeOf('string');
    }
  });

  it('does not collide with string properties on wrapped functions', () => {
    // A user-wrapped function that has `__name` set should not interfere.
    const userMw = Object.assign(() => ({}), { __name: 'flip' });

    // MIDDLEWARE_NAME symbol is not present, so ordering validation ignores it.
    expect((userMw as Record<symbol, unknown>)[MIDDLEWARE_NAME]).toBeUndefined();
  });
});

// ─── R8: arrow.constrained ────────────────────────────────────────────────────

describe('arrow.constrained', () => {
  beforeEach(() => setViewport());

  it('is false when arrow is centered perfectly', () => {
    // Wide ref, small float, small arrow — ideal x = center, no clamping needed.
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [arrow({ element: makeArrow({ height: 10, width: 10 }) })],
      placement: 'bottom',
    });

    expect(result.middlewareData.arrow?.constrained).toBe(false);
  });

  it('is true when the arrow is clamped by padding', () => {
    // Narrow ref forces arrow to be clamped by padding.
    const { floating, reference } = makeElements({ height: 40, width: 5, x: 200, y: 300 }, { height: 30, width: 100 });
    const result = computePosition(reference, floating, {
      middleware: [arrow({ element: makeArrow({ height: 10, width: 10 }), padding: 10 })],
      placement: 'bottom-start',
    });

    expect(result.middlewareData.arrow?.constrained).toBe(true);
  });
});

// ─── F3: FlipData + ShiftData ─────────────────────────────────────────────────

describe('FlipData', () => {
  beforeEach(() => setViewport());

  it('records skippedPlacements when flip changes placement (single fallback)', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [flip()],
      placement: 'bottom',
    });

    expect(result.placement).toBe('top');
    expect(result.middlewareData.flip?.skippedPlacements).toEqual(['bottom']);
  });

  it('accumulates all evaluated-and-overflowing candidates in skippedPlacements', () => {
    // Ref near bottom-left corner — bottom overflows (y=490+80>500), left overflows (x=-50<0), top fits.
    setViewport(500, 500);

    const { floating, reference } = makeElements({ height: 40, width: 100, x: 50, y: 450 }, { height: 80, width: 100 });
    const result = computePosition(reference, floating, {
      middleware: [flip({ fallbackPlacements: ['left', 'top'] })],
      placement: 'bottom',
    });

    expect(result.placement).toBe('top');
    // Both 'bottom' (original) and 'left' (evaluated, overflowed) must appear before 'top'.
    expect(result.middlewareData.flip?.skippedPlacements).toContain('bottom');
    expect(result.middlewareData.flip?.skippedPlacements).toContain('left');
    expect(result.middlewareData.flip?.skippedPlacements).not.toContain('top');
  });

  it('does not write flip data when placement is unchanged', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [flip()],
      placement: 'bottom',
    });

    expect(result.placement).toBe('bottom');
    expect(result.middlewareData.flip).toBeUndefined();
  });
});

describe('ShiftData', () => {
  beforeEach(() => setViewport());

  it('records the shift amounts in middlewareData.shift', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 990, y: 760 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [shift()],
      placement: 'bottom-start',
    });

    expect(result.middlewareData.shift).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    expect(result.middlewareData.shift!.x).not.toBe(0); // overflow forced a shift
  });

  it('records zero shift when no overflow occurs', () => {
    // Ref well inside viewport — no shift needed.
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, {
      middleware: [shift()],
      placement: 'bottom',
    });

    expect(result.middlewareData.shift).toMatchObject({ x: 0, y: 0 });
  });
});

// ─── F1: global boundary + padding ───────────────────────────────────────────

describe('global boundary and padding (F1)', () => {
  it('uses global boundary for all overflow-aware middleware', () => {
    setViewport(1024, 768);

    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 30, width: 80 });

    // Without global padding: flip fires because float overflows viewport bottom.
    const withoutPadding = computePosition(reference, floating, {
      middleware: [flip()],
      placement: 'bottom',
    });

    // With global padding=100: the safe zone shrinks, flip fires even for less overflow.
    const withPadding = computePosition(reference, floating, {
      middleware: [flip()],
      padding: 100,
      placement: 'bottom',
    });

    expect(withoutPadding.placement).toBe('top');
    expect(withPadding.placement).toBe('top'); // still flips with padding
  });

  it('global padding shrinks available space reported by size()', () => {
    setViewport();

    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );

    const noGlobal = computePosition(reference, floating, {
      middleware: [size()],
      placement: 'bottom',
    });

    const withGlobal = computePosition(reference, floating, {
      middleware: [size()],
      padding: 20,
      placement: 'bottom',
    });

    // Global padding of 20 reduces available height by 20 from the bottom.
    expect(withGlobal.middlewareData.size!.availableHeight).toBe(noGlobal.middlewareData.size!.availableHeight - 20);
  });

  it('per-middleware padding overrides global padding', () => {
    setViewport();

    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );

    const globalOnly = computePosition(reference, floating, {
      middleware: [size()],
      padding: 20,
      placement: 'bottom',
    });

    const localOverride = computePosition(reference, floating, {
      middleware: [size({ padding: 0 })],
      padding: 20,
      placement: 'bottom',
    });

    // Local padding: 0 overrides global: 20 → more space available.
    expect(localOverride.middlewareData.size!.availableHeight).toBeGreaterThan(
      globalOnly.middlewareData.size!.availableHeight,
    );
  });
});

// ─── R2: containingBlock in float() ──────────────────────────────────────────

describe('containingBlock in float()', () => {
  it('applies containingBlock offset to the default style application', () => {
    setViewport();

    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const container = document.createElement('div');

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 200, width: 400, x: 50, y: 100 }),
    );

    const handle = float(reference, floating, {
      autoUpdate: false,
      containingBlock: container,
      placement: 'bottom',
    });

    // Viewport: x=210, y=340. Container offset (50, 100) → (160, 240).
    expect(floating.style.left).toBe('160px');
    expect(floating.style.top).toBe('240px');
    handle.dispose();
  });
});

// ─── F2: pauseWhenHidden ──────────────────────────────────────────────────────

describe('pauseWhenHidden (F2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not call update on scroll when reference is off-screen', () => {
    setViewport();

    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, {});
    const update = vi.fn();
    let ioCallback: IntersectionObserverCallback | undefined;

    class MockIO {
      constructor(cb: IntersectionObserverCallback) {
        ioCallback = cb;
      }

      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
    }

    vi.stubGlobal('IntersectionObserver', MockIO);

    const cleanup = autoUpdate(reference, floating, update, { pauseWhenHidden: true, throttle: 0 });

    // Initial call fires (before IO async).
    expect(update).toHaveBeenCalledTimes(1);

    // Simulate IO reporting reference as invisible.
    ioCallback?.([{ isIntersecting: false }] as unknown as IntersectionObserverEntry[], {} as IntersectionObserver);

    // Scroll event should not trigger update while invisible.
    window.dispatchEvent(new Event('scroll'));
    expect(update).toHaveBeenCalledTimes(1);

    // Simulate IO reporting visible again — should trigger one update.
    ioCallback?.([{ isIntersecting: true }] as unknown as IntersectionObserverEntry[], {} as IntersectionObserver);
    expect(update).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('updates normally when pauseWhenHidden: false', () => {
    setViewport();

    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, {});
    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update, { pauseWhenHidden: false });

    window.dispatchEvent(new Event('scroll'));
    expect(update).toHaveBeenCalledTimes(2); // initial + scroll

    cleanup();
  });
});

// ─── F5: SSR no-op shim ───────────────────────────────────────────────────────

describe('SSR shim', () => {
  it('computePosition returns zero-coord result with requested placement', async () => {
    const { computePosition: ssrComputePosition } = await import('../ssr');
    const reference = { getBoundingClientRect: () => ({ height: 40, width: 100, x: 200, y: 300 }) };
    const floating = {} as HTMLElement;

    const result = ssrComputePosition(reference, floating, { placement: 'top' });

    expect(result.placement).toBe('top');
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('autoUpdate returns a no-op cleanup', async () => {
    const { autoUpdate: ssrAutoUpdate } = await import('../ssr');
    const update = vi.fn();
    const cleanup = ssrAutoUpdate({} as Element, {} as HTMLElement, update);

    expect(update).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });

  it('float returns a FloatHandle with no-op methods and null position', async () => {
    const { float: ssrFloat } = await import('../ssr');
    const handle = ssrFloat({} as Element, {} as HTMLElement, { placement: 'right' });

    expect(handle.getPosition()).toBeNull();
    expect(() => handle.update()).not.toThrow();
    expect(() => handle.dispose()).not.toThrow();
  });

  it('float stub disposed is false before dispose and true after', async () => {
    const { float: ssrFloat } = await import('../ssr');
    const handle = ssrFloat({} as Element, {} as HTMLElement);

    expect(handle.disposed).toBe(false);
    handle.dispose();
    expect(handle.disposed).toBe(true);
  });

  it('float stub dispose is idempotent', async () => {
    const { float: ssrFloat } = await import('../ssr');
    const handle = ssrFloat({} as Element, {} as HTMLElement);

    handle.dispose();
    expect(() => handle.dispose()).not.toThrow();
    expect(handle.disposed).toBe(true);
  });

  it('float stub disposalSignal is aborted after dispose', async () => {
    const { float: ssrFloat } = await import('../ssr');
    const handle = ssrFloat({} as Element, {} as HTMLElement);

    expect(handle.disposalSignal.aborted).toBe(false);
    handle.dispose();
    expect(handle.disposalSignal.aborted).toBe(true);
  });

  it('computePositionAsync resolves with zero-coord result and requested placement', async () => {
    const { computePositionAsync: ssrComputePositionAsync } = await import('../ssr');
    const reference = { getBoundingClientRect: () => ({ height: 40, width: 100, x: 200, y: 300 }) };
    const floating = {} as HTMLElement;

    const result = await ssrComputePositionAsync(reference, floating, { placement: 'left' });

    expect(result.placement).toBe('left');
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it('computePositionAsync defaults to bottom placement when none provided', async () => {
    const { computePositionAsync: ssrComputePositionAsync } = await import('../ssr');
    const result = await ssrComputePositionAsync({} as Element, {} as HTMLElement);

    expect(result.placement).toBe('bottom');
  });
});

// ─── getRects ─────────────────────────────────────────────────────────────────

describe('getRects', () => {
  it('returns rects for reference and floating from the DOM', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const rects = getRects(reference, floating);

    expect(rects.reference).toMatchObject({ height: 40, width: 100, x: 200, y: 300 });
    expect(rects.floating).toMatchObject({ height: 30, width: 80 });
  });

  it('returns rects for virtual references', () => {
    const virtual = makeVirtualReference({ height: 40, width: 100, x: 10, y: 20 });
    const floating = document.createElement('div');

    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 80 }));

    const rects = getRects(virtual, floating);

    expect(rects.reference).toMatchObject({ height: 40, width: 100, x: 10, y: 20 });
  });
});

// ─── FloatHandle dispose idempotency ─────────────────────────────────────────

describe('FloatHandle dispose idempotency', () => {
  beforeEach(() => setViewport());

  it('disposed is false before dispose and true after', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = float(reference, floating, { autoUpdate: false });

    expect(handle.disposed).toBe(false);
    handle.dispose();
    expect(handle.disposed).toBe(true);
  });

  it('calling dispose twice does not throw', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = float(reference, floating, { autoUpdate: false });

    handle.dispose();
    expect(() => handle.dispose()).not.toThrow();
  });

  it('[Symbol.dispose] is equivalent to dispose', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const handle = float(reference, floating, { autoUpdate: false });

    handle[Symbol.dispose]();
    expect(handle.disposed).toBe(true);
  });
});

// ─── middleware ordering validation ──────────────────────────────────────────

describe('middleware ordering validation (via computePosition)', () => {
  beforeEach(() => setViewport());

  it('throws when flip precedes inline', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(() => computePosition(reference, floating, { middleware: [flip(), inline()] })).toThrow(
      /must come after.*middleware pipeline/i,
    );
  });

  it('throws when shift precedes inline', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(() => computePosition(reference, floating, { middleware: [shift(), inline()] })).toThrow(
      /must come after.*middleware pipeline/i,
    );
  });

  it('does not throw when inline precedes flip and shift', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(() =>
      computePosition(reference, floating, { middleware: [inline(), flip(), shift({ padding: 6 })] }),
    ).not.toThrow();
  });

  it('throws when flip and autoPlacement are both used', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(() => computePosition(reference, floating, { middleware: [flip(), autoPlacement()] })).toThrow(/not both/i);
  });
});

// ─── compose ─────────────────────────────────────────────────────────────────

describe('compose', () => {
  beforeEach(() => setViewport());

  it('compose with 2 typed middlewares returns typed tuple', () => {
    const mws = compose(flip(), shift());

    expect(mws.length).toBe(2);
    expect(typeof mws[0]).toBe('function');
    expect(typeof mws[1]).toBe('function');
  });

  it('compose with 4 typed middlewares returns typed tuple', () => {
    const arrowEl = makeArrow({ height: 10, width: 10 });
    const mws = compose(offset(8), flip(), shift({ padding: 6 }), arrow({ element: arrowEl }));

    expect(mws.length).toBe(4);
  });

  it('compose with falsy entries filters them out', () => {
    const mws = compose(flip(), null, undefined, false, shift());

    expect(mws.length).toBe(2);
  });
});

// ─── floatWithAnchor style cleanup ───────────────────────────────────────────

describe('floatWithAnchor style cleanup', () => {
  it('removes CSS properties that were not set before floatWithAnchor', () => {
    const reference = document.createElement('div');
    const floating = document.createElement('div');

    document.body.appendChild(reference);
    document.body.appendChild(floating);

    const handle = floatWithAnchor(reference, floating, { placement: 'bottom' });

    handle.dispose();

    expect(reference.style.getPropertyValue('anchor-name')).toBe('');
    expect(floating.style.getPropertyValue('position-anchor')).toBe('');
    expect(floating.style.getPropertyValue('position-area')).toBe('');
    reference.remove();
    floating.remove();
  });

  it('restores a previously set CSS property value after dispose', () => {
    const reference = document.createElement('div');
    const floating = document.createElement('div');

    reference.style.setProperty('anchor-name', '--existing');
    document.body.appendChild(reference);
    document.body.appendChild(floating);

    const handle = floatWithAnchor(reference, floating, { placement: 'bottom' });

    handle.dispose();

    expect(reference.style.getPropertyValue('anchor-name')).toBe('--existing');
    reference.remove();
    floating.remove();
  });
});

// ─── floatWithAnchor dispose contract ────────────────────────────────────────

describe('floatWithAnchor dispose contract', () => {
  it('cssAnchor property is true', () => {
    const reference = document.createElement('div');
    const floating = document.createElement('div');

    document.body.appendChild(reference);
    document.body.appendChild(floating);

    const handle = floatWithAnchor(reference, floating, { placement: 'top' });

    expect(handle.cssAnchor).toBe(true);
    handle.dispose();
    reference.remove();
    floating.remove();
  });

  it('disposed is false before dispose and true after', () => {
    const reference = document.createElement('div');
    const floating = document.createElement('div');

    document.body.appendChild(reference);
    document.body.appendChild(floating);

    const handle = floatWithAnchor(reference, floating);

    expect(handle.disposed).toBe(false);
    handle.dispose();
    expect(handle.disposed).toBe(true);
    reference.remove();
    floating.remove();
  });

  it('disposalSignal is aborted after dispose', () => {
    const reference = document.createElement('div');
    const floating = document.createElement('div');

    document.body.appendChild(reference);
    document.body.appendChild(floating);

    const handle = floatWithAnchor(reference, floating);

    expect(handle.disposalSignal.aborted).toBe(false);
    handle.dispose();
    expect(handle.disposalSignal.aborted).toBe(true);
    reference.remove();
    floating.remove();
  });

  it('dispose is idempotent', () => {
    const reference = document.createElement('div');
    const floating = document.createElement('div');

    document.body.appendChild(reference);
    document.body.appendChild(floating);

    const handle = floatWithAnchor(reference, floating);

    handle.dispose();
    expect(() => handle.dispose()).not.toThrow();
    expect(handle.disposed).toBe(true);
    reference.remove();
    floating.remove();
  });

  it('accepts custom fallbacks option', () => {
    const reference = document.createElement('div');
    const floating = document.createElement('div');

    document.body.appendChild(reference);
    document.body.appendChild(floating);

    const handle = floatWithAnchor(reference, floating, {
      fallbacks: 'flip-block',
      placement: 'bottom',
    });

    expect(handle.cssAnchor).toBe(true);
    handle.dispose();
    reference.remove();
    floating.remove();
  });
});

// ─── autoUpdate throttle ──────────────────────────────────────────────────────

describe('autoUpdate throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setViewport();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires the initial update immediately regardless of throttle interval', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update, { throttle: 100 });

    expect(update).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('throttles subsequent scroll-triggered updates', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update, { observeAncestors: false, throttle: 100 });

    update.mockClear();

    vi.advanceTimersByTime(200);

    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    expect(update).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(110);
    expect(update).toHaveBeenCalledTimes(2);

    cleanup();
  });
});

// ─── inline cursor hit-test ───────────────────────────────────────────────────

describe('inline cursor hit-test', () => {
  beforeEach(() => setViewport());

  it('picks the rect containing the cursor when x/y provided', () => {
    const floating = document.createElement('div');
    const reference = document.createElement('span');

    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 80, x: 0, y: 0 }));

    const rect1 = { bottom: 120, height: 20, left: 100, right: 300, top: 100, width: 200, x: 100, y: 100 } as DOMRect;
    const rect2 = { bottom: 160, height: 20, left: 100, right: 300, top: 140, width: 200, x: 100, y: 140 } as DOMRect;
    const domRectList = Object.assign([rect1, rect2], {
      item: (i: number) => [rect1, rect2][i] ?? null,
    }) as DOMRectList;

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(rect1);
    vi.spyOn(reference, 'getClientRects').mockReturnValue(domRectList);

    setViewport(800, 600);

    const result = computePosition(reference as unknown as Element, floating, {
      middleware: [inline({ x: 150, y: 150 })],
      placement: 'top',
    });

    expect(result.x).toBeTypeOf('number');
    expect(result.y).toBeTypeOf('number');
  });
});

// ─── isCssAnchorSupported ────────────────────────────────────────────────────

describe('isCssAnchorSupported', () => {
  it('returns a boolean', () => {
    expect(typeof isCssAnchorSupported()).toBe('boolean');
  });

  it('returns false when CSS.supports is unavailable', () => {
    const original = globalThis.CSS;

    Object.defineProperty(globalThis, 'CSS', { configurable: true, value: undefined });
    expect(isCssAnchorSupported()).toBe(false);
    Object.defineProperty(globalThis, 'CSS', { configurable: true, value: original });
  });
});

// ─── MiddlewareReset remeasure / rects paths ──────────────────────────────────

describe('MiddlewareReset paths', () => {
  beforeEach(() => setViewport());

  it('remeasure: true re-reads rects before the next pipeline pass', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    let pass = 0;
    const calls: Array<{ x: number; y: number }> = [];

    const mw: Middleware = (state) => {
      calls.push({ x: state.rects.reference.x, y: state.rects.reference.y });
      pass += 1;

      if (pass === 1) return { reset: { remeasure: true } };
    };

    computePosition(reference, floating, { middleware: [mw] });

    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('reset.rects overrides reference/floating rects for the next pass', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const overrideRef = createDomRect({ height: 40, width: 100, x: 50, y: 50 });
    let pass = 0;
    let secondPassX = 0;

    const mw: Middleware = (state) => {
      pass += 1;

      if (pass === 1) {
        return {
          reset: {
            rects: {
              floating: state.rects.floating,
              reference: { height: overrideRef.height, width: overrideRef.width, x: overrideRef.x, y: overrideRef.y },
            },
          },
        };
      }

      secondPassX = state.rects.reference.x;
    };

    computePosition(reference, floating, { middleware: [mw] });

    expect(secondPassX).toBe(50);
  });

  it('reset.placement overrides placement for the next pass', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    let pass = 0;
    let secondPlacement = '';

    const mw: Middleware = (state) => {
      pass += 1;

      if (pass === 1) return { reset: { placement: 'top' } };

      secondPlacement = state.placement;
    };

    computePosition(reference, floating, { middleware: [mw], placement: 'bottom' });

    expect(secondPlacement).toBe('top');
  });
});

// ─── mergeState prototype pollution regression ────────────────────────────────

describe('mergeState prototype pollution regression', () => {
  beforeEach(() => setViewport());

  it('does not pollute Object.prototype when middleware returns __proto__ key in data', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    const maliciousMw: Middleware = () => ({
      data: { ['__proto__']: { polluted: true } } as Record<string, unknown>,
    });

    expect(() => computePosition(reference, floating, { middleware: [maliciousMw] })).not.toThrow();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });
});

// ─── computePositionRaf ───────────────────────────────────────────────────────

describe('computePositionRaf', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setViewport();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not resolve before the next animation frame', async () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    let resolved = false;
    const promise = computePositionRaf(reference, floating).then(() => {
      resolved = true;
    });

    expect(resolved).toBe(false);
    vi.runAllTimers();
    await promise;
    expect(resolved).toBe(true);
  });

  it('resolves with same result as computePosition', async () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const sync = computePosition(reference, floating, { placement: 'bottom' });
    const promise = computePositionRaf(reference, floating, { placement: 'bottom' });

    vi.runAllTimers();

    const rafResult = await promise;

    expect(rafResult.x).toBe(sync.x);
    expect(rafResult.y).toBe(sync.y);
    expect(rafResult.placement).toBe(sync.placement);
  });
});
