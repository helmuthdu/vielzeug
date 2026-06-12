---
title: Prism — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/prism.
---

[[toc]]

## API At a Glance

| Symbol | Purpose | Returns |
|---|---|---|
| `createLineChart()` | Reactive line chart with curves and interpolation | `ChartHandle` |
| `createBarChart()` | Bar chart: grouped, stacked, horizontal variants | `ChartHandle` |
| `createAreaChart()` | Filled area chart | `ChartHandle` |
| `linearScale()` | Continuous numeric → pixel scale | `Scale<number>` |
| `timeScale()` | Date → pixel scale | `Scale<Date>` |
| `bandScale()` | Categorical → pixel band scale | `BandScale` |
| `createSparkline()` | Minimal inline sparkline (line/area/bar) | `ChartHandle` |
| `createPieChart()` | Pie, donut, or semi-circle donut chart | `ChartHandle` |
| `seriesColor()` | CSS variable color for series index | `string` |
| `setTheme()` | Apply custom palette / CSS tokens at runtime | `void` |
| `buildXScale()` | Shared horizontal scale builder (auto time or linear) | `Scale<Date> \| Scale<number>` |
| `buildYScale()` | Shared vertical linear scale builder | `Scale<number>` |
| `devWarn()` | Dev-only console.warn helper (`/devtools` subpath) | `void` |
| `devError()` | Dev-only console.error helper (`/devtools` subpath) | `void` |

## Package Entry Points

| Import | Purpose |
|---|---|
| `@vielzeug/prism` | All chart factories, scales, types, and utilities |
| `@vielzeug/prism/theme` | Default CSS custom properties (light + dark) |
| `@vielzeug/prism/devtools` | `devWarn` / `devError` — dev-only helpers, tree-shaken in production |

---

## Chart Factories

### `createLineChart`

```ts
function createLineChart(container: HTMLElement, config: LineChartConfig): ChartHandle;
```

Creates a reactive line chart. Supports multiple series, curve interpolation, tooltips, crosshair, and event hooks.

| Parameter | Type | Description |
|---|---|---|
| `container` | `HTMLElement` | DOM element to render into (must have width/height) |
| `config` | `LineChartConfig` | Chart configuration |

