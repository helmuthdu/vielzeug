---
title: Prism — API Reference
description: Complete type signatures, parameter docs, and return values for every export in @vielzeug/prism.
---

[[toc]]

## API At a Glance

| Symbol | Purpose | Returns |
|---|---|---|
| `createLineChart()` | Reactive line chart with curves and interpolation | `ChartHandle` |
| `createBarChart()` | Grouped/stacked bar chart | `ChartHandle` |
| `createAreaChart()` | Filled area chart | `ChartHandle` |
| `linearScale()` | Continuous numeric → pixel scale | `Scale<number>` |
| `timeScale()` | Date → pixel scale | `Scale<Date>` |
| `bandScale()` | Categorical → pixel band scale | `BandScale` |
| `getSeriesColor()` | Get palette color by index | `string` |
| `PRISM_COLORS` | Default 8-color palette array | `readonly string[]` |

## Package Entry Points

| Import | Purpose |
|---|---|
| `@vielzeug/prism` | All chart factories, scales, types, and utilities |
| `@vielzeug/prism/theme` | Default CSS custom properties (light + dark) |

---

## Chart Factories

### `createLineChart`

```ts
function createLineChart(container: HTMLElement, config: LineChartConfig): ChartHandle;
```

Creates a reactive line chart. Supports multiple series, curve interpolation, tooltips, and crosshair.

**Parameters**

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

Creates a reactive bar chart. Multiple series render as grouped bars.

**Parameters**

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

Creates a reactive filled area chart with configurable opacity and curve.

**Parameters**

| Parameter | Type | Description |
|---|---|---|
| `container` | `HTMLElement` | DOM element to render into |
| `config` | `AreaChartConfig` | Chart configuration |

