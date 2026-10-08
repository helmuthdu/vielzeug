---
title: 'Prism: Usage Guide'
description: Create responsive SVG charts, update their data, handle interaction, and theme @vielzeug/prism.
---

[[toc]]

## Basic Usage

Create a host element with non-zero dimensions, then pass it to a chart factory. This example creates the host in JavaScript so the snippet can run as written.

```ts
import { createLineChart } from '@vielzeug/prism';
import '@vielzeug/prism/theme.css';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createLineChart(container, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [
    {
      name: 'Revenue',
      data: [
        { key: 1, value: 10 },
        { key: 2, value: 16 },
      ],
    },
  ],
  tooltip: true,
});

chart.dispose();
```

Each factory appends an SVG to its container and returns a `ChartHandle`. Prism observes the container with `ResizeObserver`; if it has zero dimensions on creation, Prism uses a temporary `600 × 300` size and warns in development. Give the host its layout before creating the chart.

## Updating Data

Keep application state outside Prism and pass the next complete data value to `update()`. The update method replaces chart data synchronously; the default transition may animate the resulting SVG.

```ts
import { createLineChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

let series = [{ data: [{ key: 1, value: 10 }], name: 'Live' }];
const chart = createLineChart(container, { series });

series = [{ data: [{ key: 1, value: 10 }, { key: 2, value: 20 }], name: 'Live' }];
chart.update(series);
chart.dispose();
```

`update()` accepts the type shown by that factory's handle: a complete series array for line, area, scatter, bar, and radar charts; a slice array for pie charts; and a number or stack-segment array for sparklines. Chart options such as axes, variant, callbacks, and accessibility are set at creation. For example, radar axes and a pie chart's variant do not change through `update()`.

## Line Charts

Line and area series use number or `Date` keys. All series in one chart must use the same key kind. Use `curve` to choose interpolation, and enable markers with `showPoints`.

```ts
import { createLineChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createLineChart(container, {
  a11y: { ariaLabel: 'Revenue and expenses' },
  series: [
    {
      curve: 'monotone',
      data: [{ key: 1, value: 100 }, { key: 2, value: 150 }, { key: 3, value: 130 }],
      name: 'Revenue',
      showPoints: true,
    },
    {
      color: '#c2410c',
      data: [{ key: 1, value: 70 }, { key: 2, value: 95 }, { key: 3, value: 110 }],
      name: 'Expenses',
    },
  ],
  tooltip: true,
  xAxis: { label: 'Month' },
  yAxis: { grid: true, label: 'Dollars' },
});

chart.dispose();
```

### Independent Value Axes

Assign a line series to the right axis when it uses a different value range. Both axes share the x-scale; `rightYAxis` configures the second axis and cannot configure its position or grid.

```ts
import { createLineChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createLineChart(container, {
  a11y: { ariaLabel: 'Health and damage by level' },
  rightYAxis: { label: 'Damage' },
  series: [
    { data: [{ key: 1, value: 30 }, { key: 2, value: 20 }], name: 'Health' },
    { data: [{ key: 1, value: 100 }, { key: 2, value: 300 }], name: 'Damage', yAxis: 'right' },
  ],
  yAxis: { grid: true, label: 'Health' },
});

chart.dispose();
```

When any series uses the right axis, the primary value axis is placed on the left. Grid lines belong to the primary `yAxis`. The independent numeric scales mean that curve crossings do not imply equal values.

### Time-Based X Axis

Use `Date` values for every key when plotting time. Line and area charts use a time scale whose domain fits the data instead of rounding outward to tick boundaries.

```ts
import { createLineChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const chart = createLineChart(container, {
  a11y: { ariaLabel: 'Signups over time' },
  series: [{
    data: [
      { key: new Date('2026-09-01'), value: 50 },
      { key: new Date('2026-09-08'), value: 80 },
      { key: new Date('2026-09-15'), value: 120 },
    ],
    name: 'Signups',
  }],
  xAxis: { tickFormat: (value) => value instanceof Date ? formatter.format(value) : String(value) },
});

chart.dispose();
```

`tickFormat` formats axis labels only. Tooltip content and accessibility announcements use the underlying keys and values.

## Bar Charts

