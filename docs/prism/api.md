---
title: Prism — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/prism.
---

[[toc]]

## API Overview

| Symbol               | Purpose                                               | Returns                        |
| -------------------- | ----------------------------------------------------- | ------------------------------ |
| `createLineChart()`  | Reactive line chart with curves and interpolation     | `ChartHandle`                  |
| `createBarChart()`   | Bar chart: grouped, stacked, horizontal variants      | `ChartHandle`                  |
| `createAreaChart()`  | Filled area chart                                     | `ChartHandle`                  |
| `linearScale()`      | Continuous numeric → pixel scale                      | `Scale<number>`                |
| `timeScale()`        | Date → pixel scale                                    | `Scale<Date>`                  |
| `bandScale()`        | Categorical → pixel band scale                        | `BandScale`                    |
| `createSparkline()`  | Minimal inline sparkline (line/area/bar)              | `ChartHandle`                  |
| `createPieChart()`   | Pie, donut, or semi-circle donut chart                | `ChartHandle`                  |
| `seriesColor()`      | CSS variable color for series index                   | `string`                       |
| `setTheme()`         | Apply custom palette / CSS tokens at runtime          | `void`                         |
| `resetTheme()`       | Clear all custom theme overrides back to defaults     | `void`                         |
| `animate()`          | Animate SVG element attributes via RAF                | `() => void` (cancel function) |
| `debugChart()`       | Wrap a `ChartHandle` with lifecycle logging (`/devtools` subpath) | `ChartHandle`       |
| `PrismError`         | Base class for all prism-originated errors            | class                          |
| `LegendState`        | Live legend state object (plugin API)                 | type                           |
| `TooltipState`       | Live tooltip state object (plugin API)                | type                           |
| `ChartPluginContext` | Context object passed to `ChartPlugin.install()`      | type                           |

## Package Entry Points

| Import                     | Purpose                                                                    |
| -------------------------- | --------------------------------------------------------------------------- |
| `@vielzeug/prism`          | All chart factories, scales, types, and utilities                           |
| `@vielzeug/prism/theme`    | Default CSS custom properties (light + dark)                                |
| `@vielzeug/prism/devtools` | `debugChart()` — opt-in `console.debug` lifecycle logging, tree-shaken in production |

---

## Chart Factories

### `createLineChart`

```ts
function createLineChart(container: HTMLElement, config: LineChartConfig): ChartHandle;
```

Creates a reactive line chart. Supports multiple series, curve interpolation, tooltips, crosshair, and event hooks.

| Parameter   | Type              | Description                                         |
| ----------- | ----------------- | --------------------------------------------------- |
| `container` | `HTMLElement`     | DOM element to render into (must have width/height) |
| `config`    | `LineChartConfig` | Chart configuration                                 |

