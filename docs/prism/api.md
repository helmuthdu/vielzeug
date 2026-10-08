---
title: 'Prism: API Reference'
description: Complete reference for Prism chart factories, scales, themes, types, and errors.
---

[[toc]]

## API Overview

All chart factories, scale utilities, theme helpers, and error classes are synchronous. Charts render into an HTML element and return a `ChartHandle`; they do not return a promise.

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createLineChart()` | Render one or more continuous line series | Sync | `key` values must be numbers or dates |
| `createAreaChart()` | Render continuous series with filled areas | Sync | Fills use a gradient by default |
| `createScatterChart()` | Plot independent `(x, y)` points | Sync | `key` is the x-value; the y-domain is fitted to data |
| `createBarChart()` | Render categorical bars | Sync | Negative values in stacked variants are clamped to zero |
| `createPieChart()` | Render pie, donut, or semi-circle slices | Sync | `variant` is fixed at creation; `update()` replaces slices |
| `createRadarChart()` | Compare series across fixed axes | Sync | Requires at least three axes to draw |
| `createSparkline()` | Render a compact line, area, bar, or stack | Sync | Has no axes, legend, or keyboard navigation |
| `linearScale()` | Create a numeric scale | Sync | `nice` defaults to `true`; set `nice: false` to preserve the domain |
| `timeScale()` | Create a date scale | Sync | `nice` defaults to `true` |
| `bandScale()` | Create an ordered categorical scale | Sync | Unknown categories map to `0` and warn in development |
| `setTheme()` | Set Prism CSS custom properties | Sync | Writes inline styles to `document.documentElement` by default |
| `resetTheme()` | Remove theme overrides set by `setTheme()` | Sync | Only clears the selected target |
| `seriesColor()` | Resolve a palette CSS value | Sync | Palette positions wrap after eight |
| `PrismError` | Base class for Prism errors | Sync | Use `instanceof` to catch any Prism error |
| `PrismRenderError` | Report an invalid chart container or failed chart operation | Sync | Also thrown by `update()` after disposal |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/prism` | Chart factories, scale and theme functions, error classes, and public types |
| `@vielzeug/prism/theme.css` | Default chart styles, CSS custom properties, dark-mode values, and reduced-motion rules |

## Chart Factories

Each factory appends an SVG to `container`. A chart with no measurable container size uses a temporary `600 × 300` SVG size and emits a development warning; `ResizeObserver` applies later size changes. Unless `a11y` is informative, the SVG is hidden from the accessibility tree.

### `createLineChart()`

```ts
function createLineChart(
  container: HTMLElement,
  config: LineChartConfig,
): ChartHandle<LineSeriesConfig[]>;
```

Renders line series and returns a handle whose `update()` argument replaces the complete series array. Axes render by default; the value axis has grid lines by default. Pass `false` to `xAxis` or `yAxis` to suppress that axis.

Series use linear interpolation by default, omit point markers by default, and use a point radius of 3 when markers are enabled. `yAxis` defaults to `'left'`; crosshair, tooltip, and legend are disabled unless configured.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the chart SVG and optional overlays |
| `config` | `LineChartConfig` | Series, axes, interaction, accessibility, and motion settings |

**Returns:** `ChartHandle<LineSeriesConfig[]>`.

```ts
import { createLineChart } from '@vielzeug/prism';

const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px';
document.body.append(host);

const chart = createLineChart(host, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [{ data: [{ key: 1, value: 10 }, { key: 2, value: 15 }], name: 'Revenue' }],
});
chart.update([{ data: [{ key: 1, value: 10 }, { key: 2, value: 15 }, { key: 3, value: 18 }], name: 'Revenue' }]);
chart.dispose();
```

### `createAreaChart()`

```ts
function createAreaChart(
  container: HTMLElement,
  config: AreaChartConfig,
): ChartHandle<AreaSeriesConfig[]>;
```

Renders continuous area series with a gradient fill by default. `update()` replaces the complete series array.

