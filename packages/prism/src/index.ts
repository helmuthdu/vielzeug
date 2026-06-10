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

// Theme utilities
export { seriesColor, setTheme } from './types';
