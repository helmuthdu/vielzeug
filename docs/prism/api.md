---
title: Prism — API Reference
description: Complete chart, scale, theme, handle, configuration, and error contracts for @vielzeug/prism.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createLineChart()` | Render a line chart | Sync | Line keys must be numbers or dates |
| `createAreaChart()` | Render an area chart | Sync | Line keys must be numbers or dates |
| `createBarChart()` | Render grouped or stacked bars | Sync | Stacked negative values are clamped to zero |
| `createPieChart()` | Render pie, donut, or semi-circle slices | Sync | Event callbacks use slice/index arguments |
| `createSparkline()` | Render an inline line, area, bar, or stack | Sync | Omitted `a11y` makes the chart decorative |
| `linearScale()` | Create a numeric scale | Sync | `nice` defaults to `true` |
| `timeScale()` | Create a date scale | Sync | Invalid dates produce an invalid domain |
| `bandScale()` | Create a categorical scale | Sync | Unknown categories map to `0` and warn in development |
| `setTheme()` | Set Prism CSS custom properties | Sync | Values apply to `document.documentElement` |
| `resetTheme()` | Remove Prism theme overrides | Sync | Removes only properties managed by `setTheme()` |
| `seriesColor()` | Resolve a series palette color | Sync | Palette indexes wrap after eight colors |
| `debugChart()` | Log chart lifecycle events | Sync | Import from `@vielzeug/prism/devtools` |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/prism` | Chart factories, scales, theme helpers, errors, and public types |
| `@vielzeug/prism/theme` | Default CSS custom properties and dark-mode values |
| `@vielzeug/prism/devtools` | Optional `debugChart()` lifecycle logging |

## Chart Factories

### `createLineChart()`

```ts
function createLineChart(
  container: HTMLElement,
  config: LineChartConfig,
): ChartHandle<LineSeriesConfig[]>;
```

Renders a line chart and returns a handle that replaces the complete series array through `update()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the SVG and optional overlays |
| `config` | `LineChartConfig` | Initial series, axes, interaction, accessibility, and transition settings |

**Returns:** `ChartHandle<LineSeriesConfig[]>`.

```ts
import { createLineChart } from '@vielzeug/prism';

const chart = createLineChart(container, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [{ data: [{ key: 1, value: 10 }], name: 'Revenue' }],
});

chart.update([{ data: [{ key: 2, value: 20 }], name: 'Revenue' }]);
```

---

### `createAreaChart()`

```ts
function createAreaChart(
  container: HTMLElement,
  config: AreaChartConfig,
): ChartHandle<AreaSeriesConfig[]>;
```

Renders an area chart and returns a handle that replaces the complete series array through `update()`.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the SVG and optional overlays |
| `config` | `AreaChartConfig` | Initial series, axes, interaction, accessibility, and transition settings |

**Returns:** `ChartHandle<AreaSeriesConfig[]>`.

```ts
import { createAreaChart } from '@vielzeug/prism';

const chart = createAreaChart(container, {
  series: [{ data: [{ key: 1, value: 10 }], name: 'Revenue' }],
});
```

---

### `createBarChart()`

```ts
function createBarChart(
  container: HTMLElement,
  config: BarChartConfig,
): ChartHandle<BarSeriesConfig[]>;
```

Renders grouped, stacked, grouped-horizontal, or stacked-horizontal bars.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the SVG and optional overlays |
| `config` | `BarChartConfig` | Initial series, variant, axes, accessibility, and interaction settings |

**Returns:** `ChartHandle<BarSeriesConfig[]>`.

```ts
import { createBarChart } from '@vielzeug/prism';

const chart = createBarChart(container, {
  series: [{ data: [{ key: 'Open', value: 12 }], name: 'Tasks' }],
  variant: 'grouped',
});
```

---

### `createPieChart()`

```ts
function createPieChart(
  container: HTMLElement,
  config: PieChartConfig,
): ChartHandle<PieSliceConfig[]>;
```

Renders pie, donut, or semi-circle slices.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the SVG and optional overlays |
| `config` | `PieChartConfig` | Initial slices, variant, geometry, accessibility, and interaction settings |

**Returns:** `ChartHandle<PieSliceConfig[]>`.

```ts
import { createPieChart } from '@vielzeug/prism';

const chart = createPieChart(container, {
  data: [{ label: 'Complete', value: 72 }, { label: 'Remaining', value: 28 }],
  variant: 'donut',
});
```

---

### `createSparkline()`

```ts
function createSparkline(
  container: HTMLElement,
  config: SparklineConfig,
): ChartHandle<number[] | StackSegment[]>;
```

Renders a compact chart without axes, margin, or legend.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the SVG |
| `config` | `SparklineConfig` | Initial values, variant, appearance, accessibility, and callbacks |

**Returns:** `ChartHandle<number[] | StackSegment[]>`.

```ts
import { createSparkline } from '@vielzeug/prism';

