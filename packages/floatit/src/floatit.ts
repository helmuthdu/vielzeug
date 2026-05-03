/** @vielzeug/floatit — Lightweight floating element positioning. */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Alignment = 'start' | 'end';
export type Placement = Side | `${Side}-${Alignment}`;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiddlewareState {
  x: number;
  y: number;
  placement: Placement;
  rects: { floating: Rect; reference: Rect };
  elements: { floating: HTMLElement; reference: Element };
}

export type Middleware = (state: MiddlewareState) => MiddlewareState;

export interface FloatOptions {
  placement?: Placement;
  /**
   * Middleware chain run in order.
   * At most one middleware should change `state.placement` (typically `flip()`).
   */
  middleware?: Array<Middleware | null | undefined | false>;
}

export type Cleanup = () => void;

export interface ComputePositionResult {
  x: number;
  y: number;
  placement: Placement;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const OPPOSITE: Record<Side, Side> = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' };

function getSide(p: Placement): Side {
  return p.split('-')[0] as Side;
}

function getAlign(p: Placement): Alignment | null {
  return (p.split('-')[1] as Alignment) ?? null;
}

function toRect({ height, width, x, y }: DOMRect): Rect {
  return { height, width, x, y };
}

function alignedOffset(align: Alignment | null, refStart: number, refSize: number, floatSize: number): number {
  if (align === 'start') return refStart;

  if (align === 'end') return refStart + refSize - floatSize;

  return refStart + (refSize - floatSize) / 2;
}

function baseCoords(placement: Placement, ref: Rect, float: Rect): { x: number; y: number } {
  const side = getSide(placement);
  const align = getAlign(placement);

  switch (side) {
    case 'bottom':
      return { x: alignedOffset(align, ref.x, ref.width, float.width), y: ref.y + ref.height };
    case 'left':
      return { x: ref.x - float.width, y: alignedOffset(align, ref.y, ref.height, float.height) };
    case 'right':
      return { x: ref.x + ref.width, y: alignedOffset(align, ref.y, ref.height, float.height) };
    case 'top':
      return { x: alignedOffset(align, ref.x, ref.width, float.width), y: ref.y - float.height };
  }
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

function runPipeline(
  mws: Middleware[],
  initialPlacement: Placement,
  reference: Element,
  floating: HTMLElement,
): ComputePositionResult {
  let placement = initialPlacement;
  let restarted = false;

  while (true) {
    const refRect = toRect(reference.getBoundingClientRect());
    const floatRect = toRect(floating.getBoundingClientRect());
    let state: MiddlewareState = {
      ...baseCoords(placement, refRect, floatRect),
      elements: { floating, reference },
      placement,
      rects: { floating: floatRect, reference: refRect },
    };

    for (const mw of mws) {
      const previousPlacement = state.placement;

      state = mw(state);

      // Stop the current pass as soon as placement changes.
      if (state.placement !== previousPlacement) break;
    }

    if (state.placement === placement) return { placement: state.placement, x: state.x, y: state.y };

    if (restarted) {
      throw new Error(
        '[floatit] Middleware changed placement more than once in a single compute cycle. Use at most one placement-changing middleware.',
      );
    }

    placement = state.placement;
    restarted = true;
  }
}

// ─── computePosition ──────────────────────────────────────────────────────────

/** Computes the position of a floating element relative to a reference element. */
export function computePosition(
  reference: Element,
  floating: HTMLElement,
  { middleware = [], placement = 'bottom' }: FloatOptions = {},
): ComputePositionResult {
  return runPipeline(middleware.filter(Boolean) as Middleware[], placement, reference, floating);
}

// ─── Middlewares ──────────────────────────────────────────────────────────────

/** Adds a gap (in px) between the reference and the floating element. */
export function offset(value: number): Middleware {
  return (state) => {
    const side = getSide(state.placement);

    return {
      ...state,
      x: state.x + (side === 'right' ? value : side === 'left' ? -value : 0),
      y: state.y + (side === 'bottom' ? value : side === 'top' ? -value : 0),
    };
  };
}

export interface FlipOptions {
  /** Minimum distance from the viewport edge before flipping (px). */
  padding?: number;
}

/** Flips the floating element to the opposite side when it would overflow the viewport. */
export function flip(options: FlipOptions = {}): Middleware {
  const { padding = 0 } = options;

  return (state) => {
    const {
      placement,
      rects: { floating },
      x,
      y,
    } = state;
    const side = getSide(placement);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const overflows =
      (side === 'top' && y < padding) ||
      (side === 'bottom' && y + floating.height > vh - padding) ||
      (side === 'left' && x < padding) ||
      (side === 'right' && x + floating.width > vw - padding);

    if (!overflows) return state;

    const align = getAlign(placement);
    const opp = OPPOSITE[side];
    const flipped = (align ? `${opp}-${align}` : opp) as Placement;

    return { ...state, placement: flipped };
  };
}

export interface ShiftOptions {
  /** Minimum distance to maintain from the viewport edges (px). */
  padding?: number;
}

/** Shifts the floating element along its axis to keep it within the viewport. */
export function shift(options: ShiftOptions = {}): Middleware {
  const { padding = 0 } = options;

  return (state) => {
    const {
      rects: { floating },
      x,
      y,
    } = state;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    return {
      ...state,
      x: Math.min(Math.max(x, padding), vw - floating.width - padding),
      y: Math.min(Math.max(y, padding), vh - floating.height - padding),
    };
  };
}

export interface SizeApplyArgs {
  availableWidth: number;
  availableHeight: number;
  elements: { floating: HTMLElement; reference: Element };
}

export interface SizeOptions {
  /** Minimum distance to maintain from the viewport edges (px). */
  padding?: number;
  /** Called with available dimensions — use to resize the floating element. */
  apply?: (args: SizeApplyArgs) => void;
}

/** Provides available width/height based on actual float position and optionally resizes the floating element. */
export function size(options: SizeOptions = {}): Middleware {
  const { apply, padding = 0 } = options;

  return (state) => {
    const {
      placement,
      rects: { reference: refRect },
      x,
      y,
    } = state;
    const side = getSide(placement);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const availableHeight =
      side === 'bottom' ? vh - y - padding : side === 'top' ? refRect.y - padding : vh - padding * 2;

    const availableWidth =
      side === 'right' ? vw - x - padding : side === 'left' ? refRect.x - padding : vw - padding * 2;

    apply?.({ availableHeight, availableWidth, elements: state.elements });

    return state;
  };
}

// ─── autoUpdate ───────────────────────────────────────────────────────────────

export interface AutoUpdateOptions {
  /**
   * Whether to observe size changes on the floating element itself.
   * Set to `false` for virtual-scroll dropdowns whose outer dimensions are
   * managed entirely by the caller (e.g. width set via `size()` middleware),
   * to avoid a ResizeObserver feedback loop.
   * Defaults to `true`.
   */
  observeFloating?: boolean;
  /**
   * Whether to observe `window.visualViewport` resize/scroll changes.
   * Helps keep floating UI aligned during pinch-zoom and virtual keyboard changes.
   * Defaults to `true`.
   */
  observeVisualViewport?: boolean;
}

/**
 * Automatically calls `update` whenever the floating element's position may have
 * changed (viewport resize, scroll events, or reference / floating element resize).
 * Calls `update` once immediately on registration.
 * Returns a cleanup function.
 */
export function autoUpdate(
  reference: Element,
  floating: HTMLElement,
  update: () => void,
  { observeFloating = true, observeVisualViewport = true }: AutoUpdateOptions = {},
): Cleanup {
  update();

  // Use composedPath() instead of e.target — shadow DOM retargets e.target to
  // the shadow host at the window listener boundary.
  const scrollHandler = (e: Event) => {
    if (e.composedPath().includes(floating)) return;

    update();
  };

  window.addEventListener('scroll', scrollHandler, { capture: true, passive: true });
  window.addEventListener('resize', update, { passive: true });

  const vv = observeVisualViewport ? window.visualViewport : null;

  vv?.addEventListener('resize', update, { passive: true });
  vv?.addEventListener('scroll', update, { passive: true });

  const ro = new ResizeObserver(update);

  ro.observe(reference);

  if (observeFloating) ro.observe(floating);

  return () => {
    window.removeEventListener('scroll', scrollHandler, { capture: true });
    window.removeEventListener('resize', update);
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
    ro.disconnect();
  };
}

// ─── positionFloat / float ────────────────────────────────────────────────────

/**
 * Computes and applies the floating position to a floating element.
 * Sets `left`/`top` inline styles and returns the resolved placement.
 *
 * Coordinates are viewport-based, so the floating element should typically use
 * `position: fixed` for the applied values to match the computed geometry.
 */
export function positionFloat(reference: Element, floating: HTMLElement, options: FloatOptions = {}): Placement {
  const { placement, x, y } = computePosition(reference, floating, options);

  floating.style.left = `${x}px`;
  floating.style.top = `${y}px`;

  return placement;
}

/**
 * Positions a floating element relative to a reference element and keeps it in
 * sync as the viewport or elements change. Returns a cleanup function.
 *
 * @example
 * ```ts
 * const cleanup = float(trigger, tooltip, {
 *   placement: 'top',
 *   middleware: [offset(8), flip(), shift({ padding: 6 })],
 * });
 *
 * // When done:
 * cleanup();
 * ```
 */
export function float(reference: Element, floating: HTMLElement, options: FloatOptions = {}): Cleanup {
  return autoUpdate(reference, floating, () => positionFloat(reference, floating, options));
}
