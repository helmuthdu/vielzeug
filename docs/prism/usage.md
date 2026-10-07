---
title: 'Prism: Usage Guide'
description: Concepts, update patterns, and best practices for responsive SVG charts with @vielzeug/prism.
---

[[toc]]

## Basic Usage

Every chart needs a container element with defined dimensions and the theme CSS:

```ts
import { createLineChart } from '@vielzeug/prism';
import '@vielzeug/prism/theme.css';

const container = document.querySelector<HTMLElement>('#chart')!;
const chart = createLineChart(container, {
  series: [
    {
      name: 'Revenue',
      data: [
        { key: 1, value: 10 },
        { key: 2, value: 16 },
      ],
    },
  ],
});

chart.dispose();
```

```html
<div id="chart" style="width: 100%; height: 300px;"></div>
```

Prism observes the container size via `ResizeObserver` and re-renders automatically on resize. If the container has zero dimensions at mount time, a `warn` is emitted in development: ensure the container has layout before calling the chart factory.

## Updating Data

Chart factories render synchronously and return a typed handle. Call `update()` with the same data shape used by the factory when application state changes.

```ts
import { createLineChart } from '@vielzeug/prism';

const chart = createLineChart(container, {
  series: [{ data: [{ key: 1, value: 10 }], name: 'Live' }],
});

chart.update([
  {
    data: [
      { key: 1, value: 10 },
      { key: 2, value: 20 },
    ],
    name: 'Live',
  },
]);
```

`update()` is state-library neutral. Call it from a framework effect, store subscription, event handler, or request callback. It throws after the chart is disposed instead of silently retaining detached state.

## Line Charts

```ts
import { createLineChart } from '@vielzeug/prism';

const chart = createLineChart(container, {
  series: [
    {
      name: 'Revenue',
      data: [
        { key: 1, value: 100 },
        { key: 2, value: 150 },
        { key: 3, value: 130 },
      ],
      color: '#3b82f6',
      curve: 'monotone', // 'linear' | 'monotone' | 'step'
      strokeWidth: 2,
      showPoints: true,
      pointRadius: 4,
    },
  ],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  crosshair: true,
});
```

### Multiple Series

```ts
const chart = createLineChart(container, {
  series: [
    { name: 'Revenue', data: revenueData, color: '#3b82f6' },
    { name: 'Expenses', data: expenseData, color: '#ef4444' },
  ],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
});
```

### Independent Value Axes

Assign a line series to `yAxis: 'right'` when its values need a different range. Both axes share the same X scale, while tooltips retain the original values.

```ts
const chart = createLineChart(container, {
  series: [
    { name: 'Health', data: [{ key: 0, value: 30 }, { key: 1, value: 20 }] },
    { name: 'Damage', yAxis: 'right', data: [{ key: 0, value: 0 }, { key: 1, value: 300 }] },
  ],
  yAxis: { label: 'Health' },
  rightYAxis: { label: 'Damage' },
  tooltip: true,
});
```

The primary axis is on the left when right-axis series are present. Grid configuration belongs to the primary axis. Dual-axis curve crossings do not imply equal numeric values. Preserve each marker's axis assignment when calling `update()`.

### Time-based X Axis

When data points use `Date` objects for `key`, Prism automatically applies a time scale. The domain spans exactly the first to the last date, so the series fills the plot width:

```ts
const chart = createLineChart(container, {
  series: [
    {
      name: 'Signups',
      data: [
        { key: new Date('2024-01-01'), value: 50 },
        { key: new Date('2024-02-01'), value: 80 },
        { key: new Date('2024-03-01'), value: 120 },
      ],
    },
  ],
  xAxis: { position: 'bottom', tickFormat: (d) => (d as Date).toLocaleDateString() },
  yAxis: { position: 'left' },
});
```

## Bar Charts

```ts
import { createBarChart } from '@vielzeug/prism';

const chart = createBarChart(container, {
  series: [
    {
      name: 'Sales',
      data: [
        { key: 'Q1', value: 200 },
        { key: 'Q2', value: 350 },
        { key: 'Q3', value: 280 },
        { key: 'Q4', value: 400 },
      ],
      borderRadius: 4,
    },
  ],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
});
```