**Returns** — [`ChartHandle`](#charthandle)

---

## Scale Factories

### `linearScale`

```ts
function linearScale(config: LinearScaleConfig): Scale<number>;
```

Creates a continuous linear scale mapping a numeric domain to a pixel range. Generates "nice" rounded tick values by default.

**Parameters**

| Field | Type | Default | Description |
|---|---|---|---|
| `config.domain` | `MaybeSignal<[number, number]>` | — | Input data range [min, max] |
| `config.range` | `MaybeSignal<[number, number]>` | — | Output pixel range [min, max] |
| `config.nice` | `boolean` | `true` | Extend domain to nice round numbers |
| `config.clamp` | `boolean` | `false` | Clamp output to range bounds |

---

### `timeScale`

```ts
function timeScale(config: TimeScaleConfig): Scale<Date>;
```

Creates a time scale mapping dates to pixels. Automatically selects appropriate tick intervals (seconds, minutes, hours, days, months, years).

**Parameters**

| Field | Type | Default | Description |
|---|---|---|---|
| `config.domain` | `MaybeSignal<[Date, Date]>` | — | Input date range [start, end] |
| `config.range` | `MaybeSignal<[number, number]>` | — | Output pixel range |
| `config.nice` | `boolean` | `true` | Extend domain to nice boundaries |

---

### `bandScale`

```ts
function bandScale(config: BandScaleConfig): BandScale;
```

Creates a categorical scale that divides the range into equal bands with configurable padding.

**Parameters**

| Field | Type | Default | Description |
|---|---|---|---|
| `config.domain` | `MaybeSignal<string[]>` | — | Category names |
| `config.range` | `MaybeSignal<[number, number]>` | — | Output pixel range |
| `config.padding` | `number` | `0.1` | Inner padding ratio (0–1) |
| `config.paddingOuter` | `number` | same as `padding` | Outer edge padding ratio |

---

## Types

### `ChartHandle`

Returned by all chart factories. Provides access to the rendered SVG and lifecycle methods.

```ts
interface ChartHandle {
  readonly el: SVGSVGElement;
  update(): void;
  dispose(): void;
  [Symbol.dispose](): void;
}
```

| Member | Description |
|---|---|
| `el` | The root SVG element (for external styling/manipulation) |
| `update()` | Force a re-render (normally automatic via signals) |
| `dispose()` | Tear down all effects, observers, and DOM nodes |
| `[Symbol.dispose]()` | Same as `dispose()` — for `using` declarations |

---

### `MaybeSignal<T>`

```ts
type MaybeSignal<T> = T | ReadonlySignal<T>;
```

Union type accepting either a plain value or a Ripple signal. Used throughout config types to enable optional reactivity.

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
| `domain` | Current input domain [min, max] |
| `range` | Current output pixel range |
| `map(value)` | Convert a domain value to a pixel position |
| `invert(pixel)` | Convert a pixel position back to a domain value |
| `ticks(count?)` | Generate nicely-spaced tick values (default: 10) |

---

### `BandScale`

```ts
interface BandScale {
  domain: string[];
  range: [number, number];
  map(value: string): number;
  bandwidth(): number;
  gap(): number;
}
```

| Member | Description |
|---|---|
| `bandwidth()` | Width of each band in pixels |
| `gap()` | Gap between bands in pixels |
| `map(value)` | Left edge pixel position of a category's band |

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

### Config Types

#### `LineChartConfig`

```ts
interface LineChartConfig {
  series: MaybeSignal<LineSeriesConfig[]>;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  margin?: Partial<ChartMargin>;
  tooltip?: boolean | TooltipConfig;
  crosshair?: boolean | CrosshairConfig;
  transition?: TransitionConfig;
  ariaLabel?: string;
}
```

#### `LineSeriesConfig`

```ts
interface LineSeriesConfig extends Series {
  curve?: 'linear' | 'monotone' | 'step';   // default: 'linear'
  strokeWidth?: number;                       // default: 2
  showPoints?: boolean;                       // default: false
  pointRadius?: number;                       // default: 3
}
```

#### `BarChartConfig`

```ts
interface BarChartConfig {
  series: MaybeSignal<BarSeriesConfig[]>;
  orientation?: 'vertical' | 'horizontal';   // default: 'vertical'
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  margin?: Partial<ChartMargin>;
  tooltip?: boolean | TooltipConfig;
  transition?: TransitionConfig;
  ariaLabel?: string;
}
```

#### `BarSeriesConfig`

```ts
interface BarSeriesConfig extends Series {
  mode?: 'grouped' | 'stacked';    // default: 'grouped'
  borderRadius?: number;            // default: 0
}
```

#### `AreaChartConfig`

```ts
interface AreaChartConfig {
  series: MaybeSignal<AreaSeriesConfig[]>;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  margin?: Partial<ChartMargin>;
  tooltip?: boolean | TooltipConfig;
  crosshair?: boolean | CrosshairConfig;
  transition?: TransitionConfig;
  ariaLabel?: string;
}
```

#### `AreaSeriesConfig`

```ts
interface AreaSeriesConfig extends Series {
  curve?: 'linear' | 'monotone' | 'step';   // default: 'linear'
  fillOpacity?: number;                       // default: 0.3
  showLine?: boolean;                         // default: true
  stacked?: boolean;                          // default: false
}
```

---

### Shared Config Types

#### `AxisConfig`

```ts
interface AxisConfig {
  position: 'top' | 'bottom' | 'left' | 'right';
  tickCount?: number;
  tickFormat?: (value: unknown) => string;
  label?: string;
  grid?: boolean | GridConfig;
}
```

#### `GridConfig`

```ts
interface GridConfig {
  color?: string;
  dash?: string;    // SVG stroke-dasharray value
}
```

#### `TooltipConfig`

```ts
interface TooltipConfig {
  offset?: number;                                    // default: 8
  render?: (point: DataPoint, series: Series) => string;  // custom HTML
}
```

#### `CrosshairConfig`

```ts
interface CrosshairConfig {
  vertical?: boolean;      // default: true
  horizontal?: boolean;    // default: false
  snap?: boolean;          // default: true
}
```

#### `TransitionConfig`

```ts
interface TransitionConfig {
  duration?: number;       // ms, default: 300
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | ((t: number) => number);
  stagger?: number;        // ms between elements, default: 0
}
```

#### `ChartMargin`

```ts
interface ChartMargin {
  top: number;       // default: 20
  right: number;     // default: 20
  bottom: number;    // default: 40
  left: number;      // default: 50
}
```

---

## Utilities

### `getSeriesColor`

```ts
function getSeriesColor(index: number): string;
```

Returns a CSS variable reference for the palette color at the given index (wraps around after 8).

### `PRISM_COLORS`

```ts
const PRISM_COLORS: readonly string[];
```

Array of 8 CSS variable references for the default series palette.
