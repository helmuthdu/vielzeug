/** @vielzeug/orbit — shared public type definitions. */

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Alignment = 'start' | 'end';
export type Placement = Side | `${Side}-${Alignment}`;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VirtualReference {
  getBoundingClientRect: () => DOMRect | Rect;
  getClientRects?: () => DOMRectList | DOMRect[];
}

export type ReferenceElement = Element | VirtualReference;

export interface SideObject {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type Padding = number | Partial<SideObject>;

// ── Middleware data shapes ────────────────────────────────────────────────────

export interface ArrowData {
  x?: number;
  y?: number;
  centerOffset: number;
}

export interface HideData {
  escaped?: boolean;
  escapedOffsets?: SideObject;
  referenceHidden?: boolean;
  referenceHiddenOffsets?: SideObject;
}

export interface SizeData {
  availableWidth: number;
  availableHeight: number;
}

export interface MiddlewareData {
  arrow?: ArrowData;
  hide?: HideData;
  size?: SizeData;
  [key: string]: unknown;
}

// ── Middleware pipeline ───────────────────────────────────────────────────────

export interface MiddlewareState {
  x: number;
  y: number;
  initialPlacement: Placement;
  placement: Placement;
  rects: { floating: Rect; reference: Rect };
  elements: { floating: HTMLElement; reference: ReferenceElement };
  middlewareData: MiddlewareData;
}

/**
 * Signal that the middleware pipeline should re-run.
 *
 * Use `{}` for a bare restart (same rects and placement). Optionally:
 * - `rects: 'remeasure'` — re-read both rects from the DOM before restarting.
 * - `rects: { floating, reference }` — restart using the provided rects directly.
 * - `placement` — override the placement for the next pass.
 */
export type MiddlewareReset = {
  placement?: Placement;
  rects?: 'remeasure' | MiddlewareState['rects'];
};

export interface MiddlewareResult {
  x?: number;
  y?: number;
  placement?: Placement;
  data?: MiddlewareData;
  reset?: MiddlewareReset;
}

export type Middleware = (state: MiddlewareState) => MiddlewareResult | void;

// ── Public API types ──────────────────────────────────────────────────────────

export interface ComputePositionResult {
  x: number;
  y: number;
  placement: Placement;
  middlewareData: MiddlewareData;
}

export interface ComputePositionOptions {
  /** Middleware pipeline to run. Falsy entries are ignored. */
  middleware?: Array<Middleware | null | undefined | false>;
  /** Initial placement. Defaults to `'bottom'`. */
  placement?: Placement;
  /**
   * The containing block element for `position: absolute` floating elements.
   * Provide the floating element's `offsetParent` to convert viewport-relative
   * coordinates to containing-block-relative coordinates.
   *
   * Without this option, coordinates are viewport-relative (correct for `position: fixed`).
   */
  containingBlock?: Element | null;
}

/**
 * Handle returned by `float()`.
 *
 * - `cleanup()` — removes all event listeners and observers. Always call this on teardown.
 * - `cssAnchor` — `true` when the browser is handling positioning natively via CSS Anchor
 *   Positioning; `getPosition()` always returns `null` in this mode.
 * - `update()` — manually trigger a position recalculation.
 * - `getPosition()` — returns the most recently computed position, or `null` before the
 *   first calculation completes (always `null` when `cssAnchor` is `true`).
 */
export interface FloatHandle {
  /** `true` when position is managed natively by CSS Anchor Positioning (JS data unavailable). */
  readonly cssAnchor: boolean;
  cleanup(): void;
  getPosition(): ComputePositionResult | null;
  update(): void;
}

export interface DetectOverflowOptions {
  /** Boundary element or rect. Defaults to the visual viewport. */
  boundary?: Element | Rect;
  /** Inset padding inside the boundary that the floating element must respect. */
  padding?: Padding;
}
