import type { Readable } from '@vielzeug/ripple';

// ─── Reactive Utility ────────────────────────────────────────────────────────

export type MaybeSignal<T> = Readable<T> | T;

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
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly el: SVGSVGElement;
  [Symbol.dispose](): void;
}

// ─── Data Types ──────────────────────────────────────────────────────────────

/**
 * A single data point in a cartesian chart series.
 * `key` is the x-axis identity (number, Date, or string category).
 * `value` is the measured quantity on the y-axis.
 */
export interface Datum {
  key: Date | number | string;
  meta?: Record<string, unknown>;
  value: number;
}

export interface Series {
  color?: string;
  data: MaybeSignal<Datum[]>;
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

export interface BandScale {
  bandwidth(): number;
  readonly domain: readonly string[];
  gap(): number;
  map(value: string): number;
  readonly range: readonly [number, number];
  ticks(count?: number): string[];
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
  /**
   * Axis position. Defaults to `'bottom'` for `xAxis` and `'left'` for `yAxis`
   * when not specified.
   */
  position?: AxisPosition;
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
  render?: (datum: Datum, series: Series) => string;
  /**
   * Optional sanitizer applied to the `render` output before DOM injection.
   * Use this to plug in DOMPurify or a similar HTML sanitizer.
   * @example sanitize: (html) => DOMPurify.sanitize(html)
   */
  sanitize?: (html: string) => string;
}

export interface CrosshairConfig {
  /** Show the horizontal crosshair line. Defaults to `false`. */
  horizontal?: boolean;
  /**
   * Whether the crosshair snaps to the nearest datum (default `true`) or follows
   * the raw mouse position (`false`). Tooltip/`onHover` data is always based on
   * the nearest datum regardless of this setting — only the crosshair line's
   * position is affected.
   */
  snap?: boolean;
  /** Show the vertical crosshair line. Defaults to `true`. */
  vertical?: boolean;
}

export interface ChartEvent {
  datum: Datum;
  originalEvent: MouseEvent;
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

export interface ChartPluginContext {
  container: HTMLElement;
  dimensions: Readable<ChartDimensions>;
  /** Aborted when the chart is disposed — plugins can tie their own cleanup to this instead of relying solely on `dispose()`. */
  disposalSignal: AbortSignal;
  svg: SVGSVGElement;
}

export interface ChartPlugin {
  dispose(): void;
  install(ctx: ChartPluginContext): void;
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

export interface SparklineConfig extends Pick<BaseChartConfig, 'ariaLabel' | 'transition'> {
  color?: string;
  cornerRadius?: number;
  curve?: 'linear' | 'monotone' | 'step';
  data: MaybeSignal<number[] | StackSegment[]>;
  fillOpacity?: number;
  onClick?: (index: number, value: number) => void;
  onHover?: (index: number | null, value: number | null) => void;
  padPixels?: number;
  strokeWidth?: number;
  variant?: SparklineVariant;
}
