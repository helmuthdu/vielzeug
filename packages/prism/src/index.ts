// Public API — all exports for @vielzeug/prism

export type { EasingFn } from './animation/easing';
export type { AnimationTarget } from './animation/transition';
// Animation utilities (for plugin authors)
export { animate } from './animation/transition';
// Chart factories
export { createAreaChart } from './charts/area';
export { createBarChart } from './charts/bar';
export { createLineChart } from './charts/line';
export { createPieChart } from './charts/pie';
export { createSparkline } from './charts/sparkline';
// Error classes
export { PrismError, PrismRenderError } from './errors';
// Interaction types (useful for plugin authors)
export type { LegendState } from './interaction/legend';
export type { TooltipState } from './interaction/tooltip';
// Scale factories
export { bandScale } from './scales/band';
export { linearScale } from './scales/linear';
export { timeScale } from './scales/time';
// SVG primitives (for plugin authors)
export type { Point } from './svg/path';
// Theme utilities
export { resetTheme, seriesColor, setTheme } from './theme';
export type {
  AreaChartConfig,
  AreaSeriesConfig,
  AxisConfig,
  AxisPosition,
  BandScale,
  BarChartConfig,
  BarSeriesConfig,
  BarVariant,
  BaseChartConfig,
  ChartA11y,
  ChartDimensions,
  ChartEvent,
  ChartHandle,
  ChartMargin,
  ChartPlugin,
  ChartPluginContext,
  CrosshairConfig,
  Datum,
  GridConfig,
  LegendConfig,
  LegendPosition,
  LineChartConfig,
  LineSeriesConfig,
  MaybeSignal,
  PieChartConfig,
  PieSliceConfig,
  PieVariant,
  PrismTheme,
  Scale,
  Series,
  SparklineConfig,
  SparklineVariant,
  StackSegment,
  TooltipConfig,
  TransitionConfig,
} from './types';
