---
title: Prism — Usage Guide
description: Concepts, patterns, and best practices for @vielzeug/prism — reactive SVG charts.
---

[[toc]]

## Basic Setup

Every chart needs a container element with defined dimensions and the theme CSS:

```ts
import '@vielzeug/prism/theme';
```

```html
<div id="chart" style="width: 100%; height: 300px;"></div>
```

Prism observes the container size via `ResizeObserver` and re-renders automatically on resize.

## Reactivity with Signals

Prism accepts both plain values and `@vielzeug/ripple` signals for any data property. When a signal changes, the chart re-renders automatically in the next animation frame.

### Static Data

```ts
import { createLineChart } from '@vielzeug/prism';

const chart = createLineChart(container, {
  series: [{ name: 'Static', data: [{ x: 1, y: 10 }, { x: 2, y: 20 }] }],
});
```

### Reactive Data

```ts
import { createLineChart } from '@vielzeug/prism';
import { signal } from '@vielzeug/ripple';

const data = signal([{ x: 1, y: 10 }, { x: 2, y: 20 }]);

const chart = createLineChart(container, {
  series: [{ name: 'Live', data }],
});

// Later — chart updates automatically
data.value = [...data.value, { x: 3, y: 30 }];
```

### The `MaybeSignal<T>` Pattern

All data-bearing config fields use the `MaybeSignal<T>` type:

```ts
type MaybeSignal<T> = T | ReadonlySignal<T>;
```

Pass a plain value when data is fixed, or a signal when it changes dynamically. The chart handles both identically.

## Line Charts

```ts
import { createLineChart } from '@vielzeug/prism';

const chart = createLineChart(container, {
  series: [
    {
      name: 'Revenue',
      data: [{ x: 1, y: 100 }, { x: 2, y: 150 }, { x: 3, y: 130 }],
      color: '#3b82f6',
      curve: 'monotone',  // 'linear' | 'monotone' | 'step'
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

### Time-based X Axis

When data points use `Date` objects for `x`, Prism automatically applies a time scale:

```ts
const chart = createLineChart(container, {
  series: [{
    name: 'Signups',
    data: [
      { x: new Date('2024-01-01'), y: 50 },
      { x: new Date('2024-02-01'), y: 80 },
      { x: new Date('2024-03-01'), y: 120 },
    ],
  }],
  xAxis: { position: 'bottom', tickFormat: (d) => (d as Date).toLocaleDateString() },
  yAxis: { position: 'left' },
});
```

## Bar Charts

```ts
import { createBarChart } from '@vielzeug/prism';

const chart = createBarChart(container, {
  series: [{
    name: 'Sales',
    data: [
      { x: 'Q1', y: 200 },
      { x: 'Q2', y: 350 },
      { x: 'Q3', y: 280 },
      { x: 'Q4', y: 400 },
    ],
    borderRadius: 4,
  }],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
});
```

### Variants

Select the bar layout with `variant`:

| Value | Layout |
|---|---|
| `'grouped'` | Vertical grouped (default) |
| `'stacked'` | Vertical stacked |
| `'grouped-horizontal'` | Horizontal grouped |
| `'stacked-horizontal'` | Horizontal stacked |

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

```ts
import { createAreaChart } from '@vielzeug/prism';

const chart = createAreaChart(container, {
  series: [{
    name: 'Users',
    data: userData,
    curve: 'monotone',
    fillOpacity: 0.2,
    showLine: true,
  }],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  crosshair: true,
});
```

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
  variant: 'donut',  // 'pie' | 'donut' | 'semi'
  tooltip: true,
  transition: { duration: 400, easing: 'ease-out' },
});
```

### Variants

| Value | Shape |
|---|---|
| `'pie'` | Full circle, no hole |
| `'donut'` | Full circle with inner hole (~55% of outer by default) |
| `'semi'` | Top-half semicircle with inner hole — useful for gauges |

### Inner Radius

`innerRadius` overrides the automatic calculation:

```ts
createPieChart(container, {
  data,
  variant: 'donut',
  innerRadius: 60,  // explicit pixels
});
```

### Slice Labels

Set `label` on each `PieSliceConfig` to render text at the arc centroid:

```ts
{ value: 42, label: '42%' }
```

Style labels via CSS:

```css
:root {
  --prism-pie-label-color: #fff;
  --prism-pie-label-size: 11px;
}
```

### Reactive Data

```ts
import { signal } from '@vielzeug/ripple';

const data = signal([
  { label: 'A', value: 40 },
  { label: 'B', value: 60 },
]);

const chart = createPieChart(container, { data, variant: 'donut' });

data.value = [{ label: 'A', value: 55 }, { label: 'B', value: 45 }];
```

### Event Hooks

```ts
createPieChart(container, {
  data,
  onHover: (slice, index) => {
    // slice/index are null on mouseleave
    if (slice) console.log(slice.label, slice.value);
  },
  onClick: (slice, index) => {
    console.log('clicked', slice.label);
  },
});
```

## Sparklines

Sparklines are minimal inline charts with no axes, no legend, and no margin — designed to live inline with text or inside table cells.

```ts
import { createSparkline } from '@vielzeug/prism';

const spark = createSparkline(container, {
  data: [12, 18, 14, 22, 19, 28],
  variant: 'line',      // 'line' | 'area' | 'bar' (default: 'line')
  color: '#3b82f6',
  curve: 'monotone',
  strokeWidth: 1.5,
});

spark.dispose();
```