### Variants

Select the bar layout with `variant`:

| Value                  | Layout                     |
| ---------------------- | -------------------------- |
| `'grouped'`            | Vertical grouped (default) |
| `'stacked'`            | Vertical stacked           |
| `'grouped-horizontal'` | Horizontal grouped         |
| `'stacked-horizontal'` | Horizontal stacked         |

```ts
const chart = createBarChart(container, {
  variant: 'stacked',
  series: [
    { name: 'Mobile', data: mobileData, color: '#3b82f6', borderRadius: 0 },
    { name: 'Desktop', data: desktopData, color: '#10b981', borderRadius: 0 },
  ],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  legend: true,
});
```

For horizontal layouts, categories appear on the Y axis and values on the X axis:

```ts
const chart = createBarChart(container, {
  variant: 'grouped-horizontal',
  series: [{ name: 'Revenue', data, color: '#3b82f6' }],
  xAxis: { position: 'bottom', grid: true },
  yAxis: { position: 'left' },
});
```

### Grouped Bars

Multiple series with `variant: 'grouped'` (default) render side-by-side:

```ts
const chart = createBarChart(container, {
  series: [
    { name: '2023', data: lastYearData, color: '#94a3b8' },
    { name: '2024', data: thisYearData, color: '#3b82f6' },
  ],
});
```

## Area Charts

Area fills use a vertical gradient that fades toward the baseline. Set `fill: 'solid'` for a flat fill:

```ts
import { createAreaChart } from '@vielzeug/prism';

const chart = createAreaChart(container, {
  series: [
    {
      name: 'Users',
      data: userData,
      curve: 'monotone',
      fill: 'gradient', // 'gradient' (default) | 'solid'
      showLine: true,
    },
  ],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  crosshair: true,
});
```

`fillOpacity` overrides the theme opacity for one series.

## Scatter Charts

A scatter plot draws each datum as an independent point: `key` is its position on
the value (x) axis and `value` on the measure (y) axis. Points are not joined and
not aligned to a shared category axis, so the value axis fits the data instead of
forcing a zero baseline — a tight cluster of high values fills the plot rather than
squashing against the top.

```ts
import { createScatterChart } from '@vielzeug/prism';

const chart = createScatterChart(container, {
  a11y: { ariaLabel: 'Height against weight' },
  series: [
    {
      name: 'Cohort A',
      data: [
        { key: 160, value: 55 },
        { key: 175, value: 70 },
        { key: 190, value: 88 },
      ],
    },
  ],
  tooltip: true,
});
```

Hovering or arrowing onto a point highlights it and reports its `x` and `y`.
Because a point is a single pair rather than one sample in a shared axis,
`onHover`/`onClick` report one `datum`/`series` and no cross-series `values`.
Keyboard navigation walks every point across all series in x order.

`pointRadius` overrides the marker size for one series, and a datum's `opacity`
fades its own marker so overlapping points stay legible:

```ts
createScatterChart(container, {
  series: [
    {
      name: 'Sample',
      pointRadius: 5,
      data: [{ key: 12, value: 40, opacity: 0.5 }],
    },
  ],
});
```

## Forecast / emphasis styling

A single series often mixes points that should look different — actuals plus a
forecast tail, or a run that crossed a budget. Rather than split the series,
carry `dash` and `opacity` on the individual datums. They are styling-only:
tooltips, hover, keyboard, and screen-reader behavior never change.

For a forecast tail, map a parallel `types` array onto the datums:

```ts
import { createLineChart } from '@vielzeug/prism';

const types = ['REAL', 'REAL', 'FORECAST', 'FORECAST'];

const chart = createLineChart(container, {
  series: [
    {
      name: 'Cost',
      data: values.map((value, i) => ({
        key: months[i],
        value,
        ...(types[i] === 'FORECAST' ? { dash: '5 5', opacity: 0.4 } : {}),
      })),
    },
  ],
});
```

On a line chart, a datum's `dash` styles the segment from that point to the
next, so the forecast run renders dashed while the actuals stay solid; its
`opacity` fades that segment and the point marker. The last datum's `dash` has
no segment to paint and is ignored. On a bar chart, both fields apply to that
datum's own bar — a `dash` adds a 1px series-color stroke so the dash reads on
the filled rect. On an area chart they style the top line only; the fill keeps
its series-level treatment.

