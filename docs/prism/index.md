---
title: Prism — Responsive SVG data visualization
description: Responsive SVG charts with explicit updates, accessible interactions, and CSS theming.
package: prism
category: ui
keywords: [chart, svg, visualization, responsive, line-chart, bar-chart, area-chart, typescript]
related: [refine, orbit]
exports:
  [
    createLineChart,
    createBarChart,
    createAreaChart,
    createPieChart,
    createSparkline,
    linearScale,
    timeScale,
    bandScale,
    seriesColor,
    setTheme,
    resetTheme,
    PrismError,
    ChartA11y,
    ContinuousDatum,
    EasingFn,
    StackSegment,
    XAxisConfig,
    YAxisConfig,
  ]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="prism" />

## Why Prism?

Charting libraries typically require a framework binding, bundle heavy dependencies, or force canvas rendering that can't be styled with CSS. Prism takes a different approach:

```ts
// Before — Chart.js, imperative setup with a canvas you can't CSS-theme
import Chart from 'chart.js/auto';
const ctx = document.getElementById('myChart') as HTMLCanvasElement;
new Chart(ctx, {
  type: 'line',
  data: { labels, datasets: [{ data: values }] },
  // re-create or mutate the Chart.js instance when data changes
});

// After — Prism, responsive SVG with an explicit update boundary
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
import '@vielzeug/prism/theme';

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

- **`createLineChart(container, config)`** — line chart with linear, monotone, or step interpolation
- **`createBarChart(container, config)`** — bar chart with four layout variants: grouped, stacked, grouped-horizontal, stacked-horizontal
- **`createAreaChart(container, config)`** — filled area with configurable opacity
- **`createSparkline(container, config)`** — minimal inline sparkline (line, area, or bar variant)
- **`createPieChart(container, config)`** — pie, donut, or semi-circle donut chart
- **`linearScale(config)`** — continuous numeric scale with nice tick generation
- **`timeScale(config)`** — date/time scale with interval-based ticks
- **`bandScale(config)`** — categorical scale for bar charts
- **`ChartHandle.update(data)`** — replace chart data synchronously without coupling to a state library
- **`seriesColor(index, override?)`** — resolve CSS palette color by series index
- **`setTheme(theme)` / `resetTheme()`** — apply or clear custom colors, font, and grid tokens at runtime
- **Event hooks** — `onClick` and `onHover` callbacks on every chart
- **Devtools** — `debugChart()` from `@vielzeug/prism/devtools` logs mount/resize/dispose to `console.debug`; tree-shaken from production unless imported
- **CSS custom properties** — full theme control via `--prism-*` tokens
- **Responsive** — auto-resizes via `ResizeObserver`
- **Accessible** — ARIA labels and semantic SVG structure
- **`Symbol.dispose`** — explicit resource management following TC39 proposal

</div>

## Sub-paths

| Import                     | Purpose                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `@vielzeug/prism`          | All chart factories, scales, and types                                               |
| `@vielzeug/prism/theme`    | Default CSS (custom properties + dark mode)                                          |
| `@vielzeug/prism/devtools` | `debugChart()` — opt-in `console.debug` lifecycle logging, tree-shaken in production |

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Refine](/refine/) — accessible web components that pair well with Prism for dashboards
- [Orbit](/orbit/) — floating element positioning for chart tooltips and popovers

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
