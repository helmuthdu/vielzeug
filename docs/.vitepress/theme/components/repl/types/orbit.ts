export const orbitTypes = `
declare module '/orbit' {
  export type Side = 'top' | 'bottom' | 'left' | 'right';
  export type Alignment = 'start' | 'end';
  export type Placement = Side | \`\${Side}-\${Alignment}\`;

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

  export interface MiddlewareState {
    x: number;
    y: number;
    initialPlacement: Placement;
    placement: Placement;
    rects: { floating: Rect; reference: Rect };
    elements: { floating: HTMLElement; reference: ReferenceElement };
    middlewareData: MiddlewareData;
  }

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

  export interface ComputePositionOptions {
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

  export interface DetectOverflowOptions {
    boundary?: Element | Rect;
    padding?: Padding;
  }

  export type OffsetConfig = {
    crossAxis?: number;
    mainAxis?: number;
  };

  export type OffsetValue = number | OffsetConfig | ((state: MiddlewareState) => number | OffsetConfig);

  export interface FlipOptions extends DetectOverflowOptions {
    fallbackPlacements?: Placement[];
  }

  export interface AutoPlacementOptions extends DetectOverflowOptions {
    allowedPlacements?: Placement[];
  }

  export interface ShiftOptions extends DetectOverflowOptions {
    mainAxis?: boolean;
    crossAxis?: boolean;
  }

  export interface SizeApplyArgs extends SizeData {
    elements: { floating: HTMLElement; reference: ReferenceElement };
  }

  export interface SizeOptions extends DetectOverflowOptions {
    apply?: (args: SizeApplyArgs) => void;
  }

  export interface ArrowOptions {
    element: HTMLElement;
    padding?: Padding;
  }

  export interface HideOptions extends DetectOverflowOptions {
    strategy?: 'referenceHidden' | 'escaped' | 'both';
  }

  export interface AutoUpdateOptions {
    observeFloating?: boolean;
    observeVisualViewport?: boolean;
    animationFrame?: boolean;
    throttle?: number;
  }

  export interface FloatOptions extends ComputePositionOptions {
    apply?: (result: ComputePositionResult, elements: { floating: HTMLElement; reference: ReferenceElement }) => void;
    autoUpdate?: AutoUpdateOptions | false;
    preferCssAnchor?: boolean;
  }

  export function detectOverflow(state: MiddlewareState, options?: DetectOverflowOptions): SideObject;
  export function computePosition(reference: ReferenceElement, floating: HTMLElement, options?: ComputePositionOptions): ComputePositionResult;
  export function offset(value: OffsetValue): Middleware;
  export function flip(options?: FlipOptions): Middleware;
  export function autoPlacement(options?: AutoPlacementOptions): Middleware;
  export function shift(options?: ShiftOptions): Middleware;
  export function size(options?: SizeOptions): Middleware;
  export function arrow(options: ArrowOptions): Middleware;
  export function hide(options?: HideOptions): Middleware;
  export function autoUpdate(reference: ReferenceElement, floating: HTMLElement, update: () => void, options?: AutoUpdateOptions): Cleanup;
  export function float(reference: ReferenceElement, floating: HTMLElement, options?: FloatOptions): Cleanup;
  export function getSide(placement: Placement): Side;
  export function getAlignment(placement: Placement): Alignment | null;
}

declare module '/orbit/inline' {
  import type { Middleware, Padding } from '/orbit';

  export interface InlineOptions {
    x?: number;
    y?: number;
    padding?: Padding;
  }

  export function inline(options?: InlineOptions): Middleware;
}

declare module '/orbit/presets' {
  import type { Middleware, Placement } from '/orbit';

  export interface PresetOptions {
    offset?: number;
    padding?: number;
    placement?: Placement;
  }

  export interface PositioningPreset {
    placement: Placement;
    middleware: Middleware[];
  }

  export const presets: {
    tooltip(options?: PresetOptions): PositioningPreset;
    dropdown(options?: PresetOptions): PositioningPreset;
    popover(options?: PresetOptions): PositioningPreset;
    contextMenu(options?: PresetOptions): PositioningPreset;
  };
}
`;