The same mapping fades bars:

```ts
import { createBarChart } from '@vielzeug/prism';

const chart = createBarChart(container, {
  series: [
    {
      name: 'Cost',
      data: values.map((value, i) => ({
        key: months[i],
        value,
        ...(types[i] === 'FORECAST' ? { dash: '5 5', opacity: 0.4 } : {}),
      })),
    },
  ],
});
```

Because the fields live on the data, a normal `update(newSeries)` re-applies
them; removing the fields on the next update clears the styling. A series with
no `dash`/`opacity` anywhere renders exactly as it did before these fields
existed.

## Pie, Donut, and Semi-circle Charts

All three variants use `createPieChart` with the `variant` field:

```ts
import { createPieChart } from '@vielzeug/prism';

const chart = createPieChart(container, {
  data: [
    { label: 'Direct', value: 42, color: '#3b82f6' },
    { label: 'Organic', value: 28, color: '#10b981' },
    { label: 'Referral', value: 18, color: '#f59e0b' },
    { label: 'Social', value: 12, color: '#8b5cf6' },
  ],
  variant: 'donut', // 'pie' | 'donut' | 'semi'
  tooltip: true,
  transition: { duration: 400, easing: 'ease-out' },
});
```

### Variants

| Value     | Shape                                                   |
| --------- | ------------------------------------------------------- |
| `'pie'`   | Full circle, no hole                                    |
| `'donut'` | Full circle with inner hole (~55% of outer by default)  |
| `'semi'`  | Top-half semicircle with inner hole: useful for gauges |

### Inner Radius

`innerRadius` overrides the automatic calculation:

```ts
createPieChart(container, {
  data,
  variant: 'donut',
  innerRadius: 60, // explicit pixels
});
```

### Slice Labels

Set `label` on each `PieSliceConfig` to render text at the arc centroid. A label that does not fit inside its slice is not drawn; the value stays available through the tooltip, legend, and keyboard announcements:

```ts
{ value: 42, label: 'Direct' }
```

Style labels via CSS:

```css
:root {
  --prism-pie-label-color: #fff;
  --prism-pie-label-size: 11px;
}
```

### Updating Data

```ts
const chart = createPieChart(container, {
  data: [
    { label: 'A', value: 40 },
    { label: 'B', value: 60 },
  ],
  variant: 'donut',
});

chart.update([
  { label: 'A', value: 55 },
  { label: 'B', value: 45 },
]);
```

### Event Hooks

```ts
createPieChart(container, {
  data,
  onHover: (event) => {
    // event is PieEvent | null (null on mouseleave)
    if (event) console.log(event.index, event.slice.label, event.slice.value);
  },
  onClick: (event) => {
    console.log('clicked', event.index, event.slice.label);
  },
});
```

`PieEvent` provides `index`, the hovered/clicked `slice` (`PieSliceConfig`), and the `originalEvent` (`MouseEvent` or `KeyboardEvent`).

## Radar Charts

`createRadarChart` compares several values on one shape, such as a hero's stats. Each series supplies values keyed by `axis.key`:

```ts
import { createRadarChart } from '@vielzeug/prism';

const axes = [
  { key: 'str', label: 'Strength' },
  { key: 'agi', label: 'Agility' },
  { key: 'int', label: 'Intellect' },
  { key: 'end', label: 'Endurance' },
  { key: 'spd', label: 'Speed', max: 5 },
];

const chart = createRadarChart(container, {
  a11y: { ariaLabel: 'Hero stats' },
  axes,
  domain: [0, 10],
  fill: 'gradient',
  showValues: true,
  series: [
    {
      name: 'Adam',
      data: [
        { key: 'str', value: 8 },
        { key: 'agi', value: 6 },
        { key: 'int', value: 4 },
        { key: 'end', value: 9 },
        { key: 'spd', value: 3 },
      ],
    },
  ],
});
```

### Scales

Every axis shares `domain` (or a nice range around the data when omitted). Give an axis its own `min`/`max` when its stat uses a different range: above, Speed runs 0 to 5 while the rest run 0 to 10, so each still fills the chart.

