import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  arrow,
  autoPlacement,
  autoUpdate,
  computePosition,
  detectOverflow,
  float,
  flip,
  getArrowData,
  getHideData,
  getMiddlewareData,
  hide,
  inline,
  offset,
  positionFloat,
  shift,
  size,
  type Middleware,
  type MiddlewareState,
} from './index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RectInit = { height?: number; width?: number; x?: number; y?: number };

function createDomRect(init: RectInit = {}): DOMRect {
  const x = init.x ?? 0;
  const y = init.y ?? 0;
  const width = init.width ?? 0;
  const height = init.height ?? 0;

  return {
    bottom: y + height,
    height,
    left: x,
    right: x + width,
    toJSON: () => ({}),
    top: y,
    width,
    x,
    y,
  } as DOMRect;
}

function makeElements(refInit: RectInit, floatInit: RectInit = {}) {
  const reference = document.createElement('div');
  const floating = document.createElement('div');

  vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(createDomRect(refInit));
  vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect(floatInit));

  return { floating, reference };
}

function makeArrow(init: RectInit = {}) {
  const element = document.createElement('div');

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(createDomRect(init));

  return element;
}

function makeVirtualReference(init: RectInit) {
  const rect = createDomRect(init);

  return {
    getBoundingClientRect: vi.fn(() => rect),
    getClientRects: vi.fn(() => [rect] as unknown as DOMRectList),
  };
}

function setViewport(width = 1024, height = 768) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      addEventListener: vi.fn(),
      height,
      offsetLeft: 0,
      offsetTop: 0,
      removeEventListener: vi.fn(),
      width,
    },
  });
}

function withState(
  state: Partial<MiddlewareState> &
    Pick<MiddlewareState, 'elements' | 'rects' | 'x' | 'y' | 'placement' | 'initialPlacement'>,
): MiddlewareState {
  return {
    middlewareData: {},
    ...state,
  };
}

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
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 });

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

// ─── offset ───────────────────────────────────────────────────────────────────

describe('offset', () => {
  it('moves along the main axis', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 100, y: 200 }, { height: 30, width: 80 });

    expect(computePosition(reference, floating, { middleware: [offset(8)], placement: 'bottom' }).y).toBe(248);
    expect(computePosition(reference, floating, { middleware: [offset(8)], placement: 'top' }).y).toBe(162);
    expect(computePosition(reference, floating, { middleware: [offset(8)], placement: 'left' }).x).toBe(12);
    expect(computePosition(reference, floating, { middleware: [offset(8)], placement: 'right' }).x).toBe(208);
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

  it('clamps overflowing coordinates', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 990, y: 760 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating, { middleware: [shift()], placement: 'bottom-start' });

    expect(result.x).toBe(944);
    expect(result.y).toBe(738);
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

  it('reports available height below and above', () => {
    const below = makeElements({ height: 40, width: 100, x: 200, y: 340 }, { height: 100, width: 80 });
    const above = makeElements({ height: 40, width: 100, x: 200, y: 400 }, { height: 100, width: 80 });
    let belowHeight = 0;
    let aboveHeight = 0;

    computePosition(below.reference, below.floating, {
      middleware: [size({ apply: ({ availableHeight }) => void (belowHeight = availableHeight) })],
      placement: 'bottom',
    });
    computePosition(above.reference, above.floating, {
      middleware: [size({ apply: ({ availableHeight }) => void (aboveHeight = availableHeight) })],
      placement: 'top',
    });

    expect(belowHeight).toBe(388);
    expect(aboveHeight).toBe(400);
  });

  it('respects per-side padding', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );
    let capturedHeight = 0;

    computePosition(reference, floating, {
      middleware: [
        size({ apply: ({ availableHeight }) => void (capturedHeight = availableHeight), padding: { bottom: 8 } }),
      ],
      placement: 'bottom',
    });

    expect(capturedHeight).toBe(380);
  });

  it('runs once after a flip reset', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 80, width: 80 });
    const apply = vi.fn();
    const result = computePosition(reference, floating, {
      middleware: [flip(), size({ apply })],
      placement: 'bottom',
    });

    expect(result.placement).toBe('top');
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][0].availableHeight).toBe(720);
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
});

// ─── hide ─────────────────────────────────────────────────────────────────────

describe('hide', () => {
  beforeEach(() => setViewport());

  it('reports referenceHidden when the reference is fully clipped', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: -140, y: 300 },
      { height: 30, width: 80 },
    );
    const result = computePosition(reference, floating, {
      middleware: [hide()],
      placement: 'bottom',
    });

    expect(result.middlewareData.hide).toMatchObject({ referenceHidden: true });
  });

  it('reports escaped when the floating element is fully clipped', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 950, y: 300 },
      { height: 30, width: 200 },
    );
    const result = computePosition(reference, floating, {
      middleware: [offset(100), hide({ strategy: 'escaped' })],
      placement: 'right',
    });

    expect(result.middlewareData.hide).toMatchObject({ escaped: true });
  });
});

// ─── inline ───────────────────────────────────────────────────────────────────

describe('inline', () => {
  beforeEach(() => setViewport());

  it('chooses the client rect containing the pointer', () => {
    const reference = document.createElement('span');
    const floating = document.createElement('div');
    const first = createDomRect({ height: 20, width: 50, x: 100, y: 100 });
    const second = createDomRect({ height: 20, width: 60, x: 200, y: 100 });

    vi.spyOn(reference, 'getBoundingClientRect').mockReturnValue(
      createDomRect({ height: 20, width: 160, x: 100, y: 100 }),
    );
    vi.spyOn(reference, 'getClientRects').mockReturnValue([first, second] as unknown as DOMRectList);
    vi.spyOn(floating, 'getBoundingClientRect').mockReturnValue(createDomRect({ height: 30, width: 40 }));

    const result = computePosition(reference, floating, {
      middleware: [inline({ x: 220, y: 110 })],
      placement: 'bottom',
    });

    expect(result.x).toBe(210);
    expect(result.y).toBe(120);
  });
});

// ─── positionFloat ────────────────────────────────────────────────────────────

describe('positionFloat', () => {
  beforeEach(() => setViewport());

  it('applies left/top inline styles and returns the full result', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const result = positionFloat(reference, floating, {
      middleware: [hide()],
    });

    expect(floating.style.left).toBe('210px');
    expect(floating.style.top).toBe('340px');
    expect(result).toMatchObject({ placement: 'bottom', x: 210, y: 340 });
    expect(result.middlewareData.hide).toBeDefined();
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

  it('positions the floating element immediately', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const cleanup = float(reference, floating, { placement: 'bottom' });

    expect(floating.style.top).toBe('340px');
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
});

// ─── typed middleware data helpers ───────────────────────────────────────────

describe('middleware data helpers', () => {
  beforeEach(() => setViewport());

  it('returns typed middleware data for arrow/hide helpers', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: -140, y: 300 },
      { height: 30, width: 80 },
    );
    const result = computePosition(reference, floating, {
      middleware: [arrow({ element: makeArrow({ height: 10, width: 10 }) }), hide()],
      placement: 'bottom',
    });

    const arrowData = getArrowData(result);
    const hideData = getHideData(result);
    const genericArrowData = getMiddlewareData<{ centerOffset: number; x?: number; y?: number }>(result, 'arrow');

    expect(arrowData?.centerOffset).toBeTypeOf('number');
    expect(hideData?.referenceHidden).toBe(true);
    expect(genericArrowData?.centerOffset).toBe(0);
  });
});
