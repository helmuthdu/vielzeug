import type { ReadonlySignal } from '@vielzeug/ripple';

// ─── Reactive Utility ────────────────────────────────────────────────────────

export type MaybeSignal<T> = ReadonlySignal<T> | T;

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface PrismTheme {
  colors?: string[];
  fontFamily?: string;
  gridColor?: string;
  gridOpacity?: number;
}

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
  readonly domain: readonly [T, T];
  invert(pixel: number): T;
  map(value: T): number;
  readonly range: readonly [number, number];
  ticks(count?: number): T[];
}

export type XScale = Scale<Date> | Scale<number>;

export interface BandScale {
  bandwidth(): number;
  readonly domain: readonly string[];
  gap(): number;
  map(value: string): number;
  readonly range: readonly [number, number];
  ticks(count?: number): string[];
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
  tickFormat?: (value: Date | number | string) => string;
}

// ─── Interaction Types ───────────────────────────────────────────────────────

export interface TooltipConfig {
  offset?: number;
  /**
   * Custom HTML renderer for the tooltip. The returned string is set via `innerHTML` —
   * ensure any user-supplied data (series names, data point values) is sanitized before
   * interpolation to prevent XSS.
   */
  render?: (point: DataPoint, series: Series) => string;
  /**
   * Optional sanitizer applied to the `render` output before DOM injection.
   * Use this to plug in DOMPurify or a similar HTML sanitizer.
   * @example sanitize: (html) => DOMPurify.sanitize(html)
   */
  sanitize?: (html: string) => string;
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

// ─── Plugin Types ────────────────────────────────────────────────────────────

export interface ChartPlugin {
  dispose(): void;
  install(svg: SVGSVGElement, container: HTMLElement): void;
}

// ─── Chart Config Types ──────────────────────────────────────────────────────

export interface BaseChartConfig {
  ariaLabel?: string;
  legend?: LegendConfig | boolean;
  margin?: Partial<ChartMargin>;
  onClick?: (event: ChartEvent) => void;
  onHover?: (event: ChartEvent | null) => void;
  plugins?: ChartPlugin[];
  tooltip?: TooltipConfig | boolean;
  transition?: TransitionConfig;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
}

export interface LineSeriesConfig extends Series {
  curve?: 'linear' | 'monotone' | 'step';
  pointRadius?: number;
  showPoints?: boolean;
  strokeWidth?: number;
}

export interface LineChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  series: MaybeSignal<LineSeriesConfig[]>;
}

export interface BarSeriesConfig extends Series {
  borderRadius?: number;
}

/**
 * `grouped`            — vertical grouped bars (default)
 * `stacked`            — vertical stacked bars
 * `grouped-horizontal` — horizontal grouped bars
 * `stacked-horizontal` — horizontal stacked bars
 */
export type BarVariant = 'grouped' | 'grouped-horizontal' | 'stacked' | 'stacked-horizontal';

export interface BarChartConfig extends BaseChartConfig {
  series: MaybeSignal<BarSeriesConfig[]>;
  variant?: BarVariant;
}

export interface AreaSeriesConfig extends Series {
  curve?: 'linear' | 'monotone' | 'step';
  fillOpacity?: number;
  showLine?: boolean;
}

export interface AreaChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  series: MaybeSignal<AreaSeriesConfig[]>;
}

// ─── Pie / Donut Types ───────────────────────────────────────────────────────

export type PieVariant = 'donut' | 'pie' | 'semi';

export interface PieSliceConfig {
  color?: string;
  label?: string;
  value: number;
}

export interface PieChartConfig extends Omit<BaseChartConfig, 'onClick' | 'onHover' | 'xAxis' | 'yAxis'> {
  cornerRadius?: number;
  data: MaybeSignal<PieSliceConfig[]>;
  innerRadius?: number;
  onClick?: (slice: PieSliceConfig, index: number) => void;
  onHover?: (slice: PieSliceConfig | null, index: number | null) => void;
  padPixels?: number;
  variant?: PieVariant;
}

// ─── Sparkline Types ──────────────────────────────────────────────────────────

export type SparklineVariant = 'area' | 'bar' | 'line' | 'stack';

export interface StackSegment {
  color?: string;
  label?: string;
  value: number;
}

export interface SparklineConfig {
  ariaLabel?: string;
  color?: string;
  cornerRadius?: number;
  curve?: 'linear' | 'monotone' | 'step';
  data: MaybeSignal<number[] | StackSegment[]>;
  fillOpacity?: number;
  onClick?: (index: number, value: number) => void;
  onHover?: (index: number | null, value: number | null) => void;
  padPixels?: number;
  strokeWidth?: number;
  transition?: TransitionConfig;
  variant?: SparklineVariant;
}