**Returns** — [`ChartHandle`](#charthandle)

---

### `createBarChart`

```ts
function createBarChart(container: HTMLElement, config: BarChartConfig): ChartHandle;
```

Creates a reactive bar chart. Use `variant` to switch between grouped, stacked, horizontal variants.

| Parameter   | Type             | Description                |
| ----------- | ---------------- | -------------------------- |
| `container` | `HTMLElement`    | DOM element to render into |
| `config`    | `BarChartConfig` | Chart configuration        |

**Returns** — [`ChartHandle`](#charthandle)

---

### `createAreaChart`

```ts
function createAreaChart(container: HTMLElement, config: AreaChartConfig): ChartHandle;
```

Creates a reactive filled area chart with configurable opacity, curve, and event hooks.

| Parameter   | Type              | Description                |
| ----------- | ----------------- | -------------------------- |
| `container` | `HTMLElement`     | DOM element to render into |
| `config`    | `AreaChartConfig` | Chart configuration        |

**Returns** — [`ChartHandle`](#charthandle)

---

### `createPieChart`

```ts
function createPieChart(container: HTMLElement, config: PieChartConfig): ChartHandle;
```

Creates a pie, donut, or semi-circle donut chart. All three variants share the same `PieChartConfig` — select via `variant`.

| Parameter   | Type             | Description                               |
| ----------- | ---------------- | ----------------------------------------- |
| `container` | `HTMLElement`    | DOM element to render into (sized by CSS) |
| `config`    | `PieChartConfig` | Chart configuration                       |

**Returns** — [`ChartHandle`](#charthandle)

---

### `createSparkline`

```ts
function createSparkline(container: HTMLElement, config: SparklineConfig): ChartHandle;
```

Creates a minimal inline chart with no axes, no legend, and no margin. Designed for use in tables, cards, and inline data contexts.

| Parameter   | Type              | Description                               |
| ----------- | ----------------- | ----------------------------------------- |
| `container` | `HTMLElement`     | DOM element to render into (sized by CSS) |
| `config`    | `SparklineConfig` | Sparkline configuration                   |

**Returns** — [`ChartHandle`](#charthandle)

---

## Scale Factories

### `linearScale`

```ts
function linearScale(config: LinearScaleConfig): Scale<number>;
```

Continuous linear scale mapping a numeric domain to a pixel range. Unlike chart config fields, scale factory config is not `MaybeSignal` — pass plain values and call `linearScale()` again if the domain/range changes.

| Field           | Type               | Default | Description                                                     |
| --------------- | ------------------ | ------- | ----------------------------------------------------------------- |
| `config.domain` | `[number, number]` | —       | Input data range `[min, max]`. A reversed domain (`min > max`) is supported for inverted axes. |
| `config.range`  | `[number, number]` | —       | Output pixel range `[min, max]`                                   |
| `config.nice`   | `boolean`           | `true`  | Extend domain to nice round numbers                                |
| `config.clamp`  | `boolean`           | `false` | Clamp output to range bounds                                       |

---

### `timeScale`

```ts
function timeScale(config: TimeScaleConfig): Scale<Date>;
```

Time scale mapping `Date` values to pixels. Automatically selects tick intervals (seconds → years).

| Field           | Type              | Default | Description                      |
| --------------- | ----------------- | ------- | -------------------------------- |
| `config.domain` | `[Date, Date]`     | —       | Input date range `[start, end]`  |
| `config.range`  | `[number, number]` | —       | Output pixel range               |
| `config.nice`   | `boolean`          | `true`  | Extend domain to nice boundaries |

---

### `bandScale`

```ts
function bandScale(config: BandScaleConfig): BandScale;
```

Categorical scale dividing the range into equal bands with configurable padding.

| Field                 | Type               | Default           | Description               |
| --------------------- | ------------------ | ----------------- | ------------------------- |
| `config.domain`       | `string[]`          | —                 | Category names            |
| `config.range`        | `[number, number]`  | —                 | Output pixel range        |
| `config.padding`      | `number`            | `0.1`             | Inner padding ratio (0–1) |
| `config.paddingOuter` | `number`            | same as `padding` | Outer edge padding ratio  |

---

## Types

### `ChartHandle`

Returned by all chart factories.

```ts
interface ChartHandle {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly el: SVGSVGElement;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

| Member               | Description                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `el`                 | The root `SVGSVGElement` (for styling or external manipulation)                                 |
| `disposed`           | `true` once `dispose()` has run; useful for guarding late callbacks                              |
| `disposalSignal`     | Aborted when the chart is disposed — tie your own cleanup (RAF loops, observers) to this instead of overriding `dispose()` |
| `dispose()`          | Tear down all effects, observers, DOM nodes, tooltip, and legend. Calling it more than once is a no-op |
| `[Symbol.dispose]()` | Same as `dispose()` — for TC39 `using` declarations                                              |

> **Note:** Charts re-render automatically when signal data changes. There is no `update()` method — reactivity is fully automatic.

---

### `ChartEvent`

Passed to `onClick` and `onHover` callbacks.

```ts
interface ChartEvent {
  datum: Datum;
  originalEvent: MouseEvent;
  series: Series;
}
```

---

### `ChartPlugin`

Interface for extending charts with custom behavior. Plugins are installed after the chart is mounted and torn down on `dispose()`.

```ts
interface ChartPlugin {
  install(ctx: ChartPluginContext): void;
  dispose(): void;
}
```

See [`ChartPluginContext`](#chartplugincontext) for the object passed to `install()`.

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

| Field        | Type                                  | Description                             |
| ------------ | ------------------------------------- | --------------------------------------- |
| `ariaLabel`  | `string`                              | Accessible label on the SVG element     |
| `legend`     | `boolean \| LegendConfig`             | Show a series legend                    |
| `margin`     | `Partial<ChartMargin>`                | Override chart margins                  |
| `onClick`    | `(event: ChartEvent) => void`         | Fired when a data point is clicked      |
| `onHover`    | `(event: ChartEvent \| null) => void` | Fired on mousemove (null on mouseleave) |
| `plugins`    | `ChartPlugin[]`                       | Extension plugins installed at mount    |
| `tooltip`    | `boolean \| TooltipConfig`            | Hover tooltip                           |
| `transition` | `TransitionConfig`                    | Enter/update animation                  |
| `xAxis`      | `AxisConfig`                          | X-axis configuration                    |
| `yAxis`      | `AxisConfig`                          | Y-axis configuration                    |

---

### `MaybeSignal<T>`

```ts
type MaybeSignal<T> = Readable<T> | T;
```

Accepts either a plain value or a `@vielzeug/ripple` `Readable<T>` signal (e.g. one created with `signal()`). Used for `series`/`data` fields on chart configs — when a signal is passed, the chart re-renders automatically on `.value` changes. Not used by the scale factories (`linearScale`/`timeScale`/`bandScale`), whose config fields are always plain values.

---

### `Scale<T>`

```ts
interface Scale<T> {
  readonly domain: readonly [T, T];
  readonly range: readonly [number, number];
  map(value: T): number;
  invert(pixel: number): T;
  ticks(count?: number): T[];
}
```

| Member          | Description                                         |
| --------------- | --------------------------------------------------- |
| `domain`        | Input domain `[min, max]` — readonly computed tuple |
| `range`         | Output pixel range — readonly computed tuple        |
| `map(value)`    | Domain value → pixel position                       |
| `invert(pixel)` | Pixel position → domain value                       |
| `ticks(count?)` | Nicely-spaced tick values (default: 10)             |

---

### `BandScale`

```ts
interface BandScale {
  readonly domain: readonly string[];
  readonly range: readonly [number, number];
  map(value: string): number;
  bandwidth(): number;
  gap(): number;
  ticks(count?: number): string[];
}
```

| Member          | Description                                                     |
| --------------- | --------------------------------------------------------------- |
| `map(value)`    | Left edge pixel position of a category's band                   |
| `bandwidth()`   | Width of each band in pixels                                    |
| `gap()`         | Pixel gap between adjacent bands (`bandwidth × padding`)        |
| `ticks(count?)` | All domain categories, or at most `count` evenly sampled values |

---

### `Point`

```ts
interface Point {
  x: number;
  y: number;
}
```

A pixel-space 2D point used by path builders and area renderers. Exported for plugin authors who build custom SVG paths.

---

### `Datum`

A single data point in a cartesian chart series.

```ts
interface Datum {
  key: Date | number | string;
  value: number;
  meta?: Record<string, unknown>;
}
```

| Field   | Type                       | Description                                                                               |
| ------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| `key`   | `Date \| number \| string` | X-axis identity. Use `number` or `Date` for line/area charts; `string` for bar categories |
| `value` | `number`                   | Y-axis measured quantity                                                                  |
| `meta`  | `Record<string, unknown>`  | Optional arbitrary metadata (available in tooltip `render` callbacks)                     |

---

### `Series`

```ts
interface Series {
  name: string;
  data: MaybeSignal<Datum[]>;
  color?: string;
}
```

---

### `ScaffoldContext`

Passed to `renderFn` inside `createChartScaffold` — the internal building block behind `createLineChart`/`createBarChart`/`createAreaChart`. Relevant only if you're building a custom cartesian chart type on top of prism's scaffold, not to `ChartPlugin.install()` (see [`ChartPluginContext`](#chartplugincontext) for that).

```ts
interface ScaffoldContext {
  chartArea: SVGGElement;
  container: HTMLElement;
  dimensions: Readable<ChartDimensions>;
  disposalSignal: AbortSignal;
  groups: ScaffoldGroups;
  legend: LegendState | null;
  svg: SVGSVGElement;
  tooltip: TooltipState | null;
}
```

---

### `RadialScaffoldContext`

The `createRadialScaffold` counterpart to `ScaffoldContext`, for chart types with no cartesian axis groups (pie, donut, semi). Backs `createPieChart`.

```ts
interface RadialScaffoldContext {
  container: HTMLElement;
  dimensions: Readable<ChartDimensions>;
  disposalSignal: AbortSignal;
  legend: LegendState | null;
  svg: SVGSVGElement;
  tooltip: TooltipState | null;
}
```

---

### `ScaffoldGroups`

```ts
interface ScaffoldGroups {
  grid: SVGGElement;
  series: SVGGElement;
  xAxis: SVGGElement;
  yAxis: SVGGElement;
}
```

SVG `<g>` elements created by `createChartScaffold`. Children of `chartArea`, appended in render order: `grid` → `xAxis` → `yAxis` → `series`.

---

### `ChartEventHandlers`

```ts
interface ChartEventHandlers {
  onClick?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
}
```

Returned by the `renderFn` passed to `createChartScaffold`. The scaffold attaches and tears down these listeners automatically before each re-render.

---

### `AnimationTarget`

```ts
interface AnimationTarget {
  attrs: Record<string, { from: number; to: number }>;
  el: SVGElement;
}
```

One element + attribute map for use with `animate()`. Each attribute entry specifies the start (`from`) and end (`to`) pixel value.

---

## Pie / Donut Types

### `PieChartConfig`

Extends [`BaseChartConfig`](#basechartconfig) (inherits `ariaLabel`, `legend`, `margin`, `plugins`, `tooltip`, `transition`). Overrides `onClick`/`onHover` with pie-specific slice signatures.

```ts
interface PieChartConfig extends Omit<BaseChartConfig, 'onClick' | 'onHover' | 'xAxis' | 'yAxis'> {
  cornerRadius?: number;
  data: MaybeSignal<PieSliceConfig[]>;
  innerRadius?: number;
  onClick?: (slice: PieSliceConfig, index: number) => void;
  onHover?: (slice: PieSliceConfig | null, index: number | null) => void;
  padPixels?: number;
  variant?: PieVariant;
}
```

| Field          | Type                                 | Default                                | Description                                             |
| -------------- | ------------------------------------ | -------------------------------------- | ------------------------------------------------------- |
| `data`         | `MaybeSignal<PieSliceConfig[]>`      | —                                      | Slice definitions                                       |
| `variant`      | `PieVariant`                         | `'pie'`                                | Chart style: `'pie'`, `'donut'`, or `'semi'`            |
| `innerRadius`  | `number`                             | `55%` of outer (donut/semi), `0` (pie) | Inner hole radius in pixels                             |
| `padPixels`    | `number`                             | `0` (pie), `8` (donut/semi)            | Pixel gap between slices (uniform across arc thickness) |
| `cornerRadius` | `number`                             | `0` (pie), `8` (donut/semi)            | Rounded arc corners (pixels)                            |
| `onClick`      | `(slice, index) => void`             | —                                      | Fired on slice click                                    |
| `onHover`      | `(slice\|null, index\|null) => void` | —                                      | Fired on hover; `null` on mouseleave                    |

> Inherited `BaseChartConfig` fields (`tooltip`, `transition`, `legend`, `margin`, `ariaLabel`, `plugins`) behave identically to other chart types.

### `PieSliceConfig`

```ts
interface PieSliceConfig {
  color?: string;
  label?: string;
  value: number;
}
```

| Field   | Type     | Description                                       |
| ------- | -------- | ------------------------------------------------- |
| `value` | `number` | Numeric weight of the slice                       |
| `color` | `string` | Slice fill color; defaults to `--prism-color-{n}` |
| `label` | `string` | Optional text rendered at the arc centroid        |

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
  ariaLabel?: string;
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

| Field          | Type                                      | Default                | Description                                                                                                    |
| -------------- | ----------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| `data`         | `MaybeSignal<number[] \| StackSegment[]>` | —                      | Numeric values, or `StackSegment[]` for `'stack'` variant                                                      |
| `variant`      | `SparklineVariant`                        | `'line'`               | Chart style                                                                                                    |
| `color`        | `string`                                  | `var(--prism-color-1)` | Stroke/fill color (line/area/bar only)                                                                         |
| `curve`        | `'linear' \| 'monotone' \| 'step'`        | `'linear'`             | Line interpolation (line/area only)                                                                            |
| `strokeWidth`  | `number`                                  | `1.5`                  | Line stroke width (line/area only)                                                                             |
| `fillOpacity`  | `number`                                  | `0.2`                  | Fill opacity (area only)                                                                                       |
| `cornerRadius` | `number`                                  | `4`                    | Rounded corners for stack segments in pixels. Stack variant only — no effect on line/area/bar                  |
| `padPixels`    | `number`                                  | `0`                    | Gap between stack segments in pixels. Stack variant only — no effect on line/area/bar                          |
| `ariaLabel`    | `string`                                  | —                      | Accessible label; sets `role="img"` on the SVG. If omitted the SVG is marked `aria-hidden="true"` (decorative) |
| `transition`   | `TransitionConfig`                        | —                      | Enter animation (bar/stack only; line/area use RAF interpolation)                                              |
| `onClick`      | `(index, value) => void`                  | —                      | Called on click with nearest data index. Not fired for 0- or 1-point data                                      |
| `onHover`      | `(index\|null, value\|null) => void`      | —                      | Called on mousemove; `null` on mouseleave. Not fired for 0- or 1-point data                                    |

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

> **Accessibility:** Without `ariaLabel` the SVG is marked `aria-hidden="true"` (decorative). Set `ariaLabel` to expose the chart to assistive technology — the SVG will carry `role="img"` and the provided label.

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
  curve?: 'linear' | 'monotone' | 'step'; // default: 'linear'
  strokeWidth?: number; // default: 2
  showPoints?: boolean; // default: false
  pointRadius?: number; // default: 3
}
```

---

### `BarChartConfig`

Extends [`BaseChartConfig`](#basechartconfig).

```ts
type BarVariant =
  | 'grouped' // vertical grouped (default)
  | 'stacked' // vertical stacked
  | 'grouped-horizontal' // horizontal grouped
  | 'stacked-horizontal'; // horizontal stacked

interface BarChartConfig extends BaseChartConfig {
  series: MaybeSignal<BarSeriesConfig[]>;
  variant?: BarVariant; // default: 'grouped'
}
```

### `BarSeriesConfig`

```ts
interface BarSeriesConfig extends Series {
  borderRadius?: number; // default: 0
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
  curve?: 'linear' | 'monotone' | 'step'; // default: 'linear'
  fillOpacity?: number; // default: 0.3
  showLine?: boolean; // default: true
}
```

---

## Shared Config Types

### `AxisConfig`

```ts
interface AxisConfig {
  position: 'top' | 'bottom' | 'left' | 'right';
  tickCount?: number;
  tickFormat?: (value: Date | number | string) => string;
  label?: string;
  grid?: boolean | GridConfig;
}
```

### `GridConfig`

```ts
interface GridConfig {
  color?: string;
  dash?: string; // SVG stroke-dasharray value, e.g. '4 2'
}
```

### `TooltipConfig`

```ts
interface TooltipConfig {
  offset?: number; // default: 8
  render?: (datum: Datum, series: Series) => string; // returns HTML string
  sanitize?: (html: string) => string; // applied before innerHTML injection
}
```

The tooltip is appended inside the chart container (not `document.body`), so it is automatically scoped and cleaned up on `dispose()`.

> ⚠️ **Security:** The string returned by `render` is injected via `innerHTML`. Pass `sanitize` to apply a sanitizer (e.g. DOMPurify) before injection, or ensure all user-supplied values are escaped before interpolation. A `warn` is emitted in development when `render` is set without `sanitize`.

### `CrosshairConfig`

```ts
interface CrosshairConfig {
  vertical?: boolean; // default: true
  horizontal?: boolean; // default: false
  snap?: boolean; // default: true
}
```

### `LegendConfig`

```ts
interface LegendConfig {
  position?: 'top' | 'bottom' | 'left' | 'right'; // default: 'bottom'
}
```

### `TransitionConfig`

```ts
interface TransitionConfig {
  duration?: number; // ms, default: 300
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | ((t: number) => number);
  stagger?: number; // ms delay between bar enter animations, default: 0
}
```

> **`stagger`** applies only to bar chart enter animations — new bars grow in sequence with a `stagger`ms delay between each one.

### `ChartMargin`

```ts
interface ChartMargin {
  top: number; // default: 20
  right: number; // default: 20
  bottom: number; // default: 40
  left: number; // default: 50
}
```

---

## Utilities

### `seriesColor`

```ts
function seriesColor(index: number, override?: string): string;
```

Returns the CSS variable reference for palette color at `index` (wraps at 8). If `override` is provided it is returned as-is. Used internally by all chart factories.

```ts
import { seriesColor } from '@vielzeug/prism';

seriesColor(0); // 'var(--prism-color-1)'
seriesColor(0, '#ff0'); // '#ff0'
```

### `setTheme`

```ts
interface PrismTheme {
  colors?: string[]; // replaces --prism-color-1 … -8
  fontFamily?: string; // sets --prism-font-family
  gridColor?: string; // sets --prism-grid-color
  gridOpacity?: number; // sets --prism-grid-opacity
}

function setTheme(theme: PrismTheme): void;
```

Applies CSS custom properties to `document.documentElement`. Call once at app startup before mounting charts. Setting `colors` clears any unset color slots left over from a previous `setTheme()` call, so a theme with fewer colors than the last one doesn't leave stale high-index colors behind.

```ts
import { setTheme } from '@vielzeug/prism';

setTheme({ colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981'] });
```

### `resetTheme`

```ts
function resetTheme(): void;
```

Clears every CSS custom property `setTheme()` can set, restoring prism's default theme (from `@vielzeug/prism/theme`). Useful for test teardown or a theme-switcher's "reset to default" action.

```ts
import { resetTheme, setTheme } from '@vielzeug/prism';

setTheme({ colors: ['#6366f1'] });
resetTheme(); // back to the default palette
```

> `seriesColor`, `setTheme`, and `resetTheme` are all exported from `@vielzeug/prism` (not from the `/theme` CSS subpath).

---

## Interaction Types

> Exported from `@vielzeug/prism` for use in plugins and custom chart extensions. Both types reflect the live state object created internally; `el` is `null` when no legend/tooltip is configured.

### `LegendState`

```ts
interface LegendState {
  dispose(): void;
  [Symbol.dispose](): void;
  el: HTMLDivElement | null;
  update(series: { color: string; name: string }[]): void;
}
```

The live legend object available on `ctx.legend` inside `ChartPlugin.install`. Call `update()` to re-render legend items, `dispose()` to remove the element.

### `TooltipState`

```ts
interface TooltipState {
  dispose(): void;
  [Symbol.dispose](): void;
  el: HTMLElement | null;
  hide(): void;
  show(x: number, y: number, datum: Datum, series: Series): void;
}
```

The live tooltip object available on `ctx.tooltip` inside `ChartPlugin.install`. `x`/`y` are pixel coordinates relative to the chart area; `show()` positions and renders the tooltip.

---

### `ChartPluginContext`

```ts
interface ChartPluginContext {
  container: HTMLElement;
  dimensions: Readable<ChartDimensions>;
  disposalSignal: AbortSignal;
  svg: SVGSVGElement;
}
```

Passed to `ChartPlugin.install(ctx)`. Gives plugins access to the reactive `dimensions` signal, the host `container`, the root `svg` element, and a `disposalSignal` aborted when the chart is torn down.

```ts
import type { ChartPlugin } from '@vielzeug/prism';
import { effect } from '@vielzeug/ripple';

const watermarkPlugin: ChartPlugin = {
  dispose() {},
  install(ctx) {
    // React to size changes
    effect(() => {
      const { width, height } = ctx.dimensions.value;
      /* re-layout watermark */
    });
  },
};
```

> **Note:** To observe future resize events use `effect(() => { ctx.dimensions.value; })` from `@vielzeug/ripple` within a reactive scope. To run cleanup when the chart is disposed without relying on your own `dispose()` implementation being called, add a listener to `ctx.disposalSignal` instead: `ctx.disposalSignal.addEventListener('abort', cleanup)`.
>
> **Error isolation:** if a plugin's `install()` or `dispose()` throws, the error is logged (dev builds only) and the rest of the chart — and any other installed plugins — continues to work. A throwing plugin never aborts chart creation or teardown.

---

## Animation Utilities

> Exported from `@vielzeug/prism` for use in plugins and custom chart extensions.

### `animate`

```ts
function animate(
  targets: AnimationTarget[],
  config?: TransitionConfig,
  onComplete?: () => void,
  signal?: AbortSignal,
): () => void;
```

Animates SVG element attributes from `from` to `to` values over the given `TransitionConfig` duration. Calls `onComplete` when all animations finish. Returns a cancel function — call it to stop the in-flight animation early (its `requestAnimationFrame` loop is cancelled and `onComplete` is not called).

- **Empty targets or `duration: 0`** — attributes are set immediately and `onComplete` is called synchronously; no RAF is scheduled. The returned cancel function is a no-op in this case.
- **Negative `stagger`** — clamped to `0`; all elements animate in parallel.
- **`signal`** — if provided and already aborted (or aborted mid-animation), the RAF loop stops rescheduling itself on its next frame, same effect as calling the returned cancel function.

**Parameters — `AnimationTarget`:**

| Field   | Type                                           | Description                       |
| ------- | ---------------------------------------------- | --------------------------------- |
| `el`    | `SVGElement`                                   | Target element                    |
| `attrs` | `Record<string, { from: number; to: number }>` | Attribute name → start/end values |

```ts
import { animate } from '@vielzeug/prism';

const cancel = animate([{ attrs: { opacity: { from: 0, to: 1 } }, el: rect }], { duration: 300, easing: 'ease-out' });

// Stop early if the element is removed before the animation completes:
cancel();
```

### `EasingFn`

```ts
type EasingFn = (t: number) => number;
```

A custom easing function. Receives a normalised time value `t ∈ [0, 1]` and returns a progress value (also typically `[0, 1]`). Pass as `TransitionConfig.easing`. Unknown or invalid easing name strings fall back to `'ease-out'` rather than throwing.

---

## Devtools

> **Import:** `@vielzeug/prism/devtools`

Opt-in debug logging, separate from the internal dev-mode validation warnings in `_dev.ts` (those run automatically and need no import). Tree-shaken from production bundles when this sub-path isn't imported — there is no environment gate to configure.

### `debugChart`

```ts
interface DebugChartOptions {
  label?: string; // defaults to 'chart', producing log prefixes like [prism:chart]
}

function debugChart<T extends ChartHandle>(handle: T, options?: DebugChartOptions): T;
```

Wraps an already-created `ChartHandle` with lifecycle logging to `console.debug`. Logs the chart's mount, every resize (via its own `ResizeObserver` on `handle.el`, independent of the chart's internal one), and disposal — each prefixed with `[prism:<label>]`. Returns the same handle unchanged, so it can wrap any `create*Chart()` call in place.

```ts
import { createLineChart } from '@vielzeug/prism';
import { debugChart } from '@vielzeug/prism/devtools';

const chart = debugChart(createLineChart(container, config), { label: 'revenue' });
// [prism:revenue] mounted
// [prism:revenue] resized  600×300
chart.dispose();
// [prism:revenue] disposed
```

---

## Errors

### `PrismError`

Base class for all prism errors. Use `instanceof PrismError` or `PrismError.is()` to catch any prism-originated error.

```ts
class PrismError extends Error {
  static is(err: unknown): err is PrismError;
}
```

**Named subclasses**

| Class                | Thrown when                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PrismRenderError`   | A chart is given a structurally invalid configuration it cannot render at all (e.g. a non-`Element` `container`). Recoverable issues like empty or malformed data emit a dev-mode warning instead — they do not throw. |
| `PrismDisposedError` | Reserved for future disposal-sensitive APIs on `ChartHandle`. No code path throws this yet — calling `dispose()` more than once is currently a documented no-op, not an error. |
