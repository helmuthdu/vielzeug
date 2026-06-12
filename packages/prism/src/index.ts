// Public API — all exports for @vielzeug/prism

export type {
  AreaChartConfig,
  AreaSeriesConfig,
  AxisConfig,
  AxisPosition,
  BandScale,
  BandScaleConfig,
  BarChartConfig,
  BarSeriesConfig,
  BarVariant,
  BaseChartConfig,
  ChartDimensions,
  ChartEvent,
  ChartHandle,
  ChartMargin,
  ChartPlugin,
  CrosshairConfig,
  DataPoint,
  GridConfig,
  LegendConfig,
  LegendPosition,
  LineChartConfig,
  LineSeriesConfig,
  LinearScaleConfig,
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
  TimeScaleConfig,
  TooltipConfig,
  TransitionConfig,
  XScale,
} from './types';

// Chart factories
export { createAreaChart } from './charts/area';
export { createBarChart } from './charts/bar';
export { createLineChart } from './charts/line';
export { createPieChart } from './charts/pie';
export { createSparkline } from './charts/sparkline';

// Scale factories
export { bandScale } from './scales/band';
export { linearScale } from './scales/linear';
export { timeScale } from './scales/time';

// Scale utilities
export { buildXScale, buildYScale } from './core/cartesian-scales';

// Animation utilities (for plugin authors)
export { animate } from './animation/transition';
export type { AnimationTarget } from './animation/transition';
export type { EasingFn } from './animation/easing';

// Interaction types (useful for plugin authors)
export type { LegendState } from './interaction/legend';
export type { TooltipState } from './interaction/tooltip';

// SVG primitives (for plugin authors)
export type { Point } from './svg/path';

// Scaffold types (for typed plugins)
export type { ChartEventHandlers, ScaffoldContext, ScaffoldGroups } from './core/chart-scaffold';

// Theme utilities
export { seriesColor, setTheme } from './theme';