Area series use linear interpolation by default and show their top line unless `showLine: false` is set. Axes render by default, with grid lines on the value axis.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the chart SVG and optional overlays |
| `config` | `AreaChartConfig` | Series, axes, interaction, accessibility, and motion settings |

**Returns:** `ChartHandle<AreaSeriesConfig[]>`.

```ts
import { createAreaChart } from '@vielzeug/prism';

const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px';
document.body.append(host);

const chart = createAreaChart(host, {
  a11y: { ariaLabel: 'Visitors over time' },
  series: [{ data: [{ key: 1, value: 10 }, { key: 2, value: 18 }], name: 'Visitors' }],
});
chart.dispose();
```

### `createScatterChart()`

```ts
function createScatterChart(
  container: HTMLElement,
  config: ScatterChartConfig,
): ChartHandle<ScatterSeriesConfig[]>;
```

Plots each datum independently: `key` is the numeric or date x-value and `value` is the y-value. Points are not joined. `update()` replaces the complete series array.

Axes render by default, with grid lines on the value axis. The value scale is fitted to the observed data rather than forced to include zero. Tooltip, crosshair, and legend are disabled unless configured.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the chart SVG and optional overlays |
| `config` | `ScatterChartConfig` | Independent points, axes, interaction, accessibility, and motion settings |

**Returns:** `ChartHandle<ScatterSeriesConfig[]>`.

```ts
import { createScatterChart } from '@vielzeug/prism';

const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px';
document.body.append(host);

const chart = createScatterChart(host, {
  a11y: { ariaLabel: 'Height against weight' },
  series: [{ data: [{ key: 160, value: 55 }, { key: 175, value: 70 }], name: 'Cohort A' }],
  tooltip: true,
});
chart.dispose();
```

Scatter interaction reports one datum and series rather than a `values` array. Keyboard navigation visits points across series in x order.

### `createBarChart()`

```ts
function createBarChart(
  container: HTMLElement,
  config: BarChartConfig,
): ChartHandle<BarSeriesConfig[]>;
```

Renders grouped, stacked, grouped-horizontal, or stacked-horizontal categories. `update()` replaces the complete series array; the variant is fixed at creation. Axes render by default, with grid lines on the value axis.

The default variant is `grouped`; tooltip and legend are disabled unless configured.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the chart SVG and optional overlays |
| `config` | `BarChartConfig` | Series, layout variant, axes, interaction, accessibility, and motion settings |

**Returns:** `ChartHandle<BarSeriesConfig[]>`.

```ts
import { createBarChart } from '@vielzeug/prism';

const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px';
document.body.append(host);

const chart = createBarChart(host, {
  a11y: { ariaLabel: 'Tasks by status' },
  series: [{ data: [{ key: 'Open', value: 12 }, { key: 'Done', value: 8 }], name: 'Tasks' }],
});
chart.dispose();
```

For stacked variants, negative values are treated as zero and produce a development warning.

### `createPieChart()`

```ts
function createPieChart(
  container: HTMLElement,
  config: PieChartConfig,
): ChartHandle<PieSliceConfig[]>;
```

Renders pie, donut, or semi-circle slices. The default variant is `pie`; `update()` replaces the slice array. The default inner radius is zero for pies and 55% of the outer radius for donut and semi variants. Pie slices default to no padding or rounded corners; donut and semi slices default to 8px padding and corner radius.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the chart SVG and optional overlays |
| `config` | `PieChartConfig` | Slices, shape, geometry, legend, tooltip, and interaction settings |

**Returns:** `ChartHandle<PieSliceConfig[]>`.

```ts
import { createPieChart } from '@vielzeug/prism';

const host = document.createElement('div');
host.style.cssText = 'width:320px;height:240px';
document.body.append(host);

const chart = createPieChart(host, {
  a11y: { ariaLabel: 'Orders by channel' },
  data: [{ label: 'Direct', value: 72 }, { label: 'Referral', value: 28 }],
  variant: 'donut',
});
chart.dispose();
```

### `createRadarChart()`

```ts
function createRadarChart(
  container: HTMLElement,
  config: RadarChartConfig,
): ChartHandle<RadarSeriesConfig[]>;
```

