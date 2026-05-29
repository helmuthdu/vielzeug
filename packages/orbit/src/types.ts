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
 * - `true` — restart with the current rects and placement.
 * - Object form — optionally update placement and/or re-measure rects before restarting.
 */
export type MiddlewareReset =
  | true
  | {
      placement?: Placement;
      rects?: true | MiddlewareState['rects'];
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
}

export type Cleanup = () => void;

export interface DetectOverflowOptions {
  /** Boundary element or rect. Defaults to the visual viewport. */
  boundary?: Element | Rect;
  /** Inset padding inside the boundary that the floating element must respect. */
  padding?: Padding;
}
