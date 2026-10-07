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

/**
 * Runtime observation event delivered to {@link ChartHandle.tap} handlers.
 *
 * - `resize`: the container's content box changed size and the chart re-laid-out.
 * - `dispose`: the chart was disposed; emitted once, before teardown completes.
 */
export type PrismEvent =
  | { readonly height: number; readonly type: 'resize'; readonly width: number }
  | { readonly type: 'dispose' };

export interface ChartHandle<TData = unknown> {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly el: SVGSVGElement;
  /**
   * Observes runtime behavior (resize, dispose) outside the render path.
   * Returns an unsubscribe function; pass `signal` to detach automatically.
   * Handler errors are swallowed: observation never affects chart behavior.
   */
  tap(handler: (event: PrismEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  update(data: TData): void;
  [Symbol.dispose](): void;
}

// ─── Data Types ──────────────────────────────────────────────────────────────

/**
 * A single data point in a cartesian chart series.
 * `key` is the x-axis identity (number, Date, or string category).
 * `value` is the measured quantity on the y-axis.
 *
 * `dash` and `opacity` style this datum's marks without splitting the series.
 * A typical use is a forecast tail: datums past "today" carry
 * `{ dash: '5 5', opacity: 0.4 }` while real datums stay default-styled.
 *
 * Support is per chart type:
 *
 * - **Bar**: both fields apply to this datum's own `rect`.
 * - **Line**: `dash` styles the segment from this datum to the next one
 *   (Chart.js-style segment semantics); the last datum's `dash` has no segment
 *   to paint and is ignored. `opacity` fades that same segment *and* this
 *   datum's own point marker.
 * - **Area**: both fields style the top line's segment from this datum to the
 *   next one (last datum's `dash` ignored); the fill keeps the series-level
 *   treatment.
 * - **Sparkline, pie, radar**: ignored.
 *
 * Absent fields keep the series/theme default; setting them never changes
 * interaction, tooltip, or accessibility behavior.
 */
export interface Datum<TKey extends Date | number | string = Date | number | string> {
  /**
   * `stroke-dasharray` for this datum's marks, e.g. `'5 5'`.
   * On line/area charts this starts a dashed run at this datum's segment.
   */
  dash?: string;
  key: TKey;
  meta?: Record<string, unknown>;
  /**
   * Opacity multiplier (0-1) for this datum's marks, e.g. `0.4`.
   * On line/area charts this fades this datum's segment to the next point; on
   * line charts it also fades this datum's own point marker.
   */
  opacity?: number;
  value: number;
}

export type ContinuousDatum = Datum<Date | number>;

export interface Series<TDatum extends Datum = Datum> {
  color?: string;
  data: TDatum[];
  /**
   * Stable identifier rendered as `data-series-id` on the chart's series group,
   * for tooltips, tests, and external CSS. Characters outside `[A-Za-z0-9_-]`
   * are replaced with `-`. Defaults to `series-<index>`, which only stays
   * stable while the series order does; set `id` to survive reordering.
   */
  id?: string;
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
   * the nearest datum regardless of this setting: only the crosshair line's
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
  /** Every series' datum at the same key, in series order (line, area, bar). */
  values?: SeriesValue[];
}

export interface SeriesValue {
  datum: Datum | undefined;
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
  /** Value axis for this series; defaults to the left axis. */
  yAxis?: 'left' | 'right';
}

export interface LineChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  /** Independent right-side value axis for series assigned to it. */
  rightYAxis?: Omit<YAxisConfig, 'position' | 'grid'>;
  series: LineSeriesConfig[];
}

export interface BarSeriesConfig extends Series {
  borderRadius?: number;
}

/**
 * `grouped`: vertical grouped bars (default)
 * `stacked`: vertical stacked bars
 * `grouped-horizontal`: horizontal grouped bars
 * `stacked-horizontal`: horizontal stacked bars
 */
export type BarVariant = 'grouped' | 'grouped-horizontal' | 'stacked' | 'stacked-horizontal';

export interface BarChartConfig extends BaseChartConfig {
  series: BarSeriesConfig[];
  variant?: BarVariant;
}

export interface AreaSeriesConfig extends Series<ContinuousDatum> {
  curve?: 'linear' | 'monotone' | 'step';
  /** `gradient` (default) fades toward the baseline. */
  fill?: 'gradient' | 'solid';
  /** Overrides the `--prism-area-opacity` theme token. */
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

/** Interaction event for one pie/donut/semi slice. */
export interface PieEvent {
  index: number;
  originalEvent: Event;
  slice: PieSliceConfig;
}

export interface PieChartConfig extends Omit<BaseChartConfig, 'margin' | 'onClick' | 'onHover' | 'xAxis' | 'yAxis'> {
  cornerRadius?: number;
  data: PieSliceConfig[];
  innerRadius?: number;
  onClick?: (event: PieEvent) => void;
  onHover?: (event: PieEvent | null) => void;
  padPixels?: number;
  variant?: PieVariant;
}

// ─── Radar Types ─────────────────────────────────────────────────────────────

export interface RadarAxisConfig {
  format?: (value: number) => string;
  /** Matches `Datum.key` in each series. */
  key: string;
  label: string;
  /** Overrides the chart `domain` for this axis. */
  max?: number;
  min?: number;
}

export type RadarSeriesConfig = Series<Datum<string>>;

export interface RadarGridConfig {
  /** Alternate shaded rings. Defaults to `true`. */
  bands?: boolean;
  /** Show level values along the first axis; only drawn when every axis shares one domain. Defaults to `false`. */
  labels?: boolean;
  /** Number of rings. Defaults to `4`. */
  levels?: number;
  shape?: 'circle' | 'polygon';
}

export interface RadarAxisValue {
  datum: Datum<string> | undefined;
  series: RadarSeriesConfig;
}

export interface RadarEvent {
  axis: RadarAxisConfig;
  index: number;
  originalEvent: Event;
  values: RadarAxisValue[];
}

export interface RadarChartConfig extends Omit<BaseChartConfig, 'margin' | 'onClick' | 'onHover' | 'xAxis' | 'yAxis'> {
  axes: RadarAxisConfig[];
  curve?: 'linear' | 'rounded';
  /** Shared value range. Defaults to `[0, nice max of the data]`. */
  domain?: [number, number];
  fill?: 'gradient' | 'none' | 'solid';
  grid?: RadarGridConfig | boolean;
  onClick?: (event: RadarEvent) => void;
  onHover?: (event: RadarEvent | null) => void;
  series: RadarSeriesConfig[];
  showPoints?: boolean;
  showValues?: boolean;
  /** Degrees clockwise from 12 o'clock for the first axis. Defaults to `0`. */
  startAngle?: number;
}

// ─── Sparkline Types ──────────────────────────────────────────────────────────

export type SparklineVariant = 'area' | 'bar' | 'line' | 'stack';

export interface StackSegment {
  color?: string;
  label?: string;
  value: number;
}

/** Interaction event for one sparkline value. */
export interface SparklineEvent {
  index: number;
  originalEvent: Event;
  value: number;
}

export interface SparklineConfig {
  a11y?: ChartA11y;
  color?: string;
  cornerRadius?: number;
  curve?: 'linear' | 'monotone' | 'step';
  data: number[] | StackSegment[];
  /** Overrides the `--prism-spark-fill-opacity` theme token (area variant). */
  fillOpacity?: number;
  onClick?: (event: SparklineEvent) => void;
  onHover?: (event: SparklineEvent | null) => void;
  padPixels?: number;
  /** Dot on the latest value (line and area variants). Defaults to `true`. */
  showEndPoint?: boolean;
  strokeWidth?: number;
  transition?: TransitionConfig;
  variant?: SparklineVariant;
}