Renders one shape per series across the configured axes. `update()` replaces series data but not axes or other configuration. Fewer than three axes warn in development and draw no chart. Tooltip and legend are disabled unless configured.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the chart SVG and optional overlays |
| `config` | `RadarChartConfig` | Fixed axes, series, scale, grid, appearance, and interaction settings |

**Returns:** `ChartHandle<RadarSeriesConfig[]>`.

```ts
import { createRadarChart } from '@vielzeug/prism';

const host = document.createElement('div');
host.style.cssText = 'width:400px;height:320px';
document.body.append(host);

const chart = createRadarChart(host, {
  a11y: { ariaLabel: 'Hero stats' },
  axes: [{ key: 'str', label: 'Strength' }, { key: 'agi', label: 'Agility' }, { key: 'end', label: 'Endurance' }],
  domain: [0, 10],
  series: [{ data: [{ key: 'str', value: 8 }, { key: 'agi', value: 6 }, { key: 'end', value: 9 }], name: 'Adam' }],
});
chart.dispose();
```

Radar defaults are a solid fill, linear curves, visible points, a four-level polygon grid with bands, no grid labels, and a first-axis angle of zero degrees. Grid labels render only when all axes share a domain.

### `createSparkline()`

```ts
function createSparkline(
  container: HTMLElement,
  config: SparklineConfig,
): ChartHandle<number[] | StackSegment[]>;
```

Renders compact data without axes, chart margins, or a legend. `update()` replaces the number or stack-segment array. The default variant is `line`; only line and area variants draw the endpoint marker by default.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host that receives the chart SVG |
| `config` | `SparklineConfig` | Values, variant, appearance, accessibility, and pointer callbacks |

**Returns:** `ChartHandle<number[] | StackSegment[]>`.

```ts
import { createSparkline } from '@vielzeug/prism';

const host = document.createElement('div');
host.style.cssText = 'width:240px;height:48px';
document.body.append(host);

const chart = createSparkline(host, { data: [2, 5, 3, 8], variant: 'area' });
chart.update([2, 5, 3, 8, 13]);
chart.dispose();
```

`StackSegment[]` is for `variant: 'stack'`. Pointer callbacks are available for numeric line, area, and bar sparklines; sparklines do not support keyboard navigation.

## Scale Factories

### `linearScale()`

```ts
function linearScale(config: LinearScaleConfig): Scale<number>;
```

Maps a numeric domain to a numeric range. `nice` defaults to `true`; `clamp` defaults to `false` and applies to `map()`, not `invert()`.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `config.domain` | `[number, number]` | Required | Input extent |
| `config.range` | `[number, number]` | Required | Output extent |
| `config.clamp` | `boolean` | `false` | Clamp mapped values to the range |
| `config.nice` | `boolean` | `true` | Expand the domain to rounded boundaries |

**Returns:** `Scale<number>`, with `map`, `invert`, `ticks`, `domain`, and `range`.

```ts
import { linearScale } from '@vielzeug/prism';

const scale = linearScale({ domain: [0, 100], range: [0, 500] });
scale.map(50); // 250
```

### `timeScale()`

```ts
function timeScale(config: TimeScaleConfig): Scale<Date>;
```

Maps date values to a numeric range. `nice` defaults to `true` and rounds the domain to a time interval.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `config.domain` | `[Date, Date]` | Required | Input date extent |
| `config.range` | `[number, number]` | Required | Output extent |
| `config.nice` | `boolean` | `true` | Expand the domain to time-interval boundaries |

**Returns:** `Scale<Date>`, with `map`, `invert`, `ticks`, `domain`, and `range`.

```ts
import { timeScale } from '@vielzeug/prism';

const scale = timeScale({
  domain: [new Date('2026-01-01'), new Date('2026-12-31')],
  range: [0, 500],
});
scale.map(new Date('2026-07-02'));
```

### `bandScale()`

```ts
function bandScale(config: BandScaleConfig): BandScale;
```

