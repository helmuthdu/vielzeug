---
title: Prism — Usage Guide
description: Concepts, patterns, and best practices for @vielzeug/prism — reactive SVG charts and hex world map.
---

[[toc]]

## Basic Setup

Every chart needs a container element and the theme CSS:

```ts
import '@vielzeug/prism/theme';
```

The container must have defined dimensions (width/height via CSS). Prism observes its size and re-renders on resize.

```html
<div id="chart" style="width: 100%; height: 300px;"></div>
```

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

All config fields that accept changing data use the `MaybeSignal<T>` type:

```ts
type MaybeSignal<T> = T | ReadonlySignal<T>;
```

This means you can pass a plain value when data is fixed, or a signal when it updates dynamically. The chart normalizes internally.

## Line Charts

```ts
import { createLineChart } from '@vielzeug/prism';

const chart = createLineChart(container, {
  series: [
    {
      name: 'Revenue',
      data: [{ x: 1, y: 100 }, { x: 2, y: 150 }, { x: 3, y: 130 }],
      color: '#3b82f6',
      curve: 'monotone',   // 'linear' | 'monotone' | 'step'
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

### Grouped Bars

Multiple series render side-by-side:

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

## Axes and Grid

Configure axes on any cartesian chart:

```ts
{
  xAxis: {
    position: 'bottom',      // 'top' | 'bottom'
    tickCount: 5,            // suggested number of ticks
    tickFormat: (v) => `$${v}`,
    label: 'Month',
    grid: true,              // or { color: '#ddd', dash: '4 2' }
  },
  yAxis: {
    position: 'left',        // 'left' | 'right'
    grid: { color: '#f0f0f0' },
    label: 'Revenue ($)',
  },
}
```

## Tooltips

Enable with `tooltip: true` for default rendering, or provide a custom render function:

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

## Crosshair

A vertical guide that snaps to the nearest data point:

```ts
{
  crosshair: true,
  // or configure individually:
  crosshair: { vertical: true, horizontal: true, snap: true },
}
```

## Legend

Add a legend to identify series by name and color. Enable with `legend: true` (defaults to `bottom` position) or pass a `LegendConfig` to control placement:

```ts
{
  legend: true,
  // or:
  legend: { position: 'top' },    // 'top' | 'bottom' | 'left' | 'right'
}
```

The legend renders as a `div` placed outside the SVG — before the chart for `top`, after for `bottom`, `left`, and `right`. Each item shows a color dot and the series `name`.

Customize appearance via CSS custom properties:

```css
:root {
  --prism-legend-gap: 1rem;        /* spacing between items */
  --prism-legend-dot-size: 0.5rem; /* color swatch size */
  --prism-legend-font-size: 0.75rem;
}
```

## Theming

Import the default theme or override CSS custom properties:

```ts
import '@vielzeug/prism/theme';
```

### Custom Theme

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

Apply tokens to a specific container to scope the theme:

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
| `--prism-hex-empty` | `#e2e8f0` | Hex cell with no data |
| `--prism-hex-stroke` | `#cbd5e1` | Hex cell border |
| `--prism-crosshair-color` | `#64748b` | Crosshair line |
| `--prism-crosshair-dash` | `4 2` | Crosshair dash pattern |

## Scales (Standalone)

Scales can be used independently of charts for custom visualizations:

```ts
import { linearScale, timeScale, bandScale } from '@vielzeug/prism';

const y = linearScale({ domain: [0, 100], range: [300, 0] });
y.map(50);       // → 150
y.invert(150);   // → 50
y.ticks(5);      // → [0, 20, 40, 60, 80, 100]

const x = bandScale({ domain: ['A', 'B', 'C'], range: [0, 300] });
x.map('B');      // → pixel position of band B
x.bandwidth();   // → width of each band
```

## Lifecycle and Cleanup

Every chart returns a `ChartHandle` with a `dispose()` method. Always call it when removing a chart:

```ts
const chart = createLineChart(container, config);

// When done:
chart.dispose();

// Or use Symbol.dispose (TC39 explicit resource management):
{
  using chart = createLineChart(container, config);
  // auto-disposed at block end
}
```

Calling `dispose()`:
- Disconnects the `ResizeObserver`
- Disposes all reactive effects
- Removes the SVG element from the DOM
- Cleans up tooltip elements

## Responsive Behavior

Charts automatically resize when their container changes dimensions. No manual `resize()` call is needed — Prism uses `ResizeObserver` internally with `requestAnimationFrame` debouncing.
