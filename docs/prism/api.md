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
| `animate()` | Animate SVG element attributes via RAF | `Promise<void>` |
| `warn()` | Dev-only console.warn helper (`/devtools` subpath) | `void` |
| `issue()` | Dev-only console.error helper (`/devtools` subpath) | `void` |
| `LegendState` | Live legend state object (plugin API) | type |
| `TooltipState` | Live tooltip state object (plugin API) | type |

## Package Entry Points

| Import | Purpose |
|---|---|
| `@vielzeug/prism` | All chart factories, scales, types, and utilities |
| `@vielzeug/prism/theme` | Default CSS custom properties (light + dark) |
| `@vielzeug/prism/devtools` | `warn` / `issue` — dev-only helpers, tree-shaken in production |

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
  readonly domain: readonly [T, T];
  readonly range: readonly [number, number];
  map(value: T): number;
  invert(pixel: number): T;
  ticks(count?: number): T[];
}
```

| Member | Description |
|---|---|
| `domain` | Input domain `[min, max]` — readonly computed tuple |
| `range` | Output pixel range — readonly computed tuple |
| `map(value)` | Domain value → pixel position |
| `invert(pixel)` | Pixel position → domain value |
| `ticks(count?)` | Nicely-spaced tick values (default: 10) |

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

| Member | Description |
|---|---|
| `map(value)` | Left edge pixel position of a category's band |
| `bandwidth()` | Width of each band in pixels |
| `gap()` | Pixel gap between adjacent bands (`bandwidth × padding`) |
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

### `ScaffoldContext`

Passed to `renderFn` inside `createChartScaffold`. Available to plugin authors via advanced extension points.

```ts
interface ScaffoldContext {
  chartArea: SVGGElement;
  container: HTMLElement;
  dimensions: Signal<ChartDimensions>;
  groups: ScaffoldGroups;
  legend: LegendState;
  svg: SVGSVGElement;
  tooltip: TooltipState;
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

| Field | Type | Default | Description |
|---|---|---|---|
| `data` | `MaybeSignal<PieSliceConfig[]>` | — | Slice definitions |
| `variant` | `PieVariant` | `'pie'` | Chart style: `'pie'`, `'donut'`, or `'semi'` |
| `innerRadius` | `number` | `55%` of outer (donut/semi), `0` (pie) | Inner hole radius in pixels |
| `padPixels` | `number` | `0` (pie), `8` (donut/semi) | Pixel gap between slices (uniform across arc thickness) |
| `cornerRadius` | `number` | `0` (pie), `8` (donut/semi) | Rounded arc corners (pixels) |
| `onClick` | `(slice, index) => void` | — | Fired on slice click |
| `onHover` | `(slice\|null, index\|null) => void` | — | Fired on hover; `null` on mouseleave |

> Inherited `BaseChartConfig` fields (`tooltip`, `transition`, `legend`, `margin`, `ariaLabel`, `plugins`) behave identically to other chart types.

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

| Field | Type | Default | Description |
|---|---|---|---|
| `data` | `MaybeSignal<number[] \| StackSegment[]>` | — | Numeric values, or `StackSegment[]` for `'stack'` variant |
| `variant` | `SparklineVariant` | `'line'` | Chart style |
| `color` | `string` | `var(--prism-color-1)` | Stroke/fill color (line/area/bar only) |
| `curve` | `'linear' \| 'monotone' \| 'step'` | `'linear'` | Line interpolation (line/area only) |
| `strokeWidth` | `number` | `1.5` | Line stroke width (line/area only) |
| `fillOpacity` | `number` | `0.2` | Fill opacity (area only) |
| `cornerRadius` | `number` | `4` (stack), `0` (bar) | Bar corner radius in pixels (bar/stack only) |
| `padPixels` | `number` | `2` | Gap between stack segments in pixels (stack only) |
| `ariaLabel` | `string` | — | Accessible label; sets `role="img"` on the SVG. If omitted the SVG is marked `aria-hidden="true"` (decorative) |
| `transition` | `TransitionConfig` | — | Enter animation (bar/stack only; line/area use RAF interpolation) |
| `onClick` | `(index, value) => void` | — | Called on click with nearest data index. Not fired for 0- or 1-point data |
| `onHover` | `(index\|null, value\|null) => void` | — | Called on mousemove; `null` on mouseleave. Not fired for 0- or 1-point data |

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
  tickFormat?: (value: Date | number | string) => string;
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
  sanitize?: (html: string) => string;                    // applied before innerHTML injection
}
```

The tooltip is appended inside the chart container (not `document.body`), so it is automatically scoped and cleaned up on `dispose()`.

> ⚠️ **Security:** The string returned by `render` is injected via `innerHTML`. Pass `sanitize` to apply a sanitizer (e.g. DOMPurify) before injection, or ensure all user-supplied values are escaped before interpolation. A `warn` is emitted in development when `render` is set without `sanitize`.

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

## Interaction Types

> Exported from `@vielzeug/prism` for use in plugins and custom chart extensions. Both types reflect the live state object created internally; `el` is `null` when no legend/tooltip is configured.

### `LegendState`

```ts
interface LegendState {
  el: HTMLDivElement | null;
  destroy(): void;
  update(series: { color: string; name: string }[]): void;
}
```

The live legend object available on `ctx.legend` inside `ChartPlugin.install`. Call `update()` to re-render legend items, `destroy()` to remove the element.

### `TooltipState`

```ts
interface TooltipState {
  destroy(): void;
  el: HTMLDivElement | null;
  hide(): void;
  show(x: number, y: number, point: DataPoint, series: Series): void;
}
```

The live tooltip object available on `ctx.tooltip` inside `ChartPlugin.install`. `x`/`y` are pixel coordinates relative to the chart area; `show()` positions and renders the tooltip.

---

## Animation Utilities

> Exported from `@vielzeug/prism` for use in plugins and custom chart extensions.

### `animate`

```ts
function animate(targets: AnimationTarget[], config?: TransitionConfig): Promise<void>;
```

Animates SVG element attributes from `from` to `to` values over the given `TransitionConfig` duration. Returns a `Promise` that resolves when all animations complete.

- **Empty targets** — if `targets` is empty the promise resolves synchronously with no RAF calls.
- **`duration: 0`** — final attribute values are set synchronously.
- **Negative `stagger`** — clamped to `0`; all elements animate in parallel.

**Parameters — `AnimationTarget`:**

| Field | Type | Description |
|---|---|---|
| `el` | `SVGElement` | Target element |
| `attrs` | `Record<string, { from: number; to: number }>` | Attribute name → start/end values |

```ts
import { animate } from '@vielzeug/prism';

await animate(
  [{ attrs: { opacity: { from: 0, to: 1 } }, el: rect }],
  { duration: 300, easing: 'ease-out' },
);
```

### `EasingFn`

```ts
type EasingFn = (t: number) => number;
```

A custom easing function. Receives a normalised time value `t ∈ [0, 1]` and returns a progress value (also typically `[0, 1]`). Pass as `TransitionConfig.easing`.

---

## Devtools

> **Import:** `@vielzeug/prism/devtools`

Dev-only helpers. Both functions are no-ops when `globalThis.__PRISM_PROD__` is `true` (set by bundlers via `define`), so they are tree-shaken from production builds.

### `warn`

```ts
function warn(msg: string): void;
```

Emits `console.warn('[prism] <msg>')` in development. Silent in production.

> ⚠️ **Security:** Warning messages may include user-supplied data (e.g. category names from `bandScale`). Avoid using sensitive values (PII, tokens) as chart category labels.

### `issue`

```ts
function issue(msg: string): void;
```

Emits `console.error('[prism] <msg>')` in development. Silent in production.

```ts
import { warn } from '@vielzeug/prism/devtools';

// In a plugin:
if (!container.offsetParent) warn('Chart container appears to be detached from the DOM.');
```