### Appearance

| Option | Values | Use it for |
| --- | --- | --- |
| `fill` | `'solid'`, `'gradient'`, `'none'` | `gradient` for a single hero; `solid` or `none` when overlaying several |
| `curve` | `'linear'`, `'rounded'` | Rounded reads softer; linear keeps exact vertices |
| `grid.shape` | `'polygon'`, `'circle'` | Polygon matches the axes; circle suits many axes |
| `grid.levels` / `grid.bands` | number / boolean | Ring count and alternate shading |
| `grid.labels` | boolean | Level values; drawn only when every axis shares one domain |
| `showValues` | boolean | Value beside each vertex, formatted by `axis.format` |

### Comparing Series

Pass several series with `legend: true`. Hovering one shape dims the others, and hovering an axis reports every series' value on it:

```ts
createRadarChart(container, {
  axes,
  legend: true,
  series: [adam, eve],
  tooltip: true, // "Agility: Adam 6, Eve 9"
  onHover: (event) => event && console.log(event.axis.label, event.values),
});
```

## Sparklines

Sparklines are minimal inline charts with no axes, no legend, and no margin: designed to live inline with text or inside table cells.

```ts
import { createSparkline } from '@vielzeug/prism';

const spark = createSparkline(container, {
  data: [12, 18, 14, 22, 19, 28],
  variant: 'line', // 'line' | 'area' | 'bar' | 'stack' (default: 'line')
  color: '#3b82f6',
  curve: 'monotone',
  strokeWidth: 1.5,
});

spark.dispose();
```

### Variants

- **`line`**: simple polyline path (default)
- **`area`**: gradient-filled area + line overlay
- **`bar`**: vertical bar for each data point
- **`stack`**: horizontal proportional segments; use `StackSegment[]` for `data` with per-segment colors

Line and area sparklines mark the latest value with a dot. Set `showEndPoint: false` to hide it.

### Updating Data

```ts
const spark = createSparkline(container, {
  data: [12, 18, 14, 22],
  variant: 'area',
});

spark.update([12, 18, 14, 22, 30]);
```

### Event Hooks

Sparklines use simplified hooks: `SparklineEvent` rather than full `ChartEvent`. With a hook set, a marker follows the hovered value:

```ts
const spark = createSparkline(container, {
  data: [10, 20, 30],
  onHover: (event) => {
    // event is SparklineEvent | null (null on mouseleave)
    if (event) console.log(`Hovering point ${event.index}: ${event.value}`);
  },
  onClick: (event) => {
    console.log(`Clicked point ${event.index}: ${event.value}`);
  },
});
```

`SparklineEvent` provides `index`, the hovered/clicked `value`, and the `originalEvent`.

> **Note:** Sparklines have no keyboard navigation. Label one with `a11y.ariaLabel` only when the trend carries meaning, and state the key value in surrounding text.

## Axes and Grid

Both axes render by default: the value axis (y on vertical charts, x on horizontal ones) carries gridlines, the category axis does not. Set `xAxis: false` or `yAxis: false` to suppress one. An explicit config is used verbatim:

```ts
{
  xAxis: {
    position: 'bottom',          // 'top' | 'bottom'
    tickCount: 5,
    tickFormat: (v) => `$${v}`,
    label: 'Month',
    grid: true,                  // or { color: '#ddd', dash: '4 2' }
  },
  yAxis: {
    position: 'left',            // 'left' | 'right'
    grid: { color: '#f0f0f0' },
    label: 'Revenue ($)',
  },
}
```

Category axes show every label when the labels fit and thin them out only when they would overlap. Set `tickCount` to choose the density yourself.

## Tooltips

Enable with `tooltip: true`. On line, area, bar, and radar charts the default tooltip compares every series at the active key: a title, then a colour swatch, name, and value per series. Provide a custom `render` function to replace it. Strings are rendered as text. Return a DOM node for structured content:

```ts
{
  tooltip: {
    offset: 12,
    render: (datum, series) => {
      const content = document.createElement('strong');
      content.textContent = `${series.name}: ${datum.value.toLocaleString()}`;
      return content;
    },
  },
}
```

Prism never injects tooltip strings as HTML, so custom rendering does not require a sanitizer.

