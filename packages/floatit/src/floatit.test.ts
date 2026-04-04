import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { autoUpdate, computePosition, float, flip, offset, positionFloat, shift, size, type Middleware } from './index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RectInit = { height?: number; width?: number; x?: number; y?: number };

function makeElements(refInit: RectInit, floatInit: RectInit = {}) {
  const reference = document.createElement('div');
  const floating = document.createElement('div');

  for (const [el, init] of [
    [reference, refInit],
    [floating, floatInit],
  ] as const) {
    const r = { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0, ...init };

    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ ...r, toJSON: () => ({}) } as DOMRect);
  }

  return { floating, reference };
}

function setViewport(width = 1024, height = 768) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
}

// ─── computePosition ──────────────────────────────────────────────────────────

describe('computePosition', () => {
  beforeEach(() => setViewport());

  it('defaults to bottom-center placement', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const result = computePosition(reference, floating);

    expect(result.placement).toBe('bottom');
    expect(result.y).toBe(340); // ref.y + ref.height
    expect(result.x).toBe(210); // 200 + (100 - 80) / 2
  });

  it('positions top', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const { x, y } = computePosition(reference, floating, { placement: 'top' });

    expect(y).toBe(270); // ref.y - float.height
    expect(x).toBe(210); // centered
  });

  it('positions left', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 50 });
    const { x, y } = computePosition(reference, floating, { placement: 'left' });

    expect(x).toBe(150); // ref.x - float.width
    expect(y).toBe(305); // 300 + (40 - 30) / 2
  });

  it('positions right', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 50 });
    const { x, y } = computePosition(reference, floating, { placement: 'right' });

    expect(x).toBe(300); // ref.x + ref.width
    expect(y).toBe(305); // centered
  });

  it('aligns start', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(computePosition(reference, floating, { placement: 'bottom-start' }).x).toBe(200);
  });

  it('aligns end', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(computePosition(reference, floating, { placement: 'bottom-end' }).x).toBe(220); // 200 + 100 - 80
  });

  it('silently ignores null/undefined/false in middleware array', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 });

    expect(() => computePosition(reference, floating, { middleware: [null, undefined, false] })).not.toThrow();
  });
});

// ─── offset ───────────────────────────────────────────────────────────────────

describe('offset', () => {
  it('pushes down for bottom', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 0, y: 0 }, { height: 30, width: 80 });
    const { y } = computePosition(reference, floating, { middleware: [offset(8)], placement: 'bottom' });

    expect(y).toBe(48); // 40 + 8
  });

  it('pushes up for top', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 0, y: 200 }, { height: 30, width: 80 });
    const { y } = computePosition(reference, floating, { middleware: [offset(8)], placement: 'top' });

    expect(y).toBe(162); // 200 - 30 - 8
  });

  it('pushes right for right', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 100, y: 0 }, { height: 30, width: 80 });
    const { x } = computePosition(reference, floating, { middleware: [offset(8)], placement: 'right' });

    expect(x).toBe(208); // 100 + 100 + 8
  });

  it('pushes left for left', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 0 }, { height: 30, width: 80 });
    const { x } = computePosition(reference, floating, { middleware: [offset(8)], placement: 'left' });

    expect(x).toBe(112); // 200 - 80 - 8
  });
});

// ─── flip ─────────────────────────────────────────────────────────────────────

describe('flip', () => {
  beforeEach(() => setViewport());

  it('keeps placement when no overflow', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const { placement } = computePosition(reference, floating, { middleware: [flip()], placement: 'bottom' });

    expect(placement).toBe('bottom');
  });

  it('flips to top when bottom overflows viewport', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 30, width: 80 });
    const { placement } = computePosition(reference, floating, { middleware: [flip()], placement: 'bottom' });

    expect(placement).toBe('top');
  });

  it('flips to bottom when top overflows viewport', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 10 }, { height: 30, width: 80 });
    const { placement } = computePosition(reference, floating, { middleware: [flip()], placement: 'top' });

    expect(placement).toBe('bottom');
  });

  it('respects padding option', () => {
    // bottom edge of float: 740 + 80 = 820 > 768 - 10 = 758, so should flip
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 700 }, { height: 80, width: 80 });
    const { placement } = computePosition(reference, floating, {
      middleware: [flip({ padding: 10 })],
      placement: 'bottom',
    });

    expect(placement).toBe('top');
  });

  it('preserves alignment suffix when flipping', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 30, width: 80 });
    const { placement } = computePosition(reference, floating, {
      middleware: [flip()],
      placement: 'bottom-start',
    });

    expect(placement).toBe('top-start');
  });
});

// ─── shift ────────────────────────────────────────────────────────────────────

