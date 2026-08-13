/** @vielzeug/orbit — shared public type definitions. */

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Alignment = 'start' | 'end';
export type Placement = Side | `${Side}-${Alignment}`;

export interface Rect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface VirtualReference {
  getBoundingClientRect: () => DOMRect | Rect;
  getClientRects?: () => DOMRectList | DOMRect[];
}

export type ReferenceElement = Element | VirtualReference;

export interface SideObject {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export type Padding = number | Partial<SideObject>;

// ── Middleware data shapes ────────────────────────────────────────────────────

export interface ArrowData {
  centerOffset: number;
  /** `true` when the arrow was clamped away from its ideal center position (e.g. floating element shifted by `shift()`). */
  constrained: boolean;
  x?: number;
  y?: number;
}

export interface FlipData {
  /** Placements that were evaluated and overflowed before the winning placement was chosen. */
  skippedPlacements: Placement[];
}

export interface ShiftData {
  /** Amount shifted on the x axis in pixels. */
  x: number;
  /** Amount shifted on the y axis in pixels. */
  y: number;
}

export interface HideData {
  escaped?: boolean;
  escapedOffsets?: SideObject;
  referenceHidden?: boolean;
  referenceHiddenOffsets?: SideObject;
}

export interface SizeData {
  availableHeight: number;
  availableWidth: number;
}

export interface MiddlewareData {
  arrow?: ArrowData;
  flip?: FlipData;
  hide?: HideData;
  shift?: ShiftData;
  size?: SizeData;
  [key: string]: unknown;
}

// ── Middleware pipeline ───────────────────────────────────────────────────────

export interface MiddlewareState {
  /** Global default boundary for overflow detection. Per-middleware `boundary` takes precedence. */
  boundary?: Element | Rect;
  elements: { floating: HTMLElement; reference: ReferenceElement };
  initialPlacement: Placement;
  middlewareData: MiddlewareData;
  /** Global default padding for overflow detection. Per-middleware `padding` takes precedence. */
  padding?: Padding;
  placement: Placement;
  rects: { floating: Rect; reference: Rect };
  x: number;
  y: number;
}

/**
 * Signal that the middleware pipeline should re-run.
 *
 * Use `{}` for a bare restart (same rects and placement). Optionally:
 * - `remeasure: true` — re-read both rects from the DOM before restarting.
 * - `rects: { floating, reference }` — restart using the provided rects directly.
 * - `placement` — override the placement for the next pass.
 *
 * **Precedence:** `remeasure` takes priority over `rects`. When both are set,
 * `remeasure` triggers a fresh DOM read and `rects` is ignored.
 */
export type MiddlewareReset = {
  placement?: Placement;
  /** Provide explicit rects to use for the next pass instead of re-reading the DOM. */
  rects?: MiddlewareState['rects'];
  /** Re-read both element rects from the DOM before restarting the pipeline. */
  remeasure?: boolean;
};

export interface MiddlewareResult {
  data?: MiddlewareData;
  placement?: Placement;
  reset?: MiddlewareReset;
  x?: number;
  y?: number;
}

export type Middleware = (state: MiddlewareState) => MiddlewareResult | undefined;

// ── Public API types ──────────────────────────────────────────────────────────

export interface ComputePositionResult {
  middlewareData: MiddlewareData;
  placement: Placement;
  x: number;
  y: number;
}

export interface ComputePositionOptions {
  /**
   * Default boundary for all overflow-aware middleware (`flip`, `shift`, `autoPlacement`, `size`, `hide`).
   * Per-middleware `boundary` takes precedence. Defaults to the visual viewport when omitted.
   */
  boundary?: Element | Rect;
  /**
   * The containing block element for `position: absolute` floating elements.
   * Provide the floating element's `offsetParent` to convert viewport-relative
   * coordinates to containing-block-relative coordinates.
   *
   * Without this option, coordinates are viewport-relative (correct for `position: fixed`).
   */
  containingBlock?: Element | null;
  /** Middleware pipeline to run in the supplied order. */
  middleware?: readonly Middleware[];
  /**
   * Default padding for all overflow-aware middleware.
   * Per-middleware `padding` takes precedence. Defaults to `0` when omitted.
   */
  padding?: Padding;
  /** Initial placement. Defaults to `'bottom'`. */
  placement?: Placement;
}

export interface DetectOverflowOptions {
  /** Boundary element or rect. Defaults to the visual viewport. */
  boundary?: Element | Rect;
  /** Inset padding inside the boundary that the floating element must respect. */
  padding?: Padding;
}