The tooltip element is scoped inside the chart container (not `document.body`) and is removed automatically on `dispose()`.

## Crosshair

A vertical guide that snaps to the nearest data point:

```ts
{
  crosshair: true,
  // or configure:
  crosshair: { vertical: true, horizontal: true, snap: true },
}
```

## Legend

Enable with `legend: true` (defaults to `bottom`) or configure position:

```ts
{
  legend: true,
  // or:
  legend: { position: 'top' },  // 'top' | 'bottom' | 'left' | 'right'
}
```

The legend renders as a `div` placed outside the SVG. Each item shows a color swatch and the series `name`. Customize via CSS:

```css
:root {
  --prism-legend-gap: 1rem;
  --prism-legend-dot-size: 0.5rem;
  --prism-legend-font-size: 0.75rem;
}
```

## Event Hooks

All charts expose `onClick` and `onHover` callbacks on the config:

```ts
const chart = createLineChart(container, {
  series: [{ name: 'Revenue', data }],
  onHover: (event) => {
    // event is ChartEvent | null (null on mouseleave)
    if (event) console.log(event.datum, event.series);
  },
  onClick: (event) => {
    console.log('clicked', event.datum);
  },
});
```

`ChartEvent` provides:

- `datum`: the datum of the series nearest the pointer
- `series`: the corresponding `Series` config
- `values`: every series at the same key (line, area, and bar charts)
- `originalEvent`: the raw `MouseEvent` or, for keyboard navigation, `KeyboardEvent`

