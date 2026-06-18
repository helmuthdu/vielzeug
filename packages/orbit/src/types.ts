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
  /** `true` when the arrow was clamped away from its ideal center position (e.g. floating element shifted by `shift()`). */
  constrained: boolean;
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
  availableWidth: number;
  availableHeight: number;
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
  x: number;
  y: number;
  initialPlacement: Placement;
  placement: Placement;
  rects: { floating: Rect; reference: Rect };
  elements: { floating: HTMLElement; reference: ReferenceElement };
  middlewareData: MiddlewareData;
  /** Global default boundary for overflow detection. Per-middleware `boundary` takes precedence. */
  boundary?: Element | Rect;
  /** Global default padding for overflow detection. Per-middleware `padding` takes precedence. */
  padding?: Padding;
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
  x?: number;
  y?: number;
  placement?: Placement;
  data?: MiddlewareData;
  reset?: MiddlewareReset;
}

export type Middleware = (state: MiddlewareState) => MiddlewareResult | void;

/**
 * A middleware branded with the key it writes to `middlewareData`.
 * Built-in middleware return this type. Custom middleware can cast to it if needed.
 */
export type TypedMiddleware<K extends string, D> = Middleware & {
  /** @internal brand — identifies the middleware data key for compile-time inference. Never accessed at runtime. */
  readonly __brand: readonly [K, D];
};

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
  /**
   * Default boundary for all overflow-aware middleware (`flip`, `shift`, `autoPlacement`, `size`, `hide`).
   * Per-middleware `boundary` takes precedence. Defaults to the visual viewport when omitted.
   */
  boundary?: Element | Rect;
  /**
   * Default padding for all overflow-aware middleware.
   * Per-middleware `padding` takes precedence. Defaults to `0` when omitted.
   */
  padding?: Padding;
}

/**
 * Handle returned by `float()`.
 *
 * - `dispose()` — removes all event listeners and observers. Always call this on teardown.
 * - `update()` — manually trigger a position recalculation.
 * - `getPosition()` — returns the most recently computed position.
 *   - When `autoUpdate: false`, the position is computed synchronously during `float()`, so
 *     `getPosition()` is **never `null`** immediately after `float()` returns.
 *   - When using the `autoUpdate` loop (default), `getPosition()` returns `null` only before
 *     the very first update fires, which happens synchronously on construction.
 *   - Always returns `null` in SSR environments (via `@vielzeug/orbit/ssr`).
 */
export interface FloatHandle {
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie external lifetimes to this handle. */
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  /** `true` after `dispose()` has been called. */
  readonly disposed: boolean;
  getPosition(): ComputePositionResult | null;
  update(): void;
  [Symbol.dispose](): void;
}

export interface DetectOverflowOptions {
  /** Boundary element or rect. Defaults to the visual viewport. */
  boundary?: Element | Rect;
  /** Inset padding inside the boundary that the floating element must respect. */
  padding?: Padding;
}