Maps ordered string categories to the start of each band. `padding` defaults to `0.1`; `paddingOuter` defaults to the same value. Mapping an unknown category returns `0` and warns in development.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `config.domain` | `string[]` | Required | Ordered categories |
| `config.range` | `[number, number]` | Required | Output extent |
| `config.padding` | `number` | `0.1` | Inner gap as a ratio of bandwidth |
| `config.paddingOuter` | `number` | `padding` | Outer gap as a ratio of bandwidth |

**Returns:** `BandScale`, with `map`, `ticks`, `bandwidth`, `gap`, `domain`, and `range`.

```ts
import { bandScale } from '@vielzeug/prism';

const scale = bandScale({ domain: ['A', 'B'], range: [0, 200] });
scale.bandwidth();
```

## Theme Utilities

`theme.css` supplies the base CSS values and styles. `setTheme()` writes inline custom properties, which take precedence over stylesheet declarations. For other visual controls, set CSS custom properties directly.

### `setTheme()`

```ts
function setTheme(theme: PrismTheme, options?: ThemeScope): void;
```

Sets the provided theme values on `options.scope`, or on `document.documentElement` when omitted. Omitted scalar keys remain unchanged. Providing `colors` replaces all eight palette slots, removing unused slots.

| Parameter | Type | Description |
| --- | --- | --- |
| `theme` | `PrismTheme` | Palette and supported axis, grid, text, font, and tooltip properties |
| `options.scope` | `HTMLElement` | Element that scopes the inline custom properties |

**Returns:** `void`.

```ts
import { setTheme } from '@vielzeug/prism';

const host = document.createElement('div');
document.body.append(host);
setTheme({ colors: ['#2563eb', '#16a34a'], textColor: '#111827' }, { scope: host });
```

### `resetTheme()`

```ts
function resetTheme(options?: ThemeScope): void;
```

Removes every custom property managed by `setTheme()` from the given scope or the document root. It does not remove CSS rules or change any other custom properties.

| Parameter | Type | Description |
| --- | --- | --- |
| `options` | `ThemeScope` | Optional target; defaults to `document.documentElement` |

**Returns:** `void`.

```ts
import { resetTheme, setTheme } from '@vielzeug/prism';

const scope = document.createElement('div');
setTheme({ textColor: '#111827' }, { scope });
resetTheme({ scope });
```

### `seriesColor()`

```ts
function seriesColor(index: number, override?: string): string;
```

Returns `override` when it is provided; otherwise returns a `var(--prism-color-N)` reference. The palette has eight positions and the index wraps around after the eighth.

| Parameter | Type | Description |
| --- | --- | --- |
| `index` | `number` | Zero-based palette position |
| `override` | `string` | Optional color returned instead of a CSS variable |

**Returns:** `string`.

```ts
import { seriesColor } from '@vielzeug/prism';

seriesColor(0); // 'var(--prism-color-1)'
seriesColor(1, '#2563eb'); // '#2563eb'
```

## Chart Handle

`ChartHandle<TData>` is returned by every chart factory. `update()` synchronously rebuilds the chart from its new data; enabled motion may animate the resulting SVG. `dispose()` is idempotent, removes the chart SVG, observers, tooltip and legend, cancels chart-owned animation, aborts `disposalSignal`, and emits one `dispose` tap event. `update()` after disposal throws `PrismRenderError`.

`tap()` observes `resize` and `dispose` events outside the render path. It returns an unsubscribe function; an optional abort signal removes the subscription. Observer-handler exceptions are swallowed so they cannot affect chart behavior. A tap added after disposal returns a no-op unsubscribe function.

`[Symbol.dispose]()` delegates to `dispose()`, allowing explicit resource management where supported.

All chart handles expose the same lifecycle members; interactive cartesian and pie/radar charts use a `.prism-live` status region when no tooltip is enabled. A tooltip is itself a polite status region. Sparklines have neither a tooltip nor a live value announcer.