> **Pie, radar, and sparkline events differ**: pie hooks receive a `PieEvent` (`index`, `slice`, `originalEvent`), sparkline hooks a `SparklineEvent` (`index`, `value`, `originalEvent`), and radar hooks a `RadarEvent` describing an axis. Scatter hooks receive a `ChartEvent` for the single nearest point, with `values` omitted. See [`PieChartConfig`](./api.md#chart-configurations) and [`createRadarChart()`](./api.md#createradarchart).

## Animations

Every chart animates by default. Entrances never deform the data: bars are
revealed growing out of the baseline behind a per-bar clip, line, area, and
scatter series are wiped in left to right behind a clip while drifting up into
place, radar polygons grow out of the center, pie slices sweep in, and
sparklines reveal their final plot. Motion runs through one
`requestAnimationFrame` loop and is skipped when the user prefers reduced motion
(`preference: 'system'`, the default).

Updates interpolate instead: line/area points, scatter points, and radar
polygons morph from the geometry on screen, pie slices morph between values, and
sparklines tween their values.

Tune it with `transition`, or turn it off entirely:

```ts
{
  transition: {
    duration: 400,
    easing: 'ease-out',
    stagger: 30,  // ms delay between bars (bar charts) or series (radar charts)
  },
}
```

```ts
{ transition: false }  // every update renders synchronously
{ transition: true }   // the defaults, stated explicitly
```

Named easings are `'linear'`, `'ease-in'`, `'ease-out'`, `'ease-in-out'`,
`'expo-out'` (a hard decelerate), and `'back-out'` (a small overshoot); pass a
`(t: number) => number` for anything else. `stagger` applies to bar-chart bars
and radar-chart series and is ignored elsewhere — bar charts cap the total
staggered delay near 400 ms so a long category axis still finishes promptly.
Multi-series line and area entrances enter one series at a time on a fixed 60 ms
offset so they never wipe in lockstep.

## Theming

Import the default theme:

```ts
import '@vielzeug/prism/theme.css';
```

### Programmatic Theme with `setTheme`

Call `setTheme` once at app startup to apply custom tokens programmatically:

```ts
import { setTheme } from '@vielzeug/prism';

setTheme({
  axisColor: '#94a3b8', // sets --prism-axis-color
  colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981'], // replaces --prism-color-1 through -4
  fontFamily: 'Inter, system-ui, sans-serif', // sets --prism-font-family
  gridColor: '#e2e8f0', // sets --prism-grid-color
  gridOpacity: 0.6, // sets --prism-grid-opacity
  textColor: '#0f172a', // sets --prism-text-color
  tooltipBg: '#0f172a', // sets --prism-tooltip-bg
});
```

`setTheme` writes inline custom properties, so it takes precedence over stylesheet defaults. Call `resetTheme()` to clear every custom property `setTheme` can set and restore the default theme: useful for a theme-switcher's "reset" action or test teardown:

```ts
import { resetTheme } from '@vielzeug/prism';

resetTheme();
```

### Theming One Subtree (component libraries)

Pass `scope` to write the tokens onto one element instead of `document.documentElement`. Charts render inside it, so their `var(--prism-*)` lookups resolve against the scoped values without touching `:root` — the hook for apps whose theme lives in a JS palette object (MUI, Chakra, Backstage):

```tsx
import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { createBarChart, resetTheme, setTheme, type BarSeriesConfig } from '@vielzeug/prism';
import '@vielzeug/prism/theme.css';

function CostsChart({ series }: { series: BarSeriesConfig[] }) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scope = containerRef.current;

    if (!scope) return;

    // Scoped tokens win over :root inside this subtree and never leak out of it.
    setTheme(
      { axisColor: theme.palette.divider, textColor: theme.palette.text.primary },
      { scope },
    );

    const chart = createBarChart(scope, { series });

    return () => {
      chart.dispose();
      resetTheme({ scope });
    };
  }, [series, theme]);

  return <div ref={containerRef} style={{ height: 300 }} />;
}
```

A scoped call and a global call are independent: `resetTheme({ scope })` clears only what `setTheme({ scope })` wrote.

### Custom Theme (CSS)

```css
:root {
  --prism-color-1: #6366f1;
  --prism-color-2: #22c55e;
  --prism-axis-color: #71717a;
  --prism-grid-color: #f4f4f5;
  --prism-text-color: #18181b;
  --prism-tooltip-bg: #27272a;
  --prism-font-family: 'Inter', system-ui, sans-serif;
}
```

### Scoped Themes

Apply tokens to a specific container:

```css
.dark-dashboard {
  --prism-axis-color: #64748b;
  --prism-grid-color: #334155;
  --prism-text-color: #e2e8f0;
}
```

### Available Tokens

| Token                     | Default                    | Description            |
| ------------------------- | -------------------------- | ---------------------- |
| `--prism-color-{1-8}`     | Colorblind-safe palette    | Series color palette   |
| `--prism-bg`              | `transparent`              | Chart background       |
| `--prism-axis-color`      | `hsl(215deg 16% 47%)`      | Axis lines and ticks   |
| `--prism-grid-color`      | `hsl(220deg 10% 75%)`      | Grid lines             |
| `--prism-text-color`      | `hsl(215deg 25% 27%)`      | Axis labels and text   |
| `--prism-font-family`     | `system-ui`                | Chart font             |
| `--prism-font-size`       | `0.75rem`                  | Label font size        |
| `--prism-tooltip-bg`      | `hsl(222deg 47% 11%)`      | Tooltip background     |
| `--prism-tooltip-color`   | `hsl(210deg 40% 98%)`      | Tooltip text           |
| `--prism-tooltip-radius`  | `0.375rem`                 | Tooltip border radius  |
| `--prism-crosshair-color` | `hsl(215deg 16% 47%)`      | Crosshair line         |
| `--prism-crosshair-dash`  | `4 2`                      | Crosshair dash pattern |

The palette follows Wong (2011) so adjacent series stay distinguishable under common color-vision deficiencies. Dark mode applies through `prefers-color-scheme`, an `html.dark` class, or `data-prism-theme="dark"` on the chart container or any ancestor — the last is the hook for apps that switch theme in JS without owning `<html>`.

Radar charts add their own tokens, each defaulting to a shared one:

| Token | Default | Description |
| --- | --- | --- |
| `--prism-radar-grid-color` | `--prism-grid-color` | Rings |
| `--prism-radar-grid-opacity` | `0.7` | Ring and spoke opacity |
| `--prism-radar-band-fill` | `--prism-grid-color` | Alternate ring shading |
| `--prism-radar-band-opacity` | `0.14` | Shading opacity |
| `--prism-radar-spoke-color` | `--prism-radar-grid-color` | Spokes |
| `--prism-radar-fill-opacity` | `--prism-area-opacity` | Solid shape fill |
| `--prism-radar-stroke-width` | `--prism-line-width` | Shape outline |
| `--prism-radar-point-radius` | `--prism-point-radius` | Vertex dots |
| `--prism-radar-point-radius-active` | `--prism-point-radius-hover` | Dots on the active axis |
| `--prism-radar-label-color` / `-size` | Secondary text tokens | Axis labels |
| `--prism-radar-value-color` / `-size` | Text tokens | Vertex values |
| `--prism-radar-dim-opacity` | `--prism-dim-opacity` | Other shapes while one is hovered |

Shared interaction and chart tokens:

| Token | Default | Description |
| --- | --- | --- |
| `--prism-dim-opacity` | `0.35` | Series or slices outside the active one |
| `--prism-active-point-radius` | `--prism-point-radius-hover` | Points marked at the active key |
| `--prism-point-ring` | `Canvas` | Ring separating active and end points from the line |
| `--prism-focus-color` | `--prism-color-1` | Focus outline of a keyboard-focused chart |
| `--prism-bar-radius` | `4px` | Bar corner radius (stacked bars stay square) |
| `--prism-bar-band-fill` / `-opacity` | Grid colour / `0.18` | Shaded active category |
| `--prism-bar-dim-opacity` | `0.55` | Bars outside the active category |
| `--prism-area-gradient-start` / `-end` | `0.45` / `0.02` | Gradient fill opacity at the line and the baseline |
| `--prism-spark-gradient-start` / `-end` | `0.35` / `0` | Sparkline gradient fill |

Explicit config such as `strokeWidth`, `fillOpacity`, or `borderRadius` always wins over these tokens.

## Scales (Standalone)

Scales can be used independently for custom visualizations:

```ts
import { linearScale, timeScale, bandScale } from '@vielzeug/prism';

const y = linearScale({ domain: [0, 100], range: [300, 0] });
y.map(50); // → 150
y.invert(150); // → 50
y.ticks(5); // → [0, 20, 40, 60, 80, 100]

const x = bandScale({ domain: ['A', 'B', 'C'], range: [0, 300] });
x.map('B'); // → pixel left edge of band B
x.bandwidth(); // → width of each band
```

## Lifecycle and Cleanup

Every chart returns a `ChartHandle`. Always call `dispose()` when removing a chart:

```ts
const chart = createLineChart(container, config);

// When done:
chart.dispose();

// Or with TC39 explicit resource management:
{
  using chart = createLineChart(container, config);
  // auto-disposed at block end
}
```

Calling `dispose()`:

- Cancels in-flight transitions
- Disconnects the `ResizeObserver`
- Removes the SVG element, tooltip, and legend from the DOM
- Restores container styles changed for tooltip positioning
- Is idempotent: safe to call multiple times

Call `update()` only while the handle is active. Updating a disposed chart throws `PrismRenderError`.

## Responsive Behavior

Charts resize automatically when the container dimensions change. Prism uses `ResizeObserver` internally: no manual `resize()` call is needed.

## Runtime Observation

Every handle exposes `tap()` to observe runtime behavior — resize and dispose — outside the render path. It reuses the chart's own `ResizeObserver`, so observing costs nothing extra, and handler errors are swallowed: observation never affects chart behavior.

```ts
import { createLineChart } from '@vielzeug/prism';

const chart = createLineChart(container, {
  series: [{ data: [{ key: 1, value: 10 }], name: 'Revenue' }],
});
const controller = new AbortController();
const unsubscribe = chart.tap(
  (event) => {
    if (event.type === 'resize') console.log('resized', event.width, event.height);
    if (event.type === 'dispose') console.log('disposed');
  },
  { signal: controller.signal },
);
```

`tap()` returns an unsubscribe function; pass `options.signal` to detach automatically instead. The `resize` event carries the new `width`/`height` and fires after the chart re-laid-out; `dispose` fires once, before teardown completes. Tapping a disposed handle returns a no-op unsubscribe. This is separate from prism's internal validation warnings, which run automatically in development and are never part of the public API.

## Accessibility

Label informative charts with `a11y: { ariaLabel }`. A labelled chart renders with `role="img"`, is focusable, and supports keyboard navigation. Charts without `a11y` are decorative and render with `aria-hidden="true"`.

```ts
createLineChart(container, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [...],
});
```

Mark a chart decorative explicitly when surrounding text already states its meaning:

```ts
createSparkline(container, {
  a11y: { decorative: true },
  data: [...],
});
```

### Keyboard and announcements

Every labelled chart except sparklines shares one keyboard model:

| Chart | Arrow keys move between | `Home` / `End` | Announced |
| --- | --- | --- | --- |
| Line, area | x positions | First / last position | `1: Adam 3, Eve 6` |
| Bar | categories | First / last category | `Str: Adam 8, Eve 5` |
| Pie | slices | First / last slice | `Wins: 15 (75%)` |
| Radar | axes (wrapping) | Not supported | `Agility: Adam 6, Eve 9` |

The first arrow press focuses the first item. `Enter` or `Space` fires `onClick` for the focused item, and `Escape` clears it. The tooltip speaks the text when one is enabled; otherwise the chart's own `role="status"` region (`.prism-live`) does, so each value is announced once.

### Hover feedback

The active key is shown the same way on every chart. Line and area charts mark each series' point and dim the series farther from the pointer. Bar charts shade the category band and dim the other categories. Pie charts dim the other slices. Radar charts highlight the active spoke and its points, and dim the other shapes while one is hovered.

## Framework Integration

Prism has no framework adapter. Connect the same three operations to your framework's lifecycle: create after mount, update when state changes, and dispose before unmount.

```ts
import { createLineChart, type ChartHandle, type ContinuousDatum, type LineSeriesConfig } from '@vielzeug/prism';

let chart: ChartHandle<LineSeriesConfig[]> | undefined;

export function mountChart(container: HTMLElement, data: ContinuousDatum[]): void {
  chart = createLineChart(container, { series: [{ data, name: 'Series' }] });
}

export function updateChart(data: ContinuousDatum[]): void {
  chart?.update([{ data, name: 'Series' }]);
}

export function unmountChart(): void {
  chart?.dispose();
  chart = undefined;
}
```

## Working with Other Vielzeug Libraries

### With Ripple

Keep state ownership in Ripple and connect it to Prism through an explicit subscription.

```ts
import { createLineChart } from '@vielzeug/prism';
import { signal } from '@vielzeug/ripple';

const data = signal([{ key: 1, value: 10 }]);
const toSeries = () => [{ data: data.value, name: 'Series' }];
const chart = createLineChart(container, { series: toSeries() });
const unsubscribe = data.subscribe(() => chart.update(toSeries()));

// Cleanup both owners together.
unsubscribe();
chart.dispose();
```

### With Sourcerer

Bind chart data to a Sourcerer remote source so charts update whenever the list refreshes.

```ts
import { createBarChart } from '@vielzeug/prism';
import { createPageSource } from '@vielzeug/sourcerer';

const source = createPageSource({
  load: async ({ page, pageSize, signal }) => {
    const result = await api.stats.list({ page, pageSize }, { signal });
    return { items: result.data, totalItems: result.total };
  },
});
const toSeries = (state) => [
  {
    data: state.items.map((item) => ({ key: item.label, value: item.count })),
    name: 'Series',
  },
];
const chart = createBarChart(container, { series: toSeries(source.state) });
const unsubscribe = source.subscribe((state) => chart.update(toSeries(state)));
void source.reload().catch(() => undefined);
```

## Best Practices

- Ensure the container element has explicit dimensions before calling a chart factory: `ResizeObserver` needs a non-zero layout size to trigger the first render.
- Call `chart.dispose()` in your framework's unmount/cleanup phase to cancel transitions, disconnect resize observation, and remove DOM nodes.
- Call `chart.update(data)` from your application state boundary; Prism does not require or own a state library.
- Set `a11y: { ariaLabel: '…' }` on every chart that conveys meaningful data: unlabelled charts are hidden from assistive technology and receive no keyboard navigation.
- Observe lifecycle with `chart.tap(handler)` rather than polling `chart.disposed` or wrapping the container: it costs nothing when untapped and detaches via `signal`.
- For SSR, skip chart creation server-side: Prism depends on DOM APIs and `ResizeObserver`. Render charts only after hydration in a `onMounted`/`useEffect` callback.