Bar chart keys are string categories. The default `grouped` variant puts series side by side; the horizontal variants put categories on the y-axis and values on the x-axis.

```ts
import { createBarChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createBarChart(container, {
  a11y: { ariaLabel: 'Sales by quarter' },
  series: [{
    data: [{ key: 'Q1', value: 200 }, { key: 'Q2', value: 350 }, { key: 'Q3', value: 280 }],
    name: 'Sales',
  }],
  tooltip: true,
});

chart.dispose();
```

Choose `grouped`, `stacked`, `grouped-horizontal`, or `stacked-horizontal` in `variant`. Negative values in a stacked chart are clamped to zero and produce a development warning. Bars in stacked variants remain square; `borderRadius` applies to grouped bars.

Axes render by default, with grid lines on the value axis. For horizontal variants, `xAxis` is the value axis and `yAxis` is the category axis. Configure `grid` on the value axis.

## Area Charts

Area series use a gradient fill by default. Set `fill: 'solid'` for a flat fill, or set `fillOpacity` to override the theme opacity for that series.

```ts
import { createAreaChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createAreaChart(container, {
  a11y: { ariaLabel: 'Visitors over time' },
  crosshair: true,
  series: [{
    curve: 'monotone',
    data: [{ key: 1, value: 12 }, { key: 2, value: 18 }, { key: 3, value: 15 }],
    fill: 'solid',
    fillOpacity: 0.2,
    name: 'Visitors',
    showLine: true,
  }],
});

chart.dispose();
```

## Scatter Charts

Scatter charts treat every datum as an independent point: `key` is the numeric x-value and `value` is the y-value. The scales fit the observed values rather than forcing the y-domain to include zero. Set `pointRadius` on a series to change its marker size.

```ts
import { createScatterChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createScatterChart(container, {
  a11y: { ariaLabel: 'Height against weight' },
  series: [{
    data: [{ key: 160, value: 55 }, { key: 175, value: 70 }, { key: 190, value: 88 }],
    name: 'Cohort A',
    pointRadius: 5,
  }],
  tooltip: true,
});

chart.dispose();
```

Scatter callbacks identify one nearest point and do not provide cross-series `values`, because points do not share a category key.

## Forecast and Emphasis Styling

Add `dash` or `opacity` to individual `Datum` objects when one part of a series needs distinct styling. These fields do not change interaction, tooltip, or accessibility behavior.

```ts
import { createLineChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const values = [10, 13, 15, 18];
const chart = createLineChart(container, {
  series: [{
    data: values.map((value, index) => ({
      key: index + 1,
      value,
      ...(index >= 2 ? { dash: '5 5', opacity: 0.4 } : {}),
    })),
    name: 'Forecast',
    showPoints: true,
  }],
});

chart.dispose();
```

For line and area charts, each datum's `dash` styles the segment from that datum to the next; the final datum has no outgoing segment. Line opacity also fades the datum's marker. Area styling affects the top line, not the fill. Bar opacity and dashes apply to the individual bar; scatter opacity applies to its point and scatter dashes are ignored. Pie, radar, and sparkline ignore these two fields.

## Pie, Donut, and Semi Charts

Use `createPieChart()` for all three shapes. `variant` is fixed when the chart is created; `update()` replaces the slice data.

```ts
import { createPieChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:320px;height:240px';
document.body.append(container);

const chart = createPieChart(container, {
  a11y: { ariaLabel: 'Orders by channel' },
  data: [
    { label: 'Direct', value: 42 },
    { label: 'Organic', value: 28 },
    { label: 'Referral', value: 18 },
    { label: 'Social', value: 12 },
  ],
  legend: true,
  tooltip: true,
  variant: 'donut',
});

chart.dispose();
```

The `pie` default has no inner radius. `donut` and `semi` default to an inner radius of 55% of the outer radius. `innerRadius` overrides that size in pixels. Slice labels are omitted when they do not fit; keep a tooltip or legend when small slices need identifying.

## Radar Charts

Define at least three axes when creating a radar chart. Series data uses string keys that match `RadarAxisConfig.key`; `update()` replaces series but keeps axes and other configuration fixed.

