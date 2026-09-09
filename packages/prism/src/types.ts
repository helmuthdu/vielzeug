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

export interface ChartHandle<TData = unknown> {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly el: SVGSVGElement;
  update(data: TData): void;
  [Symbol.dispose](): void;
}

// ─── Data Types ──────────────────────────────────────────────────────────────

/**
 * A single data point in a cartesian chart series.
 * `key` is the x-axis identity (number, Date, or string category).
 * `value` is the measured quantity on the y-axis.
 */
export interface Datum<TKey extends Date | number | string = Date | number | string> {
  key: TKey;
  meta?: Record<string, unknown>;
  value: number;
}

export type ContinuousDatum = Datum<Date | number>;

export interface Series<TDatum extends Datum = Datum> {
  color?: string;
  data: TDatum[];
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

export type HorizontalAxisPosition = 'bottom' | 'top';
export type VerticalAxisPosition = 'left' | 'right';
export type AxisPosition = HorizontalAxisPosition | VerticalAxisPosition;

export interface GridConfig {
  color?: string;
  dash?: string;
}

export interface AxisConfig<TPosition extends AxisPosition = AxisPosition> {
  grid?: GridConfig | boolean;
  label?: string;
  position?: TPosition;
  tickCount?: number;
  tickFormat?: (value: Date | number | string) => string;
}

export type XAxisConfig = AxisConfig<HorizontalAxisPosition>;
export type YAxisConfig = AxisConfig<VerticalAxisPosition>;

// ─── Interaction Types ───────────────────────────────────────────────────────

export interface TooltipConfig {
  offset?: number;
  render?: (datum: Datum, series: Series) => Node | string;
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
  originalEvent: Event;
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
  preference?: 'always' | 'never' | 'system';
  stagger?: number;
}

// ─── Chart Config Types ──────────────────────────────────────────────────────

export type ChartA11y =
  | { readonly decorative: true }
  | {
      readonly ariaLabel: string;
      readonly decorative?: false;
    };

export interface BaseChartConfig {
  /** Explicit decorative/informative accessibility intent. */
  a11y?: ChartA11y;
  legend?: LegendConfig | boolean;
  margin?: Partial<ChartMargin>;
  onClick?: (event: ChartEvent) => void;
  onHover?: (event: ChartEvent | null) => void;
  tooltip?: TooltipConfig | boolean;
  transition?: TransitionConfig;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
}

export interface LineSeriesConfig extends Series<ContinuousDatum> {
  curve?: 'linear' | 'monotone' | 'step';
  pointRadius?: number;
  showPoints?: boolean;
  strokeWidth?: number;
}

export interface LineChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  series: LineSeriesConfig[];
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
  series: BarSeriesConfig[];
  variant?: BarVariant;
}

export interface AreaSeriesConfig extends Series<ContinuousDatum> {
  curve?: 'linear' | 'monotone' | 'step';
  fillOpacity?: number;
  showLine?: boolean;
}

export interface AreaChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  series: AreaSeriesConfig[];
}

// ─── Pie / Donut Types ───────────────────────────────────────────────────────

export type PieVariant = 'donut' | 'pie' | 'semi';

export interface PieSliceConfig {
  color?: string;
  label?: string;
  value: number;
}

export interface PieChartConfig extends Omit<BaseChartConfig, 'margin' | 'onClick' | 'onHover' | 'xAxis' | 'yAxis'> {
  cornerRadius?: number;
  data: PieSliceConfig[];
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
  a11y?: ChartA11y;
  color?: string;
  cornerRadius?: number;
  curve?: 'linear' | 'monotone' | 'step';
  data: number[] | StackSegment[];
  fillOpacity?: number;
  onClick?: (index: number, value: number) => void;
  onHover?: (index: number | null, value: number | null) => void;
  padPixels?: number;
  strokeWidth?: number;
  transition?: TransitionConfig;
  variant?: SparklineVariant;
}
