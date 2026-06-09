import type { ReadonlySignal } from '@vielzeug/ripple';

// ─── Reactive Utility ────────────────────────────────────────────────────────

export type MaybeSignal<T> = ReadonlySignal<T> | T;

// ─── Core Types ──────────────────────────────────────────────────────────────

export interface ChartMargin {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface ChartDimensions {
  height: number;
  margin: ChartMargin;
  width: number;
}

export interface ChartHandle {
  readonly el: SVGSVGElement;
  dispose(): void;
  update(): void;
  [Symbol.dispose](): void;
}

// ─── Data Types ──────────────────────────────────────────────────────────────

export interface DataPoint {
  meta?: Record<string, unknown>;
  x: Date | number | string;
  y: number;
}

export interface Series<T extends DataPoint = DataPoint> {
  color?: string;
  data: MaybeSignal<T[]>;
  name: string;
}

// ─── Scale Types ─────────────────────────────────────────────────────────────

export interface Scale<T> {
  domain: [T, T];
  range: [number, number];
  map(value: T): number;
  invert(pixel: number): T;
  ticks(count?: number): T[];
}

export interface BandScale {
  domain: string[];
  range: [number, number];
  bandwidth(): number;
  gap(): number;
  map(value: string): number;
  ticks(): string[];
}

export interface LinearScaleConfig {
  clamp?: boolean;
  domain: MaybeSignal<[number, number]>;
  nice?: boolean;
  range: MaybeSignal<[number, number]>;
}

export interface TimeScaleConfig {
  domain: MaybeSignal<[Date, Date]>;
  nice?: boolean;
  range: MaybeSignal<[number, number]>;
}

export interface BandScaleConfig {
  domain: MaybeSignal<string[]>;
  padding?: number;
  paddingOuter?: number;
  range: MaybeSignal<[number, number]>;
}

// ─── Axis Types ──────────────────────────────────────────────────────────────

export type AxisPosition = 'bottom' | 'left' | 'right' | 'top';

export interface GridConfig {
  color?: string;
  dash?: string;
}

export interface AxisConfig {
  grid?: GridConfig | boolean;
  label?: string;
  position: AxisPosition;
  tickCount?: number;
  tickFormat?: (value: unknown) => string;
}

// ─── Interaction Types ───────────────────────────────────────────────────────

export interface TooltipConfig {
  offset?: number;
  render?: (point: DataPoint, series: Series) => string;
}

export interface CrosshairConfig {
  horizontal?: boolean;
  snap?: boolean;
  vertical?: boolean;
}

export interface ChartEvent {
  originalEvent: MouseEvent;
  point: DataPoint;
  series: Series;
}

// ─── Legend Types ────────────────────────────────────────────────────────────

export type LegendPosition = 'bottom' | 'left' | 'right' | 'top';

export interface LegendConfig {
  position?: LegendPosition;
}

// ─── Animation Types ─────────────────────────────────────────────────────────

export interface TransitionConfig {
  duration?: number;
  easing?: 'ease-in' | 'ease-in-out' | 'ease-out' | 'linear' | ((t: number) => number);
  stagger?: number;
}

// ─── Chart Config Types ──────────────────────────────────────────────────────

export interface LineSeriesConfig extends Series {
  curve?: 'linear' | 'monotone' | 'step';
  pointRadius?: number;
  showPoints?: boolean;
  strokeWidth?: number;
}

export interface LineChartConfig {
  ariaLabel?: string;
  crosshair?: CrosshairConfig | boolean;
  legend?: LegendConfig | boolean;
  margin?: Partial<ChartMargin>;
  series: MaybeSignal<LineSeriesConfig[]>;
  tooltip?: TooltipConfig | boolean;
  transition?: TransitionConfig;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
}

export interface BarSeriesConfig extends Series {
  borderRadius?: number;
  mode?: 'grouped' | 'stacked';
}

export interface BarChartConfig {
  ariaLabel?: string;
  legend?: LegendConfig | boolean;
  margin?: Partial<ChartMargin>;
  orientation?: 'horizontal' | 'vertical';
  series: MaybeSignal<BarSeriesConfig[]>;
  tooltip?: TooltipConfig | boolean;
  transition?: TransitionConfig;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
}

export interface AreaSeriesConfig extends Series {
  curve?: 'linear' | 'monotone' | 'step';
  fillOpacity?: number;
  showLine?: boolean;
  stacked?: boolean;
}

export interface AreaChartConfig {
  ariaLabel?: string;
  crosshair?: CrosshairConfig | boolean;
  legend?: LegendConfig | boolean;
  margin?: Partial<ChartMargin>;
  series: MaybeSignal<AreaSeriesConfig[]>;
  tooltip?: TooltipConfig | boolean;
  transition?: TransitionConfig;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
}

// ─── Theme Types ─────────────────────────────────────────────────────────────

export interface PrismTheme {
  axisColor: string;
  colors: string[];
  fontFamily: string;
  fontSize: string;
  gridColor: string;
  textColor: string;
}
