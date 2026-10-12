// Public API: all exports for @vielzeug/prism

export type { EasingFn, EasingName } from './animation/easing';
// Chart factories
export { createAreaChart } from './charts/area';
export { createBarChart } from './charts/bar';
export { createLineChart } from './charts/line';
export { createPieChart } from './charts/pie';
export { createRadarChart } from './charts/radar';
export { createScatterChart } from './charts/scatter';
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
  PieEvent,
  PieSliceConfig,
  PieVariant,
  PrismEvent,
  PrismTheme,
  RadarAxisConfig,
  RadarAxisValue,
  RadarChartConfig,
  RadarEvent,
  RadarGridConfig,
  RadarSeriesConfig,
  Scale,
  ScatterChartConfig,
  ScatterSeriesConfig,
  Series,
  SeriesValue,
  SparklineConfig,
  SparklineEvent,
  SparklineVariant,
  StackSegment,
  ThemeScope,
  TooltipConfig,
  TransitionConfig,
  TransitionOption,
  VerticalAxisPosition,
  XAxisConfig,
  YAxisConfig,
} from './types';