describe('shift', () => {
  beforeEach(() => setViewport());

  it('clamps right overflow', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 990, y: 300 }, { height: 30, width: 80 });
    const { x } = computePosition(reference, floating, { middleware: [shift()], placement: 'bottom-start' });

    expect(x).toBe(1024 - 80); // 944
  });

  it('clamps left overflow', () => {
    // bottom-end: x = ref.x + ref.width - float.width = 5 + 20 - 80 = -55 → clamped to 0
    const { floating, reference } = makeElements({ height: 40, width: 20, x: 5, y: 300 }, { height: 30, width: 80 });
    const { x } = computePosition(reference, floating, { middleware: [shift()], placement: 'bottom-end' });

    expect(x).toBe(0);
  });

  it('respects padding', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 990, y: 300 }, { height: 30, width: 80 });
    const { x } = computePosition(reference, floating, {
      middleware: [shift({ padding: 8 })],
      placement: 'bottom-start',
    });

    expect(x).toBe(1024 - 80 - 8); // 936
  });
});

// ─── size ─────────────────────────────────────────────────────────────────────

describe('size', () => {
  beforeEach(() => setViewport());

  it('reports available height below for bottom placement', () => {
    // ref bottom = 380, float starts at y = 380
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );
    let capturedHeight = 0;

    computePosition(reference, floating, {
      middleware: [
        size({
          apply: ({ availableHeight }) => {
            capturedHeight = availableHeight;
          },
        }),
      ],
      placement: 'bottom',
    });
    expect(capturedHeight).toBe(768 - 380); // 388
  });

  it('reports available height above for top placement', () => {
    // y = 400 - 100 = 300; y + height = 400
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 400 },
      { height: 100, width: 80 },
    );
    let capturedHeight = 0;

    computePosition(reference, floating, {
      middleware: [
        size({
          apply: ({ availableHeight }) => {
            capturedHeight = availableHeight;
          },
        }),
      ],
      placement: 'top',
    });
    expect(capturedHeight).toBe(400); // y + float.height = 300 + 100
  });

  it('respects padding', () => {
    const { floating, reference } = makeElements(
      { height: 40, width: 100, x: 200, y: 340 },
      { height: 100, width: 80 },
    );
    let capturedHeight = 0;

    computePosition(reference, floating, {
      middleware: [
        size({
          apply: ({ availableHeight }) => {
            capturedHeight = availableHeight;
          },
          padding: 8,
        }),
      ],
      placement: 'bottom',
    });
    expect(capturedHeight).toBe(768 - 380 - 8); // 380
  });

  it('calls apply with correct elements', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const apply = vi.fn();

    computePosition(reference, floating, { middleware: [size({ apply })], placement: 'bottom' });
    expect(apply).toHaveBeenCalledOnce();
    expect(apply.mock.calls[0][0].elements.floating).toBe(floating);
    expect(apply.mock.calls[0][0].elements.reference).toBe(reference);
  });

  it('does not call apply when omitted', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(() => computePosition(reference, floating, { middleware: [size()], placement: 'bottom' })).not.toThrow();
  });
});

// ─── positionFloat ────────────────────────────────────────────────────────────

describe('positionFloat', () => {
  beforeEach(() => setViewport());

  it('applies left/top inline styles', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    positionFloat(reference, floating);
    expect(floating.style.left).toBe('210px');
    expect(floating.style.top).toBe('340px');
  });

  it('returns the resolved placement', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });

    expect(positionFloat(reference, floating, { placement: 'top' })).toBe('top');
  });

  it('returns flipped placement when flip middleware fires', () => {
    // reference near bottom; bottom float overflows
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 720 }, { height: 30, width: 80 });
    const placement = positionFloat(reference, floating, {
      middleware: [flip()],
      placement: 'bottom',
    });

    expect(placement).toBe('top');
  });
});

// ─── autoUpdate ───────────────────────────────────────────────────────────────

describe('autoUpdate', () => {
  afterEach(() => vi.restoreAllMocks());

  it('calls update immediately on registration', () => {
    const { floating, reference } = makeElements({});
    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update);

    expect(update).toHaveBeenCalledOnce();
    cleanup();
  });

  it('returns a cleanup that removes event listeners', () => {
    const { floating, reference } = makeElements({});

    vi.spyOn(window, 'removeEventListener');

    const update = vi.fn();
    const cleanup = autoUpdate(reference, floating, update);

    cleanup();
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', update);
    expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), expect.anything());
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

  it('returns a cleanup function', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const cleanup = float(reference, floating);

    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});

// ─── Custom middleware ─────────────────────────────────────────────────────────

describe('custom middleware', () => {
  it('can be composed with built-ins', () => {
    const { floating, reference } = makeElements({ height: 40, width: 100, x: 200, y: 300 }, { height: 30, width: 80 });
    const snap = (grid: number): Middleware => ({
      fn: (state) => ({
        ...state,
        x: Math.round(state.x / grid) * grid,
        y: Math.round(state.y / grid) * grid,
      }),
      name: 'snap',
    });
    const { x, y } = computePosition(reference, floating, {
      middleware: [snap(10)],
      placement: 'bottom',
    });

    expect(x % 10).toBe(0);
    expect(y % 10).toBe(0);
  });
});