**Returns** — [`ChartHandle`](#charthandle)

---

### `createBarChart`

```ts
function createBarChart(container: HTMLElement, config: BarChartConfig): ChartHandle;
```

Creates a reactive bar chart. Use `variant` to switch between grouped, stacked, horizontal variants.

| Parameter | Type | Description |
|---|---|---|
| `container` | `HTMLElement` | DOM element to render into |
| `config` | `BarChartConfig` | Chart configuration |

**Returns** — [`ChartHandle`](#charthandle)

---

### `createAreaChart`

```ts
function createAreaChart(container: HTMLElement, config: AreaChartConfig): ChartHandle;
```

Creates a reactive filled area chart with configurable opacity, curve, and event hooks.

| Parameter | Type | Description |
|---|---|---|
| `container` | `HTMLElement` | DOM element to render into |
| `config` | `AreaChartConfig` | Chart configuration |

**Returns** — [`ChartHandle`](#charthandle)

---

### `createPieChart`

```ts
function createPieChart(container: HTMLElement, config: PieChartConfig): ChartHandle;
```

Creates a pie, donut, or semi-circle donut chart. All three variants share the same `PieChartConfig` — select via `variant`.

| Parameter | Type | Description |
|---|---|---|
| `container` | `HTMLElement` | DOM element to render into (sized by CSS) |
| `config` | `PieChartConfig` | Chart configuration |

**Returns** — [`ChartHandle`](#charthandle)

---

### `createSparkline`

```ts
function createSparkline(container: HTMLElement, config: SparklineConfig): ChartHandle;
```

Creates a minimal inline chart with no axes, no legend, and no margin. Designed for use in tables, cards, and inline data contexts.

| Parameter | Type | Description |
|---|---|---|
| `container` | `HTMLElement` | DOM element to render into (sized by CSS) |
| `config` | `SparklineConfig` | Sparkline configuration |

**Returns** — [`ChartHandle`](#charthandle)

---

## Scale Factories

### `linearScale`

```ts
function linearScale(config: LinearScaleConfig): Scale<number>;
```

Continuous linear scale mapping a numeric domain to a pixel range.

| Field | Type | Default | Description |
|---|---|---|---|
| `config.domain` | `MaybeSignal<[number, number]>` | — | Input data range `[min, max]` |
| `config.range` | `MaybeSignal<[number, number]>` | — | Output pixel range `[min, max]` |
| `config.nice` | `boolean` | `true` | Extend domain to nice round numbers |
| `config.clamp` | `boolean` | `false` | Clamp output to range bounds |

---

### `timeScale`

```ts
function timeScale(config: TimeScaleConfig): Scale<Date>;
```

Time scale mapping `Date` values to pixels. Automatically selects tick intervals (seconds → years).

| Field | Type | Default | Description |
|---|---|---|---|
| `config.domain` | `MaybeSignal<[Date, Date]>` | — | Input date range `[start, end]` |
| `config.range` | `MaybeSignal<[number, number]>` | — | Output pixel range |
| `config.nice` | `boolean` | `true` | Extend domain to nice boundaries |

---

### `bandScale`

```ts
function bandScale(config: BandScaleConfig): BandScale;
```

Categorical scale dividing the range into equal bands with configurable padding.

| Field | Type | Default | Description |
|---|---|---|---|
| `config.domain` | `MaybeSignal<string[]>` | — | Category names |
| `config.range` | `MaybeSignal<[number, number]>` | — | Output pixel range |
| `config.padding` | `number` | `0.1` | Inner padding ratio (0–1) |
| `config.paddingOuter` | `number` | same as `padding` | Outer edge padding ratio |

---

## Types

### `ChartHandle`

Returned by all chart factories.

```ts
interface ChartHandle {
  readonly el: SVGSVGElement;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

| Member | Description |
|---|---|
| `el` | The root `SVGSVGElement` (for styling or external manipulation) |
| `dispose()` | Tear down all effects, observers, DOM nodes, tooltip, and legend |
| `[Symbol.dispose]()` | Same as `dispose()` — for TC39 `using` declarations |

> **Note:** Charts re-render automatically when signal data changes. There is no `update()` method — reactivity is fully automatic.

---

### `ChartEvent`

Passed to `onClick` and `onHover` callbacks.

```ts
interface ChartEvent {
  originalEvent: MouseEvent;
  point: DataPoint;
  series: Series;
}
```

---

### `ChartPlugin`

Interface for extending charts with custom behavior. Plugins are installed after the chart is mounted and destroyed on `dispose()`.

```ts
interface ChartPlugin {
  install(svg: SVGSVGElement, container: HTMLElement): void;
  destroy(): void;
}
```

---

### `BaseChartConfig`

Shared configuration inherited by all chart config types.

```ts
interface BaseChartConfig {
  ariaLabel?: string;
  legend?: boolean | LegendConfig;
  margin?: Partial<ChartMargin>;
  onClick?: (event: ChartEvent) => void;
  onHover?: (event: ChartEvent | null) => void;
  plugins?: ChartPlugin[];
  tooltip?: boolean | TooltipConfig;
  transition?: TransitionConfig;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
}
```

| Field | Type | Description |
|---|---|---|
| `ariaLabel` | `string` | Accessible label on the SVG element |
| `legend` | `boolean \| LegendConfig` | Show a series legend |
| `margin` | `Partial<ChartMargin>` | Override chart margins |
| `onClick` | `(event: ChartEvent) => void` | Fired when a data point is clicked |
| `onHover` | `(event: ChartEvent \| null) => void` | Fired on mousemove (null on mouseleave) |
| `plugins` | `ChartPlugin[]` | Extension plugins installed at mount |
| `tooltip` | `boolean \| TooltipConfig` | Hover tooltip |
| `transition` | `TransitionConfig` | Enter/update animation |
| `xAxis` | `AxisConfig` | X-axis configuration |
| `yAxis` | `AxisConfig` | Y-axis configuration |

---

### `MaybeSignal<T>`

```ts
type MaybeSignal<T> = T | ReadonlySignal<T>;
```

Accepts either a plain value or a `@vielzeug/ripple` signal. Used throughout config types for optional reactivity.

---

### `XScale`

```ts
type XScale = Scale<Date> | Scale<number>;
```

Union type for horizontal scales. The chart auto-selects `timeScale` when `x` values are `Date` instances, `linearScale` otherwise.

---

### `Scale<T>`

```ts
interface Scale<T> {
  domain: [T, T];
  range: [number, number];
  map(value: T): number;
  invert(pixel: number): T;
  ticks(count?: number): T[];
}
```

| Member | Description |
|---|---|
| `domain` | Input domain `[min, max]` |
| `range` | Output pixel range |
| `map(value)` | Domain value → pixel position |
| `invert(pixel)` | Pixel position → domain value |
| `ticks(count?)` | Nicely-spaced tick values (default: 10) |

---

### `BandScale`

```ts
interface BandScale {
  domain: string[];
  range: [number, number];
  map(value: string): number;
  bandwidth(): number;
  gap(): number;
  ticks(): string[];
}
```

| Member | Description |
|---|---|
| `map(value)` | Left edge pixel position of a category's band |
| `bandwidth()` | Width of each band in pixels |
| `gap()` | Gap between bands in pixels |
| `ticks()` | All domain categories |

---

### `DataPoint`

```ts
interface DataPoint {
  x: number | string | Date;
  y: number;
  meta?: Record<string, unknown>;
}
```

---

### `Series`

```ts
interface Series<T extends DataPoint = DataPoint> {
  name: string;
  data: MaybeSignal<T[]>;
  color?: string;
}
```

---

## Pie / Donut Types

### `PieChartConfig`

```ts
interface PieChartConfig {
  ariaLabel?: string;
  cornerRadius?: number;
  data: MaybeSignal<PieSliceConfig[]>;
  innerRadius?: number;
  onClick?: (slice: PieSliceConfig, index: number) => void;
  onHover?: (slice: PieSliceConfig | null, index: number | null) => void;
  padPixels?: number;
  plugins?: ChartPlugin[];
  tooltip?: TooltipConfig | boolean;
  transition?: TransitionConfig;
  variant?: PieVariant;
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `data` | `MaybeSignal<PieSliceConfig[]>` | — | Slice definitions |
| `variant` | `PieVariant` | `'pie'` | Chart style: `'pie'`, `'donut'`, or `'semi'` |
| `innerRadius` | `number` | `55%` of outer (donut/semi), `0` (pie) | Inner hole radius in pixels |
| `padPixels` | `number` | `4` | Pixel gap between slices (uniform across arc thickness) |
| `cornerRadius` | `number` | `6` | Rounded arc corners (pixels) |
| `tooltip` | `boolean \| TooltipConfig` | — | Hover tooltip |
| `plugins` | `ChartPlugin[]` | — | Extension plugins installed at mount |
| `transition` | `TransitionConfig` | `duration: 400` | Enter animation |
| `onClick` | `(slice, index) => void` | — | Fired on slice click |
| `onHover` | `(slice\|null, index\|null) => void` | — | Fired on hover; `null` on mouseleave |
| `ariaLabel` | `string` | — | Accessible label on the SVG element |

### `PieSliceConfig`

```ts
interface PieSliceConfig {
  color?: string;
  label?: string;
  value: number;
}
```

| Field | Type | Description |
|---|---|---|
| `value` | `number` | Numeric weight of the slice |
| `color` | `string` | Slice fill color; defaults to `--prism-color-{n}` |
| `label` | `string` | Optional text rendered at the arc centroid |

### `PieVariant`

```ts
type PieVariant = 'donut' | 'pie' | 'semi';
```

- **`pie`** — full circle, no hole
- **`donut`** — full circle with inner hole (~55% of outer radius by default)
- **`semi`** — top-half semicircle with inner hole (useful for gauges/progress)

---

## Sparkline Types

### `SparklineConfig`

```ts
interface SparklineConfig {
  color?: string;
  cornerRadius?: number;
  curve?: 'linear' | 'monotone' | 'step';
  data: MaybeSignal<number[] | StackSegment[]>;
  fillOpacity?: number;
  onClick?: (index: number, value: number) => void;
  onHover?: (index: number | null, value: number | null) => void;
  padPixels?: number;
  strokeWidth?: number;
  transition?: TransitionConfig;
  variant?: SparklineVariant;
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `data` | `MaybeSignal<number[] \| StackSegment[]>` | — | Numeric values, or `StackSegment[]` for `'stack'` variant |
| `variant` | `SparklineVariant` | `'line'` | Chart style |
| `color` | `string` | `var(--prism-color-1)` | Stroke/fill color (line/area/bar only) |
| `curve` | `'linear' \| 'monotone' \| 'step'` | `'linear'` | Line interpolation (line/area only) |
| `strokeWidth` | `number` | `1.5` | Line stroke width (line/area only) |
| `fillOpacity` | `number` | `0.2` | Fill opacity (area only) |
| `cornerRadius` | `number` | `0` | Bar corner radius in pixels (bar/stack only) |
| `padPixels` | `number` | `2` | Gap between stack segments in pixels (stack only) |
| `transition` | `TransitionConfig` | — | Enter animation |
| `onClick` | `(index, value) => void` | — | Called on click with nearest data index |
| `onHover` | `(index\|null, value\|null) => void` | — | Called on mousemove; `null` on mouseleave |

### `SparklineVariant`

```ts
type SparklineVariant = 'area' | 'bar' | 'line' | 'stack';
```

- **`line`** — polyline path (default)
- **`area`** — filled area + line overlay
- **`bar`** — vertical bar per data point
- **`stack`** — horizontal proportional segments; use `StackSegment[]` for `data` with per-segment colors

### `StackSegment`

```ts
interface StackSegment {
  color?: string;
  label?: string;
  value: number;
}
```

> **Accessibility:** The sparkline SVG is marked `aria-hidden="true"` — provide surrounding text context for screen readers.

---

## Chart Config Types

### `LineChartConfig`

Extends [`BaseChartConfig`](#basechartconfig).

```ts
interface LineChartConfig extends BaseChartConfig {
  series: MaybeSignal<LineSeriesConfig[]>;
  crosshair?: boolean | CrosshairConfig;
}
```

### `LineSeriesConfig`

```ts
interface LineSeriesConfig extends Series {
  curve?: 'linear' | 'monotone' | 'step';  // default: 'linear'
  strokeWidth?: number;                      // default: 2
  showPoints?: boolean;                      // default: false
  pointRadius?: number;                      // default: 3
}
```

---

### `BarChartConfig`

Extends [`BaseChartConfig`](#basechartconfig).

```ts
type BarVariant =
  | 'grouped'             // vertical grouped (default)
  | 'stacked'             // vertical stacked
  | 'grouped-horizontal'  // horizontal grouped
  | 'stacked-horizontal'; // horizontal stacked

interface BarChartConfig extends BaseChartConfig {
  series: MaybeSignal<BarSeriesConfig[]>;
  variant?: BarVariant;   // default: 'grouped'
}
```

### `BarSeriesConfig`

```ts
interface BarSeriesConfig extends Series {
  borderRadius?: number;  // default: 0
}
```

---

### `AreaChartConfig`

Extends [`BaseChartConfig`](#basechartconfig).

```ts
interface AreaChartConfig extends BaseChartConfig {
  series: MaybeSignal<AreaSeriesConfig[]>;
  crosshair?: boolean | CrosshairConfig;
}
```

### `AreaSeriesConfig`

```ts
interface AreaSeriesConfig extends Series {
  curve?: 'linear' | 'monotone' | 'step';  // default: 'linear'
  fillOpacity?: number;                      // default: 0.3
  showLine?: boolean;                        // default: true
}
```

---

## Shared Config Types

### `AxisConfig`

```ts
interface AxisConfig {
  position: 'top' | 'bottom' | 'left' | 'right';
  tickCount?: number;
  tickFormat?: (value: unknown) => string;
  label?: string;
  grid?: boolean | GridConfig;
}
```

### `GridConfig`

```ts
interface GridConfig {
  color?: string;
  dash?: string;  // SVG stroke-dasharray value, e.g. '4 2'
}
```

### `TooltipConfig`

```ts
interface TooltipConfig {
  offset?: number;                                         // default: 8
  render?: (point: DataPoint, series: Series) => string;  // returns HTML string
}
```

The tooltip is appended inside the chart container (not `document.body`), so it is automatically scoped and cleaned up on `dispose()`.

### `CrosshairConfig`

```ts
interface CrosshairConfig {
  vertical?: boolean;    // default: true
  horizontal?: boolean;  // default: false
  snap?: boolean;        // default: true
}
```

### `LegendConfig`

```ts
interface LegendConfig {
  position?: 'top' | 'bottom' | 'left' | 'right';  // default: 'bottom'
}
```

### `TransitionConfig`

```ts
interface TransitionConfig {
  duration?: number;  // ms, default: 300
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | ((t: number) => number);
  stagger?: number;   // ms delay between bar enter animations, default: 0
}
```

> **`stagger`** applies only to bar chart enter animations — new bars grow in sequence with a `stagger`ms delay between each one.

### `ChartMargin`

```ts
interface ChartMargin {
  top: number;     // default: 20
  right: number;   // default: 20
  bottom: number;  // default: 40
  left: number;    // default: 50
}
```

---

## Utilities

### `buildXScale`

```ts
function buildXScale(allX: (Date | number)[], width: number): Scale<Date> | Scale<number>;
```

Builds a horizontal scale from an array of all X values. Automatically selects `timeScale` when values are `Date` instances, `linearScale` otherwise. Used internally by `createLineChart` and `createAreaChart` — also available for custom visualizations.

| Parameter | Type | Description |
|---|---|---|
| `allX` | `(Date \| number)[]` | All X values across all series |
| `width` | `number` | Chart area width in pixels |

---

### `buildYScale`

```ts
function buildYScale(allY: number[], height: number): Scale<number>;
```

Builds a vertical scale from all Y values. Domain minimum is clamped to `0` unless negative values are present.

| Parameter | Type | Description |
|---|---|---|
| `allY` | `number[]` | All Y values across all series |
| `height` | `number` | Chart area height in pixels |

---

### `seriesColor`

```ts
function seriesColor(index: number, override?: string): string;
```

Returns the CSS variable reference for palette color at `index` (wraps at 8). If `override` is provided it is returned as-is. Used internally by all chart factories.

```ts
import { seriesColor } from '@vielzeug/prism';

seriesColor(0);           // 'var(--prism-color-1)'
seriesColor(0, '#ff0')   // '#ff0'
```

### `setTheme`

```ts
interface PrismTheme {
  colors?: string[];      // replaces --prism-color-1 … -8
  fontFamily?: string;    // sets --prism-font-family
  gridColor?: string;     // sets --prism-grid-color
  gridOpacity?: number;   // sets --prism-grid-opacity
}

function setTheme(theme: PrismTheme): void;
```

Applies CSS custom properties to `document.documentElement`. Call once at app startup before mounting charts.

```ts
import { setTheme } from '@vielzeug/prism';

setTheme({ colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981'] });
```

> Both `seriesColor` and `setTheme` are exported from `@vielzeug/prism` (not from the `/theme` CSS subpath).

---

## Devtools

> **Import:** `@vielzeug/prism/devtools`

Dev-only helpers. Both functions are no-ops when `globalThis.__PRISM_PROD__` is `true` (set by bundlers via `define`), so they are tree-shaken from production builds.

### `devWarn`

```ts
function devWarn(msg: string): void;
```

Emits `console.warn('[prism] <msg>')` in development. Silent in production.

### `devError`

```ts
function devError(msg: string): void;
```

Emits `console.error('[prism] <msg>')` in development. Silent in production.

```ts
import { devWarn } from '@vielzeug/prism/devtools';

// In a plugin:
if (!container.offsetParent) devWarn('Chart container appears to be detached from the DOM.');
```