const chart = createSparkline(container, { data: [2, 5, 3, 8], variant: 'area' });
chart.update([2, 5, 3, 8, 13]);
```

## Scale Factories

### `linearScale()`

```ts
function linearScale(config: LinearScaleConfig): Scale<number>;
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `domain` | `[number, number]` | — | Input extent |
| `range` | `[number, number]` | — | Output extent |
| `clamp` | `boolean` | `false` | Clamp mapped and inverted values |
| `nice` | `boolean` | `true` | Expand the domain to rounded boundaries |

**Returns:** `Scale<number>`.

```ts
import { linearScale } from '@vielzeug/prism';

const scale = linearScale({ domain: [0, 100], range: [0, 500] });
scale.map(50); // 250
```

---

### `timeScale()`

```ts
function timeScale(config: TimeScaleConfig): Scale<Date>;
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `domain` | `[Date, Date]` | — | Input date extent |
| `range` | `[number, number]` | — | Output extent |
| `nice` | `boolean` | `true` | Expand the domain to rounded interval boundaries |

**Returns:** `Scale<Date>`.

```ts
import { timeScale } from '@vielzeug/prism';

const scale = timeScale({
  domain: [new Date('2026-01-01'), new Date('2026-12-31')],
  range: [0, 500],
});
```

---

### `bandScale()`

```ts
function bandScale(config: BandScaleConfig): BandScale;
```

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `domain` | `string[]` | — | Ordered categories |
| `range` | `[number, number]` | — | Output extent |
| `padding` | `number` | `0.1` | Inner gap ratio |
| `paddingOuter` | `number` | `padding` | Outer gap ratio |

**Returns:** `BandScale`.

```ts
import { bandScale } from '@vielzeug/prism';

const scale = bandScale({ domain: ['A', 'B'], range: [0, 200] });
```

## Theme Utilities

### `setTheme()`

```ts
function setTheme(theme: PrismTheme): void;
```

Sets Prism color, font, and grid custom properties on `document.documentElement`.

### `resetTheme()`

```ts
function resetTheme(): void;
```

Removes every custom property managed by `setTheme()`.

### `seriesColor()`

```ts
function seriesColor(index: number, override?: string): string;
```

Returns `override` when provided; otherwise returns `var(--prism-color-N)` with an eight-color wrap.

## Types

### Core types

```ts
interface ChartHandle<TData = unknown> {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly el: SVGSVGElement;
  update(data: TData): void;
  dispose(): void;
  [Symbol.dispose](): void;
}

interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ChartDimensions {
  width: number;
  height: number;
  margin: ChartMargin;
}

type ChartA11y =
  | { readonly decorative: true }
  | { readonly ariaLabel: string; readonly decorative?: false };
```

`update()` renders synchronously and throws `PrismRenderError` after disposal. Omitting `a11y` makes the SVG decorative with `aria-hidden="true"`.

---

### Data types

```ts
interface Datum<TKey extends Date | number | string = Date | number | string> {
  key: TKey;
  value: number;
  meta?: Record<string, unknown>;
}

type ContinuousDatum = Datum<Date | number>;

interface Series<TDatum extends Datum = Datum> {
  name: string;
  data: TDatum[];
  color?: string;
}

interface ChartEvent {
  datum: Datum;
  series: Series;
  originalEvent: Event;
}
```

Line and area series use `ContinuousDatum`; bar series accept the complete `Datum` key range.

---

### Chart configurations

```ts
interface BaseChartConfig {
  a11y?: ChartA11y;
  legend?: boolean | LegendConfig;
  margin?: Partial<ChartMargin>;
  onClick?: (event: ChartEvent) => void;
  onHover?: (event: ChartEvent | null) => void;
  tooltip?: boolean | TooltipConfig;
  transition?: TransitionConfig;
  xAxis?: XAxisConfig;
  yAxis?: YAxisConfig;
}

interface LineChartConfig extends BaseChartConfig {
  crosshair?: boolean | CrosshairConfig;
  series: LineSeriesConfig[];
}

interface AreaChartConfig extends BaseChartConfig {
  crosshair?: boolean | CrosshairConfig;
  series: AreaSeriesConfig[];
}

interface BarChartConfig extends BaseChartConfig {
  series: BarSeriesConfig[];
  variant?: BarVariant;
}