```ts
import { createRadarChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:400px;height:320px';
document.body.append(container);

const axes = [
  { key: 'strength', label: 'Strength' },
  { key: 'agility', label: 'Agility' },
  { key: 'endurance', label: 'Endurance' },
];
const chart = createRadarChart(container, {
  a11y: { ariaLabel: 'Hero stats' },
  axes,
  domain: [0, 10],
  series: [{
    data: [{ key: 'strength', value: 8 }, { key: 'agility', value: 6 }, { key: 'endurance', value: 9 }],
    name: 'Adam',
  }],
  tooltip: true,
});

chart.dispose();
```

The default shared domain starts at zero and uses a nice maximum; set `domain` to compare series on a fixed range. Per-axis `min` and `max` override the chart domain for that axis. Grid rings, bands, curves, fills, vertex dots, and values are configurable; see `RadarChartConfig` and `RadarGridConfig` in the API reference.

## Sparklines

Sparklines omit axes, margins, and legends. Choose `line`, `area`, or `bar` for numeric arrays, and `stack` for an array of `StackSegment` objects.

```ts
import { createSparkline } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:240px;height:48px';
document.body.append(container);

const chart = createSparkline(container, {
  a11y: { ariaLabel: 'Weekly orders' },
  data: [10, 14, 12, 18, 22],
  variant: 'area',
});

chart.update([10, 14, 12, 18, 22, 25]);
chart.dispose();
```

For a stacked sparkline, each segment can set `value`, `color`, and `label`. Sparklines do not offer keyboard navigation, a tooltip, or a live value announcer. Add a visible value or summary when the trend conveys important information.

## Interaction

Set `tooltip: true` to show Prism's default tooltip, or pass a `TooltipConfig` to format its content. A `render` callback receives the active `Datum` and `Series`. Returned strings are inserted as text; return a DOM `Node` for structured content.

```ts
import { createLineChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createLineChart(container, {
  series: [{ data: [{ key: 1, value: 4200 }, { key: 2, value: 5100 }], name: 'Revenue' }],
  tooltip: {
    render: (datum, series) => `${series.name}: ${new Intl.NumberFormat().format(datum.value)}`,
  },
});

chart.dispose();
```

`onHover` receives an event while a point, category, slice, or radar axis is active, then `null` when the interaction clears. `onClick` receives the selected event. For line, area, and bar charts, `ChartEvent.values` contains each series' datum at that shared key; a missing datum is `undefined`. Scatter, pie, radar, and sparkline use their chart-specific event types.

`crosshair` is available on line, area, and scatter charts. By default it shows a vertical guide and snaps the line to the nearest datum. Set `horizontal: true` to add a horizontal guide or `vertical: false` to hide the vertical one. Set `snap: false` to make the guide follow the pointer; tooltip and callback data still come from the nearest datum.

### Keyboard and Announcements

Set `a11y: { ariaLabel }` on an informative chart. Prism gives the SVG `role="img"`, an accessible name, and keyboard focus. Arrow keys move among chart data; `Home` and `End` move to the first and last item where supported; `Enter` or `Space` activates an item when an `onClick` callback is configured; `Escape` clears the active selection. Sparklines do not support keyboard navigation.

When `a11y` is omitted, or set to `{ decorative: true }`, the SVG is marked `aria-hidden="true"` and does not enter the keyboard tab order. Only mark charts decorative when their information is available elsewhere. Interactive cartesian and pie/radar charts use the tooltip as a polite live region when enabled; otherwise they announce active values in `.prism-live`. Sparklines have no live value announcements, so provide an equivalent visible value or summary.

## Animation

Chart motion is enabled by default, with a 300 ms duration per animated lane (radar uses 400 ms). Pass `transition: false` to render updates synchronously, or pass `true` to state the default explicitly.

```ts
import { createBarChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createBarChart(container, {
  series: [{ data: [{ key: 'A', value: 4 }, { key: 'B', value: 7 }], name: 'Count' }],
  transition: { duration: 500, easing: 'ease-out', preference: 'system' },
});

chart.dispose();
```

Columns grow together from their baseline by default over 300 ms. Lines trace their final curve over 420 ms, uncovering point markers along the way without fading or shifting the series. Line data updates retain the default 300 ms geometry transition; an explicit `duration` overrides both timings.