| Method or property | Contract |
| --- | --- |
| `el` | The chart's root `SVGSVGElement` |
| `update(data)` | Replace chart data and render; throws `PrismRenderError` after disposal |
| `dispose()` | Idempotently release chart-owned DOM, observation, and motion |
| `disposed` | Whether the handle has been disposed |
| `disposalSignal` | `AbortSignal` aborted during disposal |
| `tap(handler, options?)` | Observe resize/dispose events; returns an unsubscribe function |
| `[Symbol.dispose]()` | Calls `dispose()` |

`PrismEvent` reports a changed SVG content size as `{ type: 'resize', width, height }`; the `dispose` event is emitted once before teardown completes.

## Types

The following are all types and interfaces exported from `@vielzeug/prism`. Definitions mirror the package entry-point contracts.

### Animation Types

```ts
export type EasingFn = (t: number) => number;
export type EasingName = 'back-out' | 'ease-in' | 'ease-in-out' | 'ease-out' | 'expo-out' | 'linear';

export interface TransitionConfig {
  /** Milliseconds per animated lane. Defaults to 300 (420 for a line entrance, 400 for radar). */
  duration?: number;
  easing?: EasingName | ((t: number) => number);
  /** `system` skips animation when reduced motion is preferred. */
  preference?: 'always' | 'never' | 'system';
  /** Per-bar delay on bar charts or per-series delay on radar charts. */
  stagger?: number;
}

export type TransitionOption = TransitionConfig | boolean;
```

### Theme Types

```ts
export interface PrismTheme {
  axisColor?: string;
  colors?: string[];
  fontFamily?: string;
  gridColor?: string;
  gridOpacity?: number;
  textColor?: string;
  textColorSecondary?: string;
  tooltipBg?: string;
  tooltipBorder?: string;
  tooltipColor?: string;
}

export interface ThemeScope {
  readonly scope?: HTMLElement;
}
```

`PrismTheme.colors` writes up to eight palette slots. The scalar fields map as follows:

| Field | CSS custom property |
| --- | --- |
| `axisColor` | `--prism-axis-color` |
| `fontFamily` | `--prism-font-family` |
| `gridColor` | `--prism-grid-color` |
| `gridOpacity` | `--prism-grid-opacity` |
| `textColor` | `--prism-text-color` |
| `textColorSecondary` | `--prism-text-color-secondary` |
| `tooltipBg` | `--prism-tooltip-bg` |
| `tooltipBorder` | `--prism-tooltip-border` |
| `tooltipColor` | `--prism-tooltip-color` |

### Core and Data Types

```ts
export interface ChartMargin {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface ChartDimensions {
  height: number;
  margin: ChartMargin;
  width: number;
}

export type PrismEvent =
  | { readonly height: number; readonly type: 'resize'; readonly width: number }
  | { readonly type: 'dispose' };

export interface ChartHandle<TData = unknown> {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  readonly el: SVGSVGElement;
  tap(handler: (event: PrismEvent) => void, options?: { readonly signal?: AbortSignal }): () => void;
  update(data: TData): void;
  [Symbol.dispose](): void;
}

export type ChartA11y =
  | { readonly decorative: true }
  | { readonly ariaLabel: string; readonly decorative?: false };

export interface Datum<TKey extends Date | number | string = Date | number | string> {
  dash?: string;
  key: TKey;
  meta?: Record<string, unknown>;
  opacity?: number;
  value: number;
}

export type ContinuousDatum = Datum<Date | number>;

export interface Series<TDatum extends Datum = Datum> {
  color?: string;
  data: TDatum[];
  id?: string;
  name: string;
}

export interface ChartEvent {
  datum: Datum;
  originalEvent: Event;
  series: Series;
  values?: SeriesValue[];
}

export interface SeriesValue {
  datum: Datum | undefined;
  series: Series;
}
```

`Datum.dash` and `Datum.opacity` affect rendered marks only on the chart types that support them. On bars, `dash` adds a 1px series-color stroke so the dash is visible against the fill. `Series.id` becomes a `data-series-id` attribute on a series group; characters outside `[A-Za-z0-9_-]` are replaced with `-`. When omitted, the id is based on the series index.

