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
  ChartDimensions,
  ChartEvent,
  ChartHandle,
  ChartMargin,
  CrosshairConfig,
  DataPoint,
  GridConfig,
  LegendConfig,
  LegendPosition,
  LineChartConfig,
  LineSeriesConfig,
  LinearScaleConfig,
  MaybeSignal,
  PrismTheme,
  Scale,
  Series,
  TimeScaleConfig,
  TooltipConfig,
  TransitionConfig,
} from './types';

// Chart factories
export { createAreaChart } from './charts/area';
export { createBarChart } from './charts/bar';
export { createLineChart } from './charts/line';

// Scale factories
export { bandScale } from './scales/band';
export { linearScale } from './scales/linear';
export { timeScale } from './scales/time';

// Theme utilities
export { getSeriesColor, PRISM_COLORS } from './theme';