`preference: 'system'` (the default) disables JavaScript motion when the user prefers reduced motion. Use `'always'` to ignore that preference or `'never'` to disable motion. `stagger` sets an optional delay between bars or radar series; bar charts cap the effective delay so long category axes do not add unbounded time. Named easing values are `ease-in`, `ease-in-out`, `ease-out`, `back-out`, `expo-out`, and `linear`; you can also provide an easing function.

## Responsive Layout and Lifecycle

Size the host with CSS. Prism observes its content box and updates the SVG dimensions and chart layout when it changes. Bar and line resize redraws apply immediately rather than animating between layout sizes; entrance animations and explicit data-update transitions remain enabled. The legend is rendered as container chrome outside the SVG and included in resize calculations.

Call `dispose()` when the view no longer owns the chart. Disposal is idempotent: it removes the SVG, tooltip, legend, and resize observation, stops in-flight chart motion, and aborts `disposalSignal`. `chart[Symbol.dispose]()` calls the same cleanup method.

Use `tap()` when external code needs resize or dispose notifications rather than observing the chart DOM itself:

```ts
import { createLineChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const chart = createLineChart(container, {
  series: [{ data: [{ key: 1, value: 10 }], name: 'Revenue' }],
});
const stopObserving = chart.tap((event) => {
  if (event.type === 'resize') console.log(event.width, event.height);
  if (event.type === 'dispose') console.log('chart disposed');
});

stopObserving();
chart.dispose();
```

`tap()` returns an unsubscribe function and accepts `{ signal }` for automatic unsubscription. A listener exception is swallowed by the observer so it cannot interrupt chart rendering.

## Theming

Import the stylesheet once to load Prism's structural styles, default tokens, dark-mode rules, and reduced-motion CSS. You can override any CSS custom property on an ancestor of the chart.

```css
.dashboard-chart {
  --prism-color-1: #2563eb;
  --prism-color-2: #16a34a;
  --prism-grid-color: #94a3b8;
  --prism-line-width: 3;
  --prism-text-color: #172033;
  --prism-tooltip-bg: #111827;
}
```

`setTheme()` provides a typed subset of theme properties. A scoped call writes inline values on the provided element; omit `scope` to write them to `document.documentElement`. Inline values override stylesheet tokens until reset.

```ts
import { resetTheme, setTheme } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

setTheme({ colors: ['#2563eb', '#16a34a'], fontFamily: 'Inter, sans-serif' }, { scope: container });
// Call resetTheme({ scope: container }) when this scoped theme is no longer needed.
resetTheme({ scope: container });
```

### Available Tokens

The stylesheet defines defaults for the following token groups. Pie-label color and size are read with fallback values by the renderer but are not declared in the base token block. Set a token on the chart container or an ancestor to scope an override.

