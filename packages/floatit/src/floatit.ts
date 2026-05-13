/** @vielzeug/floatit - Lightweight floating element positioning. */

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
type Boundary = Element | Rect;

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

export interface MiddlewareData {
  arrow?: ArrowData;
  hide?: HideData;
  [key: string]: unknown;
}

export interface MiddlewareState {
  x: number;
  y: number;
  initialPlacement: Placement;
  placement: Placement;
  rects: { floating: Rect; reference: Rect };
  elements: { floating: HTMLElement; reference: ReferenceElement };
  middlewareData: MiddlewareData;
}

export type MiddlewareReset = {
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

export interface FloatOptions {
  placement?: Placement;
  middleware?: Array<Middleware | null | undefined | false>;
}

export interface ComputePositionResult {
  x: number;
  y: number;
  placement: Placement;
  middlewareData: MiddlewareData;
}

export type Cleanup = () => void;

const OPPOSITE: Record<Side, Side> = { bottom: 'top', left: 'right', right: 'left', top: 'bottom' };

function getSide(p: Placement): Side {
  return p.split('-')[0] as Side;
}

function getAlign(p: Placement): Alignment | null {
  return (p.split('-')[1] as Alignment) ?? null;
}

function withPlacement(side: Side, align: Alignment | null): Placement {
  return (align ? `${side}-${align}` : side) as Placement;
}

function toRect({ height, width, x, y }: DOMRect | Rect): Rect {
  return { height, width, x, y };
}

function toSideObject(padding: Padding = 0): SideObject {
  if (typeof padding === 'number') {
    return { bottom: padding, left: padding, right: padding, top: padding };
  }

  return {
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
    right: padding.right ?? 0,
    top: padding.top ?? 0,
  };
}

function getViewportRect(): Rect {
  const vv = window.visualViewport;

  if (vv) return { height: vv.height, width: vv.width, x: vv.offsetLeft, y: vv.offsetTop };

  return { height: window.innerHeight, width: window.innerWidth, x: 0, y: 0 };
}

function getBoundaryRect(boundary?: Boundary): Rect {
  if (!boundary) return getViewportRect();

  if ('getBoundingClientRect' in boundary) return toRect(boundary.getBoundingClientRect());

  return boundary;
}

function getRects(reference: ReferenceElement, floating: HTMLElement): MiddlewareState['rects'] {
  return {
    floating: toRect(floating.getBoundingClientRect()),
    reference: toRect(reference.getBoundingClientRect()),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
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

function getFloatingRect(state: MiddlewareState): Rect {
  return { ...state.rects.floating, x: state.x, y: state.y };
}

function mergeState(state: MiddlewareState, result: MiddlewareResult | void): MiddlewareState {
  if (!result) return state;

  return {
    ...state,
    middlewareData: result.data ? { ...state.middlewareData, ...result.data } : state.middlewareData,
    placement: result.placement ?? state.placement,
    x: result.x ?? state.x,
    y: result.y ?? state.y,
  };
}

function totalOverflow(overflow: SideObject): number {
  return (
    Math.max(overflow.top, 0) + Math.max(overflow.right, 0) + Math.max(overflow.bottom, 0) + Math.max(overflow.left, 0)
  );
}

function hasOverflow(overflow: SideObject): boolean {
  return overflow.top > 0 || overflow.right > 0 || overflow.bottom > 0 || overflow.left > 0;
}

function getAvailableSpace(state: MiddlewareState, placement: Placement, boundary: Rect, padding: SideObject): number {
  const refRect = state.rects.reference;
  const side = getSide(placement);
  const boundaryTop = boundary.y + padding.top;
  const boundaryRight = boundary.x + boundary.width - padding.right;
  const boundaryBottom = boundary.y + boundary.height - padding.bottom;
  const boundaryLeft = boundary.x + padding.left;

  switch (side) {
    case 'bottom':
      return boundaryBottom - (refRect.y + refRect.height);
    case 'left':
      return refRect.x - boundaryLeft;
    case 'right':
      return boundaryRight - (refRect.x + refRect.width);
    case 'top':
      return refRect.y - boundaryTop;
  }
}

function isFullyClipped(rect: Rect, overflow: SideObject): boolean {
  return (
    overflow.top >= rect.height ||
    overflow.right >= rect.width ||
    overflow.bottom >= rect.height ||
    overflow.left >= rect.width
  );
}

function getClientRects(reference: ReferenceElement): Rect[] {
  if (!('getClientRects' in reference) || typeof reference.getClientRects !== 'function') return [];

  return Array.from(reference.getClientRects())
    .map((rect) => toRect(rect))
    .filter((rect) => rect.width > 0 || rect.height > 0);
}

function isElement(value: unknown): value is Element {
  return typeof Element !== 'undefined' && value instanceof Element;
}

function rectContainsPoint(rect: Rect, x: number, y: number, padding: SideObject): boolean {
  return (
    x >= rect.x - padding.left &&
    x <= rect.x + rect.width + padding.right &&
    y >= rect.y - padding.top &&
    y <= rect.y + rect.height + padding.bottom
  );
}

function sameRect(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function detectOverflowAtRect(rect: Rect, boundary: Rect, padding: SideObject): SideObject {
  return {
    bottom: rect.y + rect.height - (boundary.y + boundary.height - padding.bottom),
    left: boundary.x + padding.left - rect.x,
    right: rect.x + rect.width - (boundary.x + boundary.width - padding.right),
    top: boundary.y + padding.top - rect.y,
  };
}

export interface DetectOverflowOptions {
  boundary?: Element | Rect;
  padding?: Padding;
}

export function detectOverflow(state: MiddlewareState, options: DetectOverflowOptions = {}): SideObject {
  const boundary = getBoundaryRect(options.boundary);
  const padding = toSideObject(options.padding);

  return detectOverflowAtRect(getFloatingRect(state), boundary, padding);
}

function getPlacementOverflow(
  state: MiddlewareState,
  placement: Placement,
  options: DetectOverflowOptions = {},
): SideObject {
  const { x, y } = baseCoords(placement, state.rects.reference, state.rects.floating);
  const boundary = getBoundaryRect(options.boundary);
  const padding = toSideObject(options.padding);
  const rect = { ...state.rects.floating, x, y };

  return detectOverflowAtRect(rect, boundary, padding);
}

export function computePosition(
  reference: ReferenceElement,
  floating: HTMLElement,
  { middleware = [], placement = 'bottom' }: FloatOptions = {},
): ComputePositionResult {
  const mws = middleware.filter(Boolean) as Middleware[];
  let currentPlacement = placement;
  let middlewareData: MiddlewareData = {};
  let rects = getRects(reference, floating);

  for (let resets = 0; resets < 50; resets += 1) {
    let state: MiddlewareState = {
      ...baseCoords(currentPlacement, rects.reference, rects.floating),
      elements: { floating, reference },
      initialPlacement: placement,
      middlewareData,
      placement: currentPlacement,
      rects,
    };

    let reset: MiddlewareReset | undefined;

    for (const mw of mws) {
      const result = mw(state);

      state = mergeState(state, result);
      middlewareData = state.middlewareData;
      reset = result?.reset;

      if (reset) break;
    }

    if (!reset) {
      return { middlewareData: state.middlewareData, placement: state.placement, x: state.x, y: state.y };
    }

    if (reset.rects === true) {
      rects = getRects(reference, floating);
    } else if (reset.rects) {
      rects = reset.rects;
    }

    currentPlacement = reset.placement ?? state.placement;
  }

  throw new Error('[floatit] Middleware triggered too many resets in a single compute cycle.');
}

export type OffsetConfig = {
  crossAxis?: number;
  mainAxis?: number;
};

export type OffsetValue = number | OffsetConfig | ((state: MiddlewareState) => number | OffsetConfig);

function resolveOffsetConfig(value: OffsetValue, state: MiddlewareState): Required<OffsetConfig> {
  const raw = typeof value === 'function' ? value(state) : value;

  if (typeof raw === 'number') {
    return { crossAxis: 0, mainAxis: raw };
  }

  return {
    crossAxis: raw.crossAxis ?? 0,
    mainAxis: raw.mainAxis ?? 0,
  };
}

export function offset(value: OffsetValue): Middleware {
  return (state) => {
    const side = getSide(state.placement);
    const { crossAxis, mainAxis } = resolveOffsetConfig(value, state);

    switch (side) {
      case 'bottom':
        return { x: state.x + crossAxis, y: state.y + mainAxis };
      case 'left':
        return { x: state.x - mainAxis, y: state.y + crossAxis };
      case 'right':
        return { x: state.x + mainAxis, y: state.y + crossAxis };
      case 'top':
        return { x: state.x + crossAxis, y: state.y - mainAxis };
    }
  };
}

export interface FlipOptions extends DetectOverflowOptions {
  fallbackPlacements?: Placement[];
}

export function flip(options: FlipOptions = {}): Middleware {
  return (state) => {
    const currentOverflow = detectOverflow(state, options);

    if (!hasOverflow(currentOverflow)) return;

    const side = getSide(state.placement);
    const align = getAlign(state.placement);
    const fallbackPlacements = options.fallbackPlacements ?? [withPlacement(OPPOSITE[side], align)];
    let bestPlacement = state.placement;
    let bestScore = totalOverflow(currentOverflow);

    for (const candidate of fallbackPlacements) {
      const candidateOverflow = getPlacementOverflow(state, candidate, options);
      const score = totalOverflow(candidateOverflow);

      if (!hasOverflow(candidateOverflow)) {
        return { placement: candidate, reset: { placement: candidate } };
      }

      if (score < bestScore) {
        bestPlacement = candidate;
        bestScore = score;
      }
    }

    if (bestPlacement !== state.placement) {
      return { placement: bestPlacement, reset: { placement: bestPlacement } };
    }
  };
}

export interface AutoPlacementOptions extends DetectOverflowOptions {
  allowedPlacements?: Placement[];
}

export function autoPlacement(options: AutoPlacementOptions = {}): Middleware {
  return (state) => {
    const padding = toSideObject(options.padding);
    const boundary = getBoundaryRect(options.boundary);
    const placements = options.allowedPlacements ?? ['top', 'right', 'bottom', 'left'];
    let bestPlacement = state.placement;
    let bestOverflow = Number.POSITIVE_INFINITY;
    let bestSpace = Number.NEGATIVE_INFINITY;

    for (const candidate of placements) {
      const overflow = getPlacementOverflow(state, candidate, options);
      const overflowScore = totalOverflow(overflow);
      const availableSpace = getAvailableSpace(state, candidate, boundary, padding);

      if (overflowScore < bestOverflow || (overflowScore === bestOverflow && availableSpace > bestSpace)) {
        bestPlacement = candidate;
        bestOverflow = overflowScore;
        bestSpace = availableSpace;
      }
    }

    if (bestPlacement !== state.placement) {
      return { placement: bestPlacement, reset: { placement: bestPlacement } };
    }
  };
}

export type ShiftOptions = DetectOverflowOptions;

export function shift(options: ShiftOptions = {}): Middleware {
  return (state) => {
    const overflow = detectOverflow(state, options);

    return {
      x: state.x + Math.max(overflow.left, 0) - Math.max(overflow.right, 0),
      y: state.y + Math.max(overflow.top, 0) - Math.max(overflow.bottom, 0),
    };
  };
}

export interface SizeApplyArgs {
  availableWidth: number;
  availableHeight: number;
  elements: { floating: HTMLElement; reference: ReferenceElement };
}

export interface SizeOptions extends DetectOverflowOptions {
  apply?: (args: SizeApplyArgs) => void;
}

export function size(options: SizeOptions = {}): Middleware {
  const { apply } = options;

  return (state) => {
    const boundary = getBoundaryRect(options.boundary);
    const padding = toSideObject(options.padding);
    const side = getSide(state.placement);
    const top = boundary.y + padding.top;
    const right = boundary.x + boundary.width - padding.right;
    const bottom = boundary.y + boundary.height - padding.bottom;
    const left = boundary.x + padding.left;

    const availableHeight =
      side === 'bottom'
        ? Math.max(0, bottom - state.y)
        : side === 'top'
          ? Math.max(0, state.rects.reference.y - top)
          : Math.max(0, bottom - top);

    const availableWidth =
      side === 'right'
        ? Math.max(0, right - state.x)
        : side === 'left'
          ? Math.max(0, state.rects.reference.x - left)
          : Math.max(0, right - left);

    apply?.({ availableHeight, availableWidth, elements: state.elements });
  };
}

export interface ArrowOptions {
  element: HTMLElement;
  padding?: Padding;
}

export function arrow({ element, padding = 0 }: ArrowOptions): Middleware {
  return (state) => {
    const side = getSide(state.placement);
    const inset = toSideObject(padding);
    const arrowRect = toRect(element.getBoundingClientRect());

    if (side === 'top' || side === 'bottom') {
      const idealX = state.rects.reference.x + state.rects.reference.width / 2 - state.x - arrowRect.width / 2;
      const minX = inset.left;
      const maxX = Math.max(minX, state.rects.floating.width - arrowRect.width - inset.right);
      const x = clamp(idealX, minX, maxX);

      return { data: { arrow: { centerOffset: idealX - x, x } } };
    }

    const idealY = state.rects.reference.y + state.rects.reference.height / 2 - state.y - arrowRect.height / 2;
    const minY = inset.top;
    const maxY = Math.max(minY, state.rects.floating.height - arrowRect.height - inset.bottom);
    const y = clamp(idealY, minY, maxY);

    return { data: { arrow: { centerOffset: idealY - y, y } } };
  };
}

export interface HideOptions extends DetectOverflowOptions {
  strategy?: 'referenceHidden' | 'escaped' | 'both';
}

export function hide(options: HideOptions = {}): Middleware {
  const strategy = options.strategy ?? 'both';

  return (state) => {
    const boundary = getBoundaryRect(options.boundary);
    const padding = toSideObject(options.padding);
    const next: HideData = {};

    if (strategy === 'escaped' || strategy === 'both') {
      const escapedOffsets = detectOverflowAtRect(getFloatingRect(state), boundary, padding);

      next.escaped = isFullyClipped(getFloatingRect(state), escapedOffsets);
      next.escapedOffsets = escapedOffsets;
    }

    if (strategy === 'referenceHidden' || strategy === 'both') {
      const referenceHiddenOffsets = detectOverflowAtRect(state.rects.reference, boundary, padding);

      next.referenceHidden = isFullyClipped(state.rects.reference, referenceHiddenOffsets);
      next.referenceHiddenOffsets = referenceHiddenOffsets;
    }

    return { data: { hide: next } };
  };
}

export interface InlineOptions {
  x?: number;
  y?: number;
  padding?: Padding;
}

export function inline(options: InlineOptions = {}): Middleware {
  return (state) => {
    const rects = getClientRects(state.elements.reference);

    if (rects.length <= 1) return;

    const padding = toSideObject(options.padding ?? 2);
    const side = getSide(state.placement);
    let nextRect = rects[0];

    if (options.x != null && options.y != null) {
      nextRect = rects.find((rect) => rectContainsPoint(rect, options.x!, options.y!, padding)) ?? nextRect;
    } else if (side === 'top' || side === 'bottom') {
      const targetX = state.x + state.rects.floating.width / 2;

      nextRect = rects.reduce((best, rect) => {
        const bestDistance = Math.abs(best.x + best.width / 2 - targetX);
        const rectDistance = Math.abs(rect.x + rect.width / 2 - targetX);

        return rectDistance < bestDistance ? rect : best;
      }, nextRect);
    } else {
      const targetY = state.y + state.rects.floating.height / 2;

      nextRect = rects.reduce((best, rect) => {
        const bestDistance = Math.abs(best.y + best.height / 2 - targetY);
        const rectDistance = Math.abs(rect.y + rect.height / 2 - targetY);

        return rectDistance < bestDistance ? rect : best;
      }, nextRect);
    }

    if (sameRect(nextRect, state.rects.reference)) return;

    return {
      reset: {
        rects: { ...state.rects, reference: nextRect },
      },
    };
  };
}

export interface AutoUpdateOptions {
  observeFloating?: boolean;
  observeVisualViewport?: boolean;
  animationFrame?: boolean;
}

export function autoUpdate(
  reference: ReferenceElement,
  floating: HTMLElement,
  update: () => void,
  { animationFrame = false, observeFloating = true, observeVisualViewport = true }: AutoUpdateOptions = {},
): Cleanup {
  update();

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

  if (isElement(reference)) ro.observe(reference);

  if (observeFloating) ro.observe(floating);

  let frameId = 0;

  if (animationFrame) {
    const frameLoop = () => {
      update();
      frameId = window.requestAnimationFrame(frameLoop);
    };

    frameId = window.requestAnimationFrame(frameLoop);
  }

  return () => {
    window.removeEventListener('scroll', scrollHandler, { capture: true });
    window.removeEventListener('resize', update);
    vv?.removeEventListener('resize', update);
    vv?.removeEventListener('scroll', update);
    ro.disconnect();

    if (frameId) window.cancelAnimationFrame(frameId);
  };
}

export interface FloatRuntimeOptions extends FloatOptions, AutoUpdateOptions {
  apply?: (result: ComputePositionResult, elements: { floating: HTMLElement; reference: ReferenceElement }) => void;
}

function applyDefault(result: ComputePositionResult, elements: { floating: HTMLElement }): void {
  elements.floating.style.left = `${result.x}px`;
  elements.floating.style.top = `${result.y}px`;
}

export function float(
  reference: ReferenceElement,
  floating: HTMLElement,
  {
    animationFrame,
    apply = applyDefault,
    middleware,
    observeFloating,
    observeVisualViewport,
    placement,
  }: FloatRuntimeOptions = {},
): Cleanup {
  return autoUpdate(
    reference,
    floating,
    () => {
      const result = computePosition(reference, floating, { middleware, placement });

      apply(result, { floating, reference });
    },
    { animationFrame, observeFloating, observeVisualViewport },
  );
}
