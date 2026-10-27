import type { EasingName } from './animation/easing';

// ─── Theme ───────────────────────────────────────────────────────────────────

export interface PrismTheme {
  /** Structural axis line/tick color (`--prism-axis-color`). */
  axisColor?: string;
  colors?: string[];
  fontFamily?: string;
  gridColor?: string;
  gridOpacity?: number;
  /** Primary label text color (`--prism-text-color`). */
  textColor?: string;
  /** Secondary label text color (`--prism-text-color-secondary`). */
  textColorSecondary?: string;
  /** Tooltip background (`--prism-tooltip-bg`). */
  tooltipBg?: string;
  /** Tooltip border (`--prism-tooltip-border`). */
  tooltipBorder?: string;
  /** Tooltip text color (`--prism-tooltip-color`). */
  tooltipColor?: string;
}

/** Where `setTheme()`/`resetTheme()` write custom properties: `scope` targets one subtree, omitted means `document.documentElement`. */
export interface ThemeScope {
  readonly scope?: HTMLElement;
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
 * - **Scatter**: `opacity` fades this datum's own point marker; `dash` is ignored.
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
   * line charts it also fades this datum's own point marker, and on scatter
   * charts it fades only that marker.
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
  /**
   * Render exactly these ticks instead of scale-generated ones (gridlines follow).
   * Values must match the axis's scale kind: numbers on a linear axis, `Date`s on a
   * time axis, category strings on a band axis. Off-scale values warn in development
   * and render at the scale's default position for unknown values.
   */
  tickValues?: ReadonlyArray<Date | number | string>;
}

export type XAxisConfig = AxisConfig<HorizontalAxisPosition>;
export type YAxisConfig = AxisConfig<VerticalAxisPosition>;

// ─── Interaction Types ───────────────────────────────────────────────────────

export interface TooltipConfig {
  offset?: number;
  render?: (datum: Datum, series: Series) => Node | string;
  /**
   * Formats the focused key shown as the tooltip title (default: the key's display
   * label, e.g. `'11'` or a localized date). Applied to the spoken summary too.
   */
  titleFormat?: (key: Date | number | string) => string;
  /**
   * Formats each row's value (default: `String(value)`). Applied to the spoken
   * summary too, so screen-reader output matches the visual rows.
   */
  valueFormat?: (value: number, datum: Datum, series: Series) => string;
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
  /** Every series' datum at the same key, in series order (line, area, bar). Scatter events omit it. */
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
  /** Milliseconds per animated lane. Defaults to 300 (420 for a line entrance, 400 for radar). */
  duration?: number;
  easing?: EasingName | ((t: number) => number);
  /** `system` (the default) skips animation when the user prefers reduced motion. */
  preference?: 'always' | 'never' | 'system';
  /**
   * Per-lane delay in milliseconds: bars on a bar chart, points (in x order) on a
   * scatter chart, series on a radar chart. Bar and scatter charts cap the effective
   * value so many marks stay under ~400 ms of added delay; other chart types use it
   * as given.
   */
  stagger?: number;
}

/**
 * Chart motion is on by default. Pass `false` to render every update synchronously,
 * `true` for the defaults, or a {@link TransitionConfig} to tune duration, easing,
 * stagger, or the reduced-motion behavior.
 */
export type TransitionOption = TransitionConfig | boolean;

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
  /** Motion is on by default; `false` renders every update synchronously. */
  transition?: TransitionOption;
  /** Omitted renders the axis with defaults; `false` suppresses it. */
  xAxis?: XAxisConfig | false;
  /** Omitted renders the axis with defaults; `false` suppresses it. */
  yAxis?: YAxisConfig | false;
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
  /**
   * Paint each bar's value at its end so the chart reads without hover.
   * Stacked variants label the stack total at the top of the stack. Labels
   * that would overflow the plot flip inside the bar with a contrasting fill.
   */
  showValues?: boolean;
  /** Formats the value labels. Defaults to `String`. */
  valueFormat?: (value: number) => string;
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

// ─── Scatter Types ───────────────────────────────────────────────────────────

export interface ScatterSeriesConfig extends Series<ContinuousDatum> {
  /** Point marker radius for this series. Defaults to 3. */
  pointRadius?: number;
}

/**
 * Two-dimensional scatter plot: each datum's `key` is its x position and its
 * `value` its y position, so a point is an independent `(x, y)` pair rather than
 * one sample at a shared key. The y domain is fitted to the data (zero is not forced).
 */
export interface ScatterChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  series: ScatterSeriesConfig[];
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

// ─── Heatmap Types ────────────────────────────────────────────────────────────

export interface HeatmapCell {
  /** The column label this cell belongs to; must match one of the config's `columns`. */
  column: string;
  /** The row label this cell belongs to; must match one of the config's `rows`. */
  row: string;
  /** A `null` value renders as a missing cell (`emptyColor`, no in-cell text). */
  value: number | null;
}

export interface HeatmapEvent {
  /** The cell as given in the data; `undefined` for a cell the data never carried. */
  cell: HeatmapCell | undefined;
  column: string;
  originalEvent: Event;
  row: string;
}

/** The payload accepted by a heatmap chart handle's `update()`. */
export interface HeatmapData {
  cells: HeatmapCell[];
  columns?: string[];
  domain?: [number, number];
  rowSummary?: HeatmapChartConfig['rowSummary'];
  rows?: string[];
}

export interface HeatmapChartConfig
  extends Omit<BaseChartConfig, 'legend' | 'onClick' | 'onHover' | 'transition' | 'xAxis' | 'yAxis'> {
  /** Labels the bin swatches (default: `'<60'`, `'60–70'`, `'≥90'` style from the thresholds). */
  binLabel?: (from: number | null, to: number | null) => string;
  /**
   * Ascending thresholds that turn the ramp into discrete steps (e.g. `[60, 70, 80, 90]`):
   * a value falls in the first bin whose threshold exceeds it. With bins set, the chart
   * shows a swatch legend by default; without them the ramp is continuous.
   */
  bins?: number[];
  cells: HeatmapCell[];
  /**
   * Ramp colors low → high (default a light-to-deep blue). Parseable colors
   * (`#hex`/`rgb()`) interpolate continuously; CSS vars and named colors select
   * the nearest step instead.
   */
  colorRange?: string[];
  columns: string[];
  /** Value range the ramp spans. Defaults to `[min, max]` of the finite cell values. */
  domain?: [number, number];
  /** Fill for missing (`null`-valued or absent) cells. Defaults to the theme's grid color. */
  emptyColor?: string;
  /** Label for the missing-cell swatch in the legend; the swatch is hidden when omitted. */
  emptyLabel?: string;
  /** Gap between cells in px. Defaults to `2`. */
  gap?: number;
  /** Swatch legend. Defaults to on with `bins`, off without. */
  legend?: boolean;
  onCellClick?: (event: HeatmapEvent) => void;
  onCellHover?: (event: HeatmapEvent | null) => void;
  /**
   * A summary column painted right of the grid, one pre-formatted text per row
   * (aligned with `rows`; `null` renders as a dash). Useful for a per-row rate
   * the cells alone don't show, since floor-omitted cells hide their denominator.
   */
  rowSummary?: { header?: string; values: (string | null)[] };
  rows: string[];
  /** Show each cell's formatted value inside it. Defaults to `true`. */
  showValues?: boolean;
  /** Formats in-cell values, tooltip values, and bin labels. Defaults to `String`. */
  valueFormat?: (value: number) => string;
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
  /** Motion is on by default; `false` renders every update synchronously. */
  transition?: TransitionOption;
  variant?: SparklineVariant;
}
