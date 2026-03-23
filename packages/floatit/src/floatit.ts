/** @vielzeug/floatit — Lightweight floating element positioning. */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Alignment = 'start' | 'end';
export type Placement = Side | `${Side}-${Alignment}`;
export type Strategy = 'fixed' | 'absolute';

interface Rect {
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

export interface Middleware {
  name: string;
  fn: (state: MiddlewareState) => MiddlewareState;
}

export interface ComputePositionConfig {
  placement?: Placement;
  strategy?: Strategy;
  middleware?: Array<Middleware | null | undefined | false>;
}

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

function crossCoord(align: Alignment | null, start: number, span: number, floatSpan: number): number {
  return align === 'start' ? start : align === 'end' ? start + span - floatSpan : start + (span - floatSpan) / 2;
}

/** Compute the base x/y for a floating element relative to a reference element. */
function baseCoords(placement: Placement, ref: Rect, float: Rect): { x: number; y: number } {
  const side = getSide(placement);
  const align = getAlign(placement);

  if (side === 'top') return { x: crossCoord(align, ref.x, ref.width, float.width), y: ref.y - float.height };

  if (side === 'bottom') return { x: crossCoord(align, ref.x, ref.width, float.width), y: ref.y + ref.height };

  if (side === 'left') return { x: ref.x - float.width, y: crossCoord(align, ref.y, ref.height, float.height) };

  /* right */ return { x: ref.x + ref.width, y: crossCoord(align, ref.y, ref.height, float.height) };
}

// ─── computePosition ──────────────────────────────────────────────────────────

/**
 * Computes the position of a floating element relative to a reference element.
 * Returns a Promise for API compatibility.
 */
export function computePosition(
  reference: Element,
  floating: HTMLElement,
  config: ComputePositionConfig = {},
): Promise<ComputePositionResult> {
  const { middleware = [], placement: initial = 'bottom' } = config;
  const mws = middleware.filter(Boolean) as Middleware[];

  let activePlacement = initial;
  let resets = 0;

  const run = (): ComputePositionResult => {
    const refRect = toRect(reference.getBoundingClientRect());
    const floatRect = toRect(floating.getBoundingClientRect());
    const base = baseCoords(activePlacement, refRect, floatRect);

    let state: MiddlewareState = {
      ...base,
      elements: { floating, reference },
      placement: activePlacement,
      rects: { floating: floatRect, reference: refRect },
    };

    for (const mw of mws) state = mw.fn(state);

    // If a middleware (e.g. flip) changed the placement, restart once with the new one.
    if (state.placement !== activePlacement && resets < 1) {
      activePlacement = state.placement;
      resets++;

      return run();
    }

    return { placement: state.placement, x: state.x, y: state.y };
  };

  return Promise.resolve(run());
}

// ─── Middlewares ──────────────────────────────────────────────────────────────

/** Adds a gap (in px) between the reference and the floating element. */
export function offset(value: number): Middleware {
  return {
    fn(state) {
      const side = getSide(state.placement);

      return {
        ...state,
        x: state.x + (side === 'right' ? value : side === 'left' ? -value : 0),
        y: state.y + (side === 'bottom' ? value : side === 'top' ? -value : 0),
      };
    },
    name: 'offset',
  };
}

export interface FlipOptions {
  /** Minimum distance from the viewport edge before flipping (px). */
  padding?: number;
}

/** Flips the floating element to the opposite side when it would overflow the viewport. */
export function flip(options: FlipOptions = {}): Middleware {
  const { padding = 0 } = options;

  return {
    fn(state) {
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
    },
    name: 'flip',
  };
}

export interface ShiftOptions {
  /** Minimum distance to maintain from the viewport edges (px). */
  padding?: number;
}

/** Shifts the floating element along its axis to keep it within the viewport. */
export function shift(options: ShiftOptions = {}): Middleware {
  const { padding = 0 } = options;

  return {
    fn(state) {
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
    },
    name: 'shift',
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

/** Provides available width/height and optionally resizes the floating element. */
export function size(options: SizeOptions = {}): Middleware {
  const { apply, padding = 0 } = options;

  return {
    fn(state) {
      apply?.({
        availableHeight: window.innerHeight - padding * 2,
        availableWidth: window.innerWidth - padding * 2,
        elements: state.elements,
      });

      return state;
    },
    name: 'size',
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
 * Returns a cleanup function.
 */
export function autoUpdate(
  reference: Element,
  floating: HTMLElement,
  update: () => void,
  { observeFloating = true, observeVisualViewport = true }: AutoUpdateOptions = {},
): () => void {
  // Scroll events inside the floating element itself (e.g. a dropdown scrolling
  // its own options list) must never trigger repositioning.
  // Use composedPath() instead of e.target — shadow DOM retargets e.target to
  // the shadow host at the window listener boundary, so contains(e.target) would
  // miss scrolls that originated inside a shadow root.
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
    window.removeEventListener('scroll', scrollHandler, { capture: true } as EventListenerOptions);
    window.removeEventListener('resize', update);
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
    ro.disconnect();
  };
}

// ─── positionFloat ────────────────────────────────────────────────────────────

export interface FloatOptions {
  /** Preferred placement relative to the reference element. */
  placement?: Placement;
  /** Positioning strategy. Defaults to `'fixed'`. */
  strategy?: Strategy;
  /** Middleware to modify positioning behavior. */
  middleware?: Array<Middleware | null | undefined | false>;
}

/**
 * Computes and applies the floating position to a floating element.
 * Sets `left`/`top` inline styles and returns the resolved placement.
 *
 * @example
 * ```ts
 * positionFloat(reference, floating, {
 *   placement: 'top',
 *   middleware: [offset(8), flip(), shift({ padding: 6 })],
 * }).then(placement => el.dataset.placement = placement);
 * ```
 */
export function positionFloat(
  reference: Element,
  floating: HTMLElement,
  options: FloatOptions = {},
): Promise<Placement> {
  return computePosition(reference, floating, {
    strategy: 'fixed',
    ...options,
  }).then(({ placement, x, y }) => {
    floating.style.left = `${x}px`;
    floating.style.top = `${y}px`;

    return placement;
  });
}
