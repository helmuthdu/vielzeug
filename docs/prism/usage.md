---
title: Prism — Usage Guide
description: Concepts, update patterns, and best practices for responsive SVG charts with @vielzeug/prism.
---

[[toc]]

## Basic Usage

Every chart needs a container element with defined dimensions and the theme CSS:

```ts
import { createLineChart } from '@vielzeug/prism';
import '@vielzeug/prism/theme';

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

Prism observes the container size via `ResizeObserver` and re-renders automatically on resize. If the container has zero dimensions at mount time, a `warn` is emitted in development — ensure the container has layout before calling the chart factory.

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

### Time-based X Axis

When data points use `Date` objects for `key`, Prism automatically applies a time scale:

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

```ts
import { createAreaChart } from '@vielzeug/prism';

const chart = createAreaChart(container, {
  series: [
    {
      name: 'Users',
      data: userData,
      curve: 'monotone',
      fillOpacity: 0.2,
      showLine: true,
    },
  ],
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
| `'semi'`  | Top-half semicircle with inner hole — useful for gauges |

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
  variant: 'line', // 'line' | 'area' | 'bar' (default: 'line')
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
- **`stack`** — horizontal proportional segments; use `StackSegment[]` for `data` with per-segment colors

### Updating Data

```ts
const spark = createSparkline(container, {
  data: [12, 18, 14, 22],
  variant: 'area',
});

spark.update([12, 18, 14, 22, 30]);
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

Enable with `tooltip: true` for default rendering, or provide a custom `render` function. Strings are rendered as text. Return a DOM node for structured content:

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

- `datum` — the nearest `Datum`
- `series` — the corresponding `Series` config
- `originalEvent` — the raw `MouseEvent`

> **Pie chart events differ** — `onHover` and `onClick` receive `(slice: PieSliceConfig, index: number)` instead of `ChartEvent`. See [`PieChartConfig`](./api.md#piechartconfig) for details.

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

All chart types use requestAnimationFrame-based interpolation. Bar charts additionally support `stagger` — a per-bar delay that creates a cascade effect on first render.

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
  colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981'], // replaces --prism-color-1 through -4
  fontFamily: 'Inter, system-ui, sans-serif', // sets --prism-font-family
  gridColor: '#e2e8f0', // sets --prism-grid-color
  gridOpacity: 0.6, // sets --prism-grid-opacity
});
```

`setTheme` writes to `document.documentElement` style, so it takes precedence over CSS file defaults. Call `resetTheme()` to clear every custom property `setTheme` can set and restore the default theme — useful for a theme-switcher's "reset" action or test teardown:

```ts
import { resetTheme } from '@vielzeug/prism';

resetTheme();
```

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

| Token                     | Default          | Description            |
| ------------------------- | ---------------- | ---------------------- |
| `--prism-color-{1-8}`     | Tailwind palette | Series color palette   |
| `--prism-bg`              | `transparent`    | Chart background       |
| `--prism-axis-color`      | `#94a3b8`        | Axis lines and ticks   |
| `--prism-grid-color`      | `#e2e8f0`        | Grid lines             |
| `--prism-text-color`      | `#334155`        | Axis labels and text   |
| `--prism-font-family`     | `system-ui`      | Chart font             |
| `--prism-font-size`       | `12px`           | Label font size        |
| `--prism-tooltip-bg`      | `#1e293b`        | Tooltip background     |
| `--prism-tooltip-color`   | `#f8fafc`        | Tooltip text           |
| `--prism-tooltip-radius`  | `6px`            | Tooltip border radius  |
| `--prism-crosshair-color` | `#64748b`        | Crosshair line         |
| `--prism-crosshair-dash`  | `4 2`            | Crosshair dash pattern |

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
- Is idempotent — safe to call multiple times

Call `update()` only while the handle is active. Updating a disposed chart throws `PrismRenderError`.

## Responsive Behavior

Charts resize automatically when the container dimensions change. Prism uses `ResizeObserver` internally — no manual `resize()` call is needed.

## Devtools

Import `debugChart()` from the `/devtools` subpath to log a chart's mount, resize, and dispose events to `console.debug`. It's separate from prism's internal validation warnings (those run automatically in development, no import needed) and is tree-shaken from production bundles when this subpath isn't imported.

```ts
import { createLineChart } from '@vielzeug/prism';
import { debugChart } from '@vielzeug/prism/devtools';

const chart = debugChart(createLineChart(container, config), { label: 'revenue' });
// [prism:revenue] mounted
// [prism:revenue] resized  600×300
chart.dispose();
// [prism:revenue] disposed
```

> `debugChart()` wraps and returns the same `ChartHandle` unchanged, so it drops into any `create*Chart()` call without restructuring your code.

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

## Accessibility

Accessibility is a hard requirement for every chart factory. Label informative charts with `a11y: { ariaLabel }`; charts without `a11y` are decorative and render with `aria-hidden="true"`.

Label a chart that conveys meaningful data:

```ts
createLineChart(container, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [...],
});
```

Mark a decorative chart (e.g. a sparkline next to a text label) to exclude it from the accessibility tree:

```ts
createSparkline(container, {
  a11y: { decorative: true },
  data: [...],
});
```

When `a11y` is omitted, every chart is hidden from assistive technology. Always set `a11y: { ariaLabel: '…' }` on charts that users need to understand.

## Best Practices

- Ensure the container element has explicit dimensions before calling a chart factory — `ResizeObserver` needs a non-zero layout size to trigger the first render.
- Call `chart.dispose()` in your framework's unmount/cleanup phase to cancel transitions, disconnect resize observation, and remove DOM nodes.
- Call `chart.update(data)` from your application state boundary; Prism does not require or own a state library.
- Set `a11y: { ariaLabel: '…' }` on every chart that conveys meaningful data — accessibility is a hard requirement, not an optional add-on.
- Wrap a chart with `debugChart()` from the `/devtools` subpath only in development code paths; it is tree-shaken in production.
- For SSR, skip chart creation server-side — Prism depends on DOM APIs and `ResizeObserver`. Render charts only after hydration in a `onMounted`/`useEffect` callback.