| Chart | `dash` | `opacity` |
| --- | --- | --- |
| Bar | Strokes that datum's bar | Applies to that bar |
| Line | Applies to the segment from this datum to the next | Applies to that segment and its point marker |
| Area | Applies to the top-line segment from this datum to the next | Applies to that segment |
| Scatter | Ignored | Applies to that point |
| Pie, radar, sparkline | Ignored | Ignored |

For line and area charts, the last datum has no following segment, so its `dash` value is ignored. The chart factories group adjacent segments with the same presentation values into path runs.

For line, area, and bar charts, `ChartEvent.values` lists each series at the active key in series order. Its `datum` is `undefined` when that series has no matching key. `originalEvent` is a pointer event or a keyboard event for keyboard activation. Scatter events identify only the nearest independent point and omit `values`.

### Scale Types

```ts
export interface Scale<T> {
  readonly domain: readonly [T, T];
  invert(pixel: number): T;
  map(value: T): number;
  readonly range: readonly [number, number];
  ticks(count?: number): T[];
}

export interface BandScale {
  bandwidth(): number;
  readonly domain: readonly string[];
  gap(): number;
  map(value: string): number;
  readonly range: readonly [number, number];
  ticks(count?: number): string[];
}

export interface LinearScaleConfig {
  clamp?: boolean;
  domain: [number, number];
  nice?: boolean;
  range: [number, number];
}

export interface TimeScaleConfig {
  domain: [Date, Date];
  nice?: boolean;
  range: [number, number];
}

export interface BandScaleConfig {
  domain: string[];
  padding?: number;
  paddingOuter?: number;
  range: [number, number];
}
```

### Axis and Interaction Types

```ts
export type HorizontalAxisPosition = 'bottom' | 'top';
export type VerticalAxisPosition = 'left' | 'right';
export type AxisPosition = HorizontalAxisPosition | VerticalAxisPosition;

export interface GridConfig {
  color?: string;
  dash?: string;
}

export interface AxisConfig<TPosition extends AxisPosition = AxisPosition> {
  grid?: GridConfig | boolean;
  label?: string;
  position?: TPosition;
  tickCount?: number;
  tickFormat?: (value: Date | number | string) => string;
}

export type XAxisConfig = AxisConfig<HorizontalAxisPosition>;
export type YAxisConfig = AxisConfig<VerticalAxisPosition>;

export interface TooltipConfig {
  offset?: number;
  render?: (datum: Datum, series: Series) => Node | string;
}

export interface CrosshairConfig {
  horizontal?: boolean;
  snap?: boolean;
  vertical?: boolean;
}

export type LegendPosition = 'bottom' | 'left' | 'right' | 'top';

export interface LegendConfig {
  position?: LegendPosition;
}
```

The crosshair defaults to a vertical line that snaps to the nearest datum; the horizontal line is hidden by default. With `snap: false`, only the guide follows the pointer—tooltip and callback data still refer to the nearest datum.

Tooltip strings are assigned as text, not parsed as HTML. For a radar chart, `tooltip.render` receives a datum whose `meta` contains the active axis, all series values, and the default announcement text.

### Chart Configuration Types

