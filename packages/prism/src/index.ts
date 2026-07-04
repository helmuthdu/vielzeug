// Public API — all exports for @vielzeug/prism

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

// Error classes
export { PrismDisposedError, PrismError, PrismRenderError } from './errors';

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

// Animation utilities (for plugin authors)
export { animate } from './animation/transition';
export type { AnimationTarget } from './animation/transition';
export type { EasingFn } from './animation/easing';

// Interaction types (useful for plugin authors)
export type { LegendState } from './interaction/legend';
export type { TooltipState } from './interaction/tooltip';

// SVG primitives (for plugin authors)
export type { Point } from './svg/path';

// Scaffold types (for authors building a custom chart factory on `createChartScaffold`/
// `createRadialScaffold` — not the type passed to `ChartPlugin.install()`, see `ChartPluginContext` for that)
export type { ChartEventHandlers, RadialScaffoldContext, ScaffoldContext, ScaffoldGroups } from './core/chart-scaffold';

// Theme utilities
export { resetTheme, seriesColor, setTheme } from './theme';