interface PieChartConfig
  extends Omit<BaseChartConfig, 'margin' | 'onClick' | 'onHover' | 'xAxis' | 'yAxis'> {
  data: PieSliceConfig[];
  variant?: PieVariant;
  innerRadius?: number;
  cornerRadius?: number;
  padPixels?: number;
  onClick?: (slice: PieSliceConfig, index: number) => void;
  onHover?: (slice: PieSliceConfig | null, index: number | null) => void;
}

interface SparklineConfig {
  data: number[] | StackSegment[];
  variant?: SparklineVariant;
  a11y?: ChartA11y;
  color?: string;
  cornerRadius?: number;
  curve?: 'linear' | 'monotone' | 'step';
  fillOpacity?: number;
  onClick?: (index: number, value: number) => void;
  onHover?: (index: number | null, value: number | null) => void;
  padPixels?: number;
  strokeWidth?: number;
  transition?: TransitionConfig;
}
```

---

### Series and slice configurations

```ts
interface LineSeriesConfig extends Series<ContinuousDatum> {
  curve?: 'linear' | 'monotone' | 'step';
  pointRadius?: number;
  showPoints?: boolean;
  strokeWidth?: number;
}

interface AreaSeriesConfig extends Series<ContinuousDatum> {
  curve?: 'linear' | 'monotone' | 'step';
  fillOpacity?: number;
  showLine?: boolean;
}

interface BarSeriesConfig extends Series {
  borderRadius?: number;
}

interface PieSliceConfig {
  value: number;
  color?: string;
  label?: string;
}

interface StackSegment {
  value: number;
  color?: string;
  label?: string;
}
```

---

### Axis, interaction, and transition configurations

```ts
type HorizontalAxisPosition = 'bottom' | 'top';
type VerticalAxisPosition = 'left' | 'right';
type AxisPosition = HorizontalAxisPosition | VerticalAxisPosition;

interface AxisConfig<TPosition extends AxisPosition = AxisPosition> {
  grid?: boolean | GridConfig;
  label?: string;
  position?: TPosition;
  tickCount?: number;
  tickFormat?: (value: Date | number | string) => string;
}

type XAxisConfig = AxisConfig<HorizontalAxisPosition>;
type YAxisConfig = AxisConfig<VerticalAxisPosition>;

interface GridConfig {
  color?: string;
  dash?: string;
}

interface TooltipConfig {
  offset?: number;
  render?: (datum: Datum, series: Series) => Node | string;
}

interface CrosshairConfig {
  horizontal?: boolean;
  snap?: boolean;
  vertical?: boolean;
}

interface LegendConfig {
  position?: LegendPosition;
}

type LegendPosition = 'bottom' | 'left' | 'right' | 'top';

interface TransitionConfig {
  duration?: number;
  easing?: EasingFn | 'ease-in' | 'ease-in-out' | 'ease-out' | 'linear';
  preference?: 'always' | 'never' | 'system';
  stagger?: number;
}

type EasingFn = (t: number) => number;
```

Tooltip strings are assigned through `textContent`. Return a `Node` for structured content.

---

### Scale types

```ts
interface Scale<T> {
  readonly domain: readonly [T, T];
  readonly range: readonly [number, number];
  map(value: T): number;
  invert(pixel: number): T;
  ticks(count?: number): T[];
}

interface BandScale {
  readonly domain: readonly string[];
  readonly range: readonly [number, number];
  map(value: string): number;
  ticks(count?: number): string[];
  bandwidth(): number;
  gap(): number;
}

interface LinearScaleConfig {
  domain: [number, number];
  range: [number, number];
  clamp?: boolean;
  nice?: boolean;
}

interface TimeScaleConfig {
  domain: [Date, Date];
  range: [number, number];
  nice?: boolean;
}

interface BandScaleConfig {
  domain: string[];
  range: [number, number];
  padding?: number;
  paddingOuter?: number;
}
```

---

### Remaining unions and theme type

```ts
type BarVariant = 'grouped' | 'grouped-horizontal' | 'stacked' | 'stacked-horizontal';
type PieVariant = 'donut' | 'pie' | 'semi';
type SparklineVariant = 'area' | 'bar' | 'line' | 'stack';

interface PrismTheme {
  colors?: string[];
  fontFamily?: string;
  gridColor?: string;
  gridOpacity?: number;
}
```

## Devtools

### `debugChart()`

```ts
function debugChart<T extends ChartHandle>(
  handle: T,
  options?: { label?: string },
): T;
```

Logs mount, resize, and disposal events to `console.debug` and returns the same handle. Import it from `@vielzeug/prism/devtools`.

## Errors

### `PrismError`

Base class for every Prism-originated error. It supports standard `ErrorOptions` cause chaining.

### `PrismRenderError`

Extends `PrismError`. Thrown for invalid containers, failed initial renders, and attempts to update disposed charts.
