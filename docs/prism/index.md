---
title: 'Prism: Responsive SVG data visualization'
description: Responsive SVG charts with explicit updates, keyboard and screen-reader support, and CSS theming.
package: prism
category: ui
keywords: [chart, svg, visualization, responsive, line-chart, bar-chart, area-chart, pie-chart, radar-chart, sparkline, accessibility, typescript]
related: [refine, orbit]
exports:
  [
    createLineChart,
    createBarChart,
    createAreaChart,
    createPieChart,
    createRadarChart,
    createSparkline,
    setTheme,
    PrismError,
  ]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="prism" />

## Why Prism?

Charting libraries typically require a framework binding, bundle heavy dependencies, or force canvas rendering that can't be styled with CSS. Prism takes a different approach:

```ts
// Before: Chart.js, imperative setup with a canvas you can't CSS-theme
import Chart from 'chart.js/auto';
const ctx = document.getElementById('myChart') as HTMLCanvasElement;
new Chart(ctx, {
  type: 'line',
  data: { labels, datasets: [{ data: values }] },
  // re-create or mutate the Chart.js instance when data changes
});

// After: Prism, responsive SVG with an explicit update boundary
import { createLineChart } from '@vielzeug/prism';

const chart = createLineChart(document.getElementById('chart')!, {
  a11y: { ariaLabel: 'Users by day' },
  series: [
    {
      data: [
        { key: 1, value: 12 },
        { key: 2, value: 40 },
        { key: 3, value: 28 },
      ],
      name: 'Users',
    },
  ],
  tooltip: true,
});

chart.update([
  {
    data: [
      { key: 1, value: 12 },
      { key: 2, value: 40 },
      { key: 3, value: 28 },
      { key: 4, value: 65 },
    ],
    name: 'Users',
  },
]);
```

| Feature            | Prism                                        | Chart.js                                 | Lightweight Charts                           | D3                                           |
| ------------------ | -------------------------------------------- | ---------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Bundle size        | <PackageInfo package="prism" type="size" />  | ~60 kB                                   | ~45 kB                                       | ~30 kB (core)                                |
| Zero dependencies  | <ore-icon name="x" size="16"></ore-icon> (Orbit) | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="triangle-alert" size="16"></ore-icon> (modular) |
| Renderer           | SVG                                          | Canvas                                   | Canvas                                       | SVG/Canvas                                   |
| Data updates        | Explicit `update()`                            | Instance mutation                        | Series mutation                              | Manual                                       |
| CSS themeable       | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | Limited                                      | <ore-icon name="check" size="16"></ore-icon> |
| Framework-neutral   | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Accessible SVG     | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     | Manual                                       |
| Keyboard navigation | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     | Manual                                       |
| TypeScript-first   | <ore-icon name="check" size="16"></ore-icon> | Partial                                  | <ore-icon name="check" size="16"></ore-icon> | Types available                              |

<div class="decision-callout">

**Use Prism when** you need lightweight, framework-neutral charts with explicit updates and SVG output that can be styled with CSS. It fits dashboards, admin panels, and data-heavy applications.

**Consider alternatives when** you need 50+ chart types (ECharts), financial trading charts (Lightweight Charts), or low-level visualization grammar (D3).

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/prism
```

```sh [npm]
npm install @vielzeug/prism
```

```sh [yarn]
yarn add @vielzeug/prism
```

:::

## Quick Start

```ts
import { createLineChart } from '@vielzeug/prism';
import '@vielzeug/prism/theme.css';

const chart = createLineChart(document.getElementById('chart')!, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [
    {
      color: '#3b82f6',
      data: [
        { key: 1, value: 10 },
        { key: 2, value: 25 },
        { key: 3, value: 18 },
        { key: 4, value: 32 },
      ],
      name: 'Revenue',
    },
  ],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  crosshair: true,
  onHover: (event) => console.log(event?.datum),
});

// Update chart data explicitly
chart.update([
  {
    color: '#3b82f6',
    data: [{ key: 1, value: 10 }, { key: 2, value: 25 }, { key: 3, value: 18 }, { key: 4, value: 32 }, { key: 5, value: 28 }],
    name: 'Revenue',
  },
]);

// Cleanup when done
chart.dispose();
```

## Features

<div class="features-grid">

- **`createLineChart(container, config)`**: line chart with linear, monotone, or step interpolation
- **`createBarChart(container, config)`**: bar chart with four layout variants: grouped, stacked, grouped-horizontal, stacked-horizontal
- **`createAreaChart(container, config)`**: filled area with a gradient or solid fill
- **`createPieChart(container, config)`**: pie, donut, or semi-circle donut chart; labels that do not fit their slice are hidden
- **`createRadarChart(container, config)`**: radar chart for comparing values across 3+ axes, with per-axis ranges
- **`createSparkline(container, config)`**: minimal inline line, area, bar, or stack chart
- **`linearScale`, `timeScale`, `bandScale`**: standalone scales with nice tick generation
- **`ChartHandle.update(data)`**: replace chart data synchronously without coupling to a state library
- **`setTheme(theme, { scope })` / `resetTheme({ scope })`**: apply or clear colors, font, grid, axis, text, and tooltip tokens globally or on one subtree at runtime
- **Axes on by default**: line, area, and bar charts render both axes with gridlines on the value axis; `xAxis: false` / `yAxis: false` opt out
- **Animations on by default**: every chart animates entry and updates through one rAF loop, honors reduced motion, and opts out with `transition: false`
- **Series comparison**: hover or keyboard focus reports every series at the active key in the tooltip, `onHover`, and screen-reader announcements
- **Keyboard navigation**: arrow keys, `Enter`, and `Escape` on every labelled chart except sparklines
- **CSS custom properties**: full theme control via `--prism-*` tokens, with dark mode built in
- **Responsive**: auto-resizes via `ResizeObserver`
- **`ChartHandle.tap()`**: observe resize and dispose events outside the render path, with zero cost when untapped
- **`Symbol.dispose`**: explicit resource management following the TC39 proposal

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Refine](/refine/): accessible web components that pair well with Prism for dashboards
- [Orbit](/orbit/): floating element positioning for chart tooltips and popovers

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
