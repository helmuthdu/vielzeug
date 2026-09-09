// Public API — all exports for @vielzeug/prism

export type { EasingFn } from './animation/easing';
// Chart factories
export { createAreaChart } from './charts/area';
export { createBarChart } from './charts/bar';
export { createLineChart } from './charts/line';
export { createPieChart } from './charts/pie';
export { createSparkline } from './charts/sparkline';
// Error classes
export { PrismError, PrismRenderError } from './errors';
// Scale factories
export { bandScale } from './scales/band';
export { linearScale } from './scales/linear';
export { timeScale } from './scales/time';
export type { BandScaleConfig, LinearScaleConfig, TimeScaleConfig } from './scales/types';
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
  ContinuousDatum,
  CrosshairConfig,
  Datum,
  GridConfig,
  HorizontalAxisPosition,
  LegendConfig,
  LegendPosition,
  LineChartConfig,
  LineSeriesConfig,
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
  VerticalAxisPosition,
  XAxisConfig,
  YAxisConfig,
} from './types';