```ts
export interface BaseChartConfig {
  a11y?: ChartA11y;
  legend?: LegendConfig | boolean;
  margin?: Partial<ChartMargin>;
  onClick?: (event: ChartEvent) => void;
  onHover?: (event: ChartEvent | null) => void;
  tooltip?: TooltipConfig | boolean;
  transition?: TransitionOption;
  xAxis?: XAxisConfig | false;
  yAxis?: YAxisConfig | false;
}

export interface LineSeriesConfig extends Series<ContinuousDatum> {
  curve?: 'linear' | 'monotone' | 'step';
  pointRadius?: number;
  showPoints?: boolean;
  strokeWidth?: number;
  yAxis?: 'left' | 'right';
}

export interface LineChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  rightYAxis?: Omit<YAxisConfig, 'position' | 'grid'>;
  series: LineSeriesConfig[];
}

export interface AreaSeriesConfig extends Series<ContinuousDatum> {
  curve?: 'linear' | 'monotone' | 'step';
  fill?: 'gradient' | 'solid';
  fillOpacity?: number;
  showLine?: boolean;
}

export interface AreaChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  series: AreaSeriesConfig[];
}

export interface ScatterSeriesConfig extends Series<ContinuousDatum> {
  pointRadius?: number;
}

export interface ScatterChartConfig extends BaseChartConfig {
  crosshair?: CrosshairConfig | boolean;
  series: ScatterSeriesConfig[];
}

export interface BarSeriesConfig extends Series {
  borderRadius?: number;
}

export type BarVariant = 'grouped' | 'grouped-horizontal' | 'stacked' | 'stacked-horizontal';

export interface BarChartConfig extends BaseChartConfig {
  series: BarSeriesConfig[];
  variant?: BarVariant;
}

export type PieVariant = 'donut' | 'pie' | 'semi';

export interface PieSliceConfig {
  color?: string;
  label?: string;
  value: number;
}

export interface PieEvent {
  index: number;
  originalEvent: Event;
  slice: PieSliceConfig;
}

export interface PieChartConfig extends Omit<BaseChartConfig, 'margin' | 'onClick' | 'onHover' | 'xAxis' | 'yAxis'> {
  cornerRadius?: number;
  data: PieSliceConfig[];
  innerRadius?: number;
  onClick?: (event: PieEvent) => void;
  onHover?: (event: PieEvent | null) => void;
  padPixels?: number;
  variant?: PieVariant;
}

export interface RadarAxisConfig {
  format?: (value: number) => string;
  key: string;
  label: string;
  max?: number;
  min?: number;
}

export type RadarSeriesConfig = Series<Datum<string>>;

export interface RadarGridConfig {
  bands?: boolean;
  labels?: boolean;
  levels?: number;
  shape?: 'circle' | 'polygon';
}

export interface RadarAxisValue {
  datum: Datum<string> | undefined;
  series: RadarSeriesConfig;
}

export interface RadarEvent {
  axis: RadarAxisConfig;
  index: number;
  originalEvent: Event;
  values: RadarAxisValue[];
}

export interface RadarChartConfig extends Omit<BaseChartConfig, 'margin' | 'onClick' | 'onHover' | 'xAxis' | 'yAxis'> {
  axes: RadarAxisConfig[];
  curve?: 'linear' | 'rounded';
  domain?: [number, number];
  fill?: 'gradient' | 'none' | 'solid';
  grid?: RadarGridConfig | boolean;
  onClick?: (event: RadarEvent) => void;
  onHover?: (event: RadarEvent | null) => void;
  series: RadarSeriesConfig[];
  showPoints?: boolean;
  showValues?: boolean;
  startAngle?: number;
}

export type SparklineVariant = 'area' | 'bar' | 'line' | 'stack';

export interface StackSegment {
  color?: string;
  label?: string;
  value: number;
}

export interface SparklineEvent {
  index: number;
  originalEvent: Event;
  value: number;
}

export interface SparklineConfig {
  a11y?: ChartA11y;
  color?: string;
  cornerRadius?: number;
  curve?: 'linear' | 'monotone' | 'step';
  data: number[] | StackSegment[];
  fillOpacity?: number;
  onClick?: (event: SparklineEvent) => void;
  onHover?: (event: SparklineEvent | null) => void;
  padPixels?: number;
  showEndPoint?: boolean;
  strokeWidth?: number;
  transition?: TransitionOption;
  variant?: SparklineVariant;
}
```

## Errors

### `PrismError`

```ts
class PrismError extends Error {
  constructor(message: string, opts?: ErrorOptions);
}
```

Base class for Prism-originated errors. Its `name` is set to the concrete error class name, and it supports the standard `ErrorOptions` including `cause`.

### `PrismRenderError`

```ts
class PrismRenderError extends PrismError {}
```

Thrown when a chart cannot be rendered because its container is not a DOM element, when initial rendering fails (the original error is available as `cause`), or when `update()` is called after disposal. Empty or malformed chart data may instead produce a development warning or an empty rendering, depending on the chart.