### Variants

- **`line`** — simple polyline path (default)
- **`area`** — filled area + line overlay
- **`bar`** — vertical bar for each data point

### Reactive Data

```ts
import { signal } from '@vielzeug/ripple';

const data = signal([12, 18, 14, 22]);

const spark = createSparkline(container, { data, variant: 'area' });

data.value = [...data.value, 30]; // re-renders automatically
```

### Event Hooks

Sparklines use simplified hooks — index-based rather than full `ChartEvent`:

```ts
const spark = createSparkline(container, {
  data: [10, 20, 30],
  onHover: (index, value) => {
    // index/value are null on mouseleave
    if (index !== null) console.log(`Hovering point ${index}: ${value}`);
  },
  onClick: (index, value) => {
    console.log(`Clicked point ${index}: ${value}`);
  },
});
```

> **Note:** Sparkline SVGs are marked `aria-hidden="true"` since they are decorative. Provide meaningful surrounding text context for accessibility.

## Axes and Grid

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

## Tooltips

Enable with `tooltip: true` for default rendering, or provide a custom `render` function returning an HTML string:

```ts
{
  tooltip: {
    offset: 12,
    render: (point, series) => `
      <strong>${series.name}</strong><br/>
      Value: ${point.y.toLocaleString()}
    `,
  },
}
```

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
    if (event) console.log(event.point, event.series);
  },
  onClick: (event) => {
    console.log('clicked', event.point);
  },
});
```

`ChartEvent` provides:
- `point` — the nearest `DataPoint`
- `series` — the corresponding `Series` config
- `originalEvent` — the raw `MouseEvent`

## Plugins

Extend any chart with custom behavior using the `ChartPlugin` interface:

```ts
import type { ChartPlugin } from '@vielzeug/prism';

const myPlugin: ChartPlugin = {
  install(svg, container) {
    // called once after the chart mounts
    svg.addEventListener('click', handler);
  },
  destroy() {
    // called when chart.dispose() runs
    svg.removeEventListener('click', handler);
  },
};

const chart = createLineChart(container, {
  series: [{ name: 'Revenue', data }],
  plugins: [myPlugin],
});
```

## Animations

Pass a `transition` config to animate enter and update transitions:

```ts
{
  transition: {
    duration: 400,
    easing: 'ease-out',
    stagger: 30,  // bar charts only: ms delay between each bar's enter animation
  },
}
```

Line and area charts use CSS transitions on the SVG path `d` attribute. Bar charts use a requestAnimationFrame loop — `stagger` delays each bar in sequence, creating a cascade effect on first render.

## Theming

Import the default theme:

```ts
import '@vielzeug/prism/theme';
```

### Programmatic Theme with `setTheme`

Call `setTheme` once at app startup to apply custom tokens programmatically:

```ts
import { setTheme } from '@vielzeug/prism';

setTheme({
  colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981'],  // replaces --prism-color-1 through -4
  fontFamily: 'Inter, system-ui, sans-serif',              // sets --prism-font-family
  gridColor: '#e2e8f0',                                    // sets --prism-grid-color
  gridOpacity: 0.6,                                        // sets --prism-grid-opacity
});
```

`setTheme` writes to `document.documentElement` style, so it takes precedence over CSS file defaults.

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

| Token | Default | Description |
|---|---|---|
| `--prism-color-{1-8}` | Tailwind palette | Series color palette |
| `--prism-bg` | `transparent` | Chart background |
| `--prism-axis-color` | `#94a3b8` | Axis lines and ticks |
| `--prism-grid-color` | `#e2e8f0` | Grid lines |
| `--prism-text-color` | `#334155` | Axis labels and text |
| `--prism-font-family` | `system-ui` | Chart font |
| `--prism-font-size` | `12px` | Label font size |
| `--prism-tooltip-bg` | `#1e293b` | Tooltip background |
| `--prism-tooltip-color` | `#f8fafc` | Tooltip text |
| `--prism-tooltip-radius` | `6px` | Tooltip border radius |
| `--prism-crosshair-color` | `#64748b` | Crosshair line |
| `--prism-crosshair-dash` | `4 2` | Crosshair dash pattern |

## Scales (Standalone)

Scales can be used independently for custom visualizations:

```ts
import { linearScale, timeScale, bandScale } from '@vielzeug/prism';

const y = linearScale({ domain: [0, 100], range: [300, 0] });
y.map(50);       // → 150
y.invert(150);   // → 50
y.ticks(5);      // → [0, 20, 40, 60, 80, 100]

const x = bandScale({ domain: ['A', 'B', 'C'], range: [0, 300] });
x.map('B');      // → pixel left edge of band B
x.bandwidth();   // → width of each band
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
- Disconnects the `ResizeObserver`
- Cancels all reactive effects
- Removes the SVG element from the DOM
- Removes the tooltip and legend elements
- Calls `destroy()` on all plugins

> **Reactivity is automatic** — charts re-render whenever signal data changes. There is no manual `update()` call needed.

## Responsive Behavior

Charts resize automatically when the container dimensions change. Prism uses `ResizeObserver` internally — no manual `resize()` call is needed.