| Group | CSS custom properties |
| --- | --- |
| Palette and surfaces | `--prism-color-1` through `--prism-color-8`, `--prism-bg`, `--prism-border-radius` |
| Axes and grid | `--prism-axis-color`, `--prism-axis-width`, `--prism-grid-color`, `--prism-grid-width`, `--prism-grid-dash`, `--prism-grid-opacity` |
| Text | `--prism-font-family`, `--prism-font-size`, `--prism-font-size-label`, `--prism-font-size-title`, `--prism-font-weight`, `--prism-font-weight-title`, `--prism-text-color`, `--prism-text-color-secondary` |
| Tooltip | `--prism-tooltip-bg`, `--prism-tooltip-color`, `--prism-tooltip-border`, `--prism-tooltip-radius`, `--prism-tooltip-padding`, `--prism-tooltip-shadow`, `--prism-tooltip-font-size` |
| Crosshair | `--prism-crosshair-color`, `--prism-crosshair-width`, `--prism-crosshair-dash`, `--prism-crosshair-opacity` |
| Points | `--prism-point-radius`, `--prism-point-radius-hover`, `--prism-point-stroke-width`, `--prism-point-stroke` |
| Bars | `--prism-bar-radius`, `--prism-bar-hover-opacity`, `--prism-bar-gap`, `--prism-bar-band-fill`, `--prism-bar-band-opacity`, `--prism-bar-dim-opacity` |
| Areas and lines | `--prism-area-opacity`, `--prism-area-stroke-width`, `--prism-area-gradient-start`, `--prism-area-gradient-end`, `--prism-line-width`, `--prism-line-width-hover` |
| Interaction | `--prism-dim-opacity`, `--prism-active-point-radius`, `--prism-point-ring`, `--prism-focus-color` |
| Sparklines | `--prism-spark-fill-opacity`, `--prism-spark-gradient-start`, `--prism-spark-gradient-end` |
| Radar | `--prism-radar-grid-color`, `--prism-radar-grid-opacity`, `--prism-radar-band-fill`, `--prism-radar-band-opacity`, `--prism-radar-spoke-color`, `--prism-radar-fill-opacity`, `--prism-radar-stroke-width`, `--prism-radar-point-radius`, `--prism-radar-point-radius-active`, `--prism-radar-label-color`, `--prism-radar-label-size`, `--prism-radar-value-color`, `--prism-radar-value-size`, `--prism-radar-dim-opacity` |
| Motion | `--prism-duration-fast`, `--prism-duration`, `--prism-duration-slow`, `--prism-ease`, `--prism-ease-spring`, `--prism-transition`, `--prism-transition-fast` |
| Legend and pie labels | `--prism-legend-gap`, `--prism-legend-dot-size`, `--prism-legend-font-size`, `--prism-pie-label-color`, `--prism-pie-label-size` |

The default palette and structural colors adapt to `prefers-color-scheme: dark`, `html.dark`, or `[data-prism-theme='dark']` on an ancestor. Scoped inline values set with `setTheme()` take precedence in either mode. The stylesheet also provides `prefers-reduced-motion` overrides for CSS transitions.

## Errors and Diagnostics

Prism throws `PrismRenderError` when the container is not a DOM element, when initial rendering fails, or when `update()` is called on a disposed chart. A wrapped initial-render error exposes its cause. Use `PrismError` to catch all Prism-originated errors.

Empty or malformed data is not always an exception. Depending on the chart, Prism may draw nothing or emit a development-only `console.warn`; examples include an unknown `bandScale` category, negative values in stacked bars, and radar axes with fewer than three entries or duplicate keys. Correct the input rather than relying on a warning for validation.

## Framework Integration

Prism has no React, Vue, or Svelte adapter. In any framework, give Prism a host element after it is mounted, call `update()` when data changes, and call `dispose()` before the host is removed. This plain DOM pattern shows the ownership boundary without depending on a framework-specific lifecycle API:

```ts
import { createLineChart, type LineSeriesConfig } from '@vielzeug/prism';

function mountChart(host: HTMLElement, series: LineSeriesConfig[]) {
  const chart = createLineChart(host, { a11y: { ariaLabel: 'Revenue' }, series });

  return {
    update(next: LineSeriesConfig[]) {
      chart.update(next);
    },
    dispose() {
      chart.dispose();
    },
  };
}

const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px';
document.body.append(host);
const view = mountChart(host, [{ data: [{ key: 1, value: 10 }], name: 'Revenue' }]);
view.update([{ data: [{ key: 1, value: 10 }, { key: 2, value: 15 }], name: 'Revenue' }]);
view.dispose();
```

The application owns its state and host; Prism owns only the SVG, observer, and optional overlay elements it creates.

## Working with Other Vielzeug Libraries

Use Refine components for dashboard controls and keep Prism in a sized host element. Map Refine theme tokens to Prism CSS custom properties or call `setTheme()` with a scoped element; Prism does not require a Refine adapter. Prism uses Orbit internally to place tooltips, so chart users do not need to create Orbit floating elements for the built-in tooltip.

## Best Practices

- Give the host a non-zero size before creating a chart.
- Set `a11y.ariaLabel` when a chart communicates information.
- Use `Date` or number keys consistently across each line or area chart.
- Pass the complete new data value to `update()`.
- Keep chart options fixed after creation; recreate the chart to change them.
- Dispose the handle when its host leaves the owning view.
- Use `transition: false` for deterministic synchronous rendering.
- Prefer CSS custom properties for reusable theme overrides.
