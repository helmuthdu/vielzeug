---
title: Prism — Reactive SVG data visualization
description: Reactive SVG charting library — line, bar, and area charts. Signal-driven updates, CSS-themeable, accessible.
package: prism
category: ui
keywords: [chart, svg, visualization, reactive, line-chart, bar-chart, area-chart, signals, typescript]
related: [ripple, refine, orbit]
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
    animate,
    PrismError,
    AnimationTarget,
    EasingFn,
    LegendState,
    TooltipState,
    ChartPluginContext,
    Point,
    ScaffoldContext,
    ScaffoldGroups,
    ChartEventHandlers,
    StackSegment,
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
  // re-render manually when data changes, no signals, canvas not CSS-styleable
});

// After — Prism, declarative SVG chart driven by a signal
import { createLineChart } from '@vielzeug/prism';
import { signal } from '@vielzeug/ripple';

const data = signal([
  { key: 1, value: 12 },
  { key: 2, value: 40 },
  { key: 3, value: 28 },
]);
const chart = createLineChart(document.getElementById('chart')!, {
  series: [{ name: 'Users', data }],
  tooltip: true,
});
// chart auto-updates when data.value changes — no manual re-render
data.value = [...data.value, { key: 4, value: 65 }];
```

| Feature            | Prism                                      | Chart.js                               | Lightweight Charts                         | D3                                         |
| ------------------ | ------------------------------------------ | -------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Bundle size        | ~8 kB                                      | ~60 kB                                 | ~45 kB                                     | ~30 kB (core)                              |
| Renderer           | SVG                                        | Canvas                                 | Canvas                                     | SVG/Canvas                                 |
| Zero external deps | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| CSS themeable      | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | Limited                                    | <ore-icon name="check" size="16"></ore-icon> |
| Reactive (signals) | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     | <ore-icon name="x" size="16"></ore-icon>     |
| Accessible SVG     | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     | Manual                                     |
| TypeScript-first   | <ore-icon name="check" size="16"></ore-icon> | Partial                                | <ore-icon name="check" size="16"></ore-icon> | Types available                            |

<div class="decision-callout">

**Use Prism when** you need lightweight, reactive charts that integrate with signal-based state and can be styled purely with CSS. Ideal for dashboards, admin panels, and data-heavy applications using Vielzeug.

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
import { signal } from '@vielzeug/ripple';
import '@vielzeug/prism/theme';

const data = signal([
  { key: 1, value: 10 },
  { key: 2, value: 25 },
  { key: 3, value: 18 },
  { key: 4, value: 32 },
]);

const chart = createLineChart(document.getElementById('chart')!, {
  series: [{ name: 'Revenue', data, color: '#3b82f6' }],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  crosshair: true,
  onHover: (event) => console.log(event?.datum),
});

// Update data → chart re-renders automatically
data.value = [...data.value, { key: 5, value: 28 }];

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
- **`MaybeSignal<T>`** — pass plain values or `@vielzeug/ripple` signals; both work seamlessly
- **`seriesColor(index, override?)`** — resolve CSS palette color by series index
- **`setTheme(theme)` / `resetTheme()`** — apply or clear custom colors, font, and grid tokens at runtime
- **Event hooks** — `onClick` and `onHover` callbacks on every chart
- **Plugin system** — extend charts with `ChartPlugin` (`install()`/`dispose()` lifecycle, each isolated from the other's failures); supported by all chart types including `createPieChart`
- **Devtools** — `debugChart()` from `@vielzeug/prism/devtools` logs mount/resize/dispose to `console.debug`; tree-shaken from production unless imported
- **CSS custom properties** — full theme control via `--prism-*` tokens
- **Responsive** — auto-resizes via `ResizeObserver`
- **Accessible** — ARIA labels and semantic SVG structure
- **`Symbol.dispose`** — explicit resource management following TC39 proposal

</div>

## Sub-paths

| Import                     | Purpose                                                             |
| -------------------------- | -------------------------------------------------------------------- |
| `@vielzeug/prism`          | All chart factories, scales, and types                               |
| `@vielzeug/prism/theme`    | Default CSS (custom properties + dark mode)                          |
| `@vielzeug/prism/devtools` | `debugChart()` — opt-in `console.debug` lifecycle logging, tree-shaken in production |

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Ripple](/ripple/) — reactive signals that power Prism's auto-updating charts
- [Refine](/refine/) — accessible web components that pair well with Prism for dashboards
- [Orbit](/orbit/) — floating element positioning for chart tooltips and popovers

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
