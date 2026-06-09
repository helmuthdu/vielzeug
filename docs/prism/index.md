---
title: Prism — Reactive SVG data visualization
description: Reactive SVG charting library — line, bar, and area charts. Signal-driven updates, CSS-themeable, accessible.
package: prism
category: ui
keywords:
  [chart, svg, visualization, reactive, line-chart, bar-chart, area-chart, signals, typescript]
related: [ripple, sigil, orbit]
exports:
  [
    createLineChart,
    createBarChart,
    createAreaChart,
    linearScale,
    timeScale,
    bandScale,
    getSeriesColor,
    PRISM_COLORS,
  ]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="prism" />

<img src="/logo-prism.svg" alt="Prism logo" width="156" class="logo-highlight"/>

# Prism

<details>
<summary><sg-icon name="zap" size="16"></sg-icon> Quick Reference</summary>

**Package:** `@vielzeug/prism` &nbsp;·&nbsp; **Category:** UI / Visualization

**Key exports:** `createLineChart`, `createBarChart`, `createAreaChart`, `linearScale`, `timeScale`, `bandScale`

**When to use:** Data visualization with reactive charts that auto-update when signal-based data sources change. Renders accessible SVG, themeable via CSS custom properties.

**Related:** [Ripple](/ripple/) · [Sigil](/sigil/) · [Orbit](/orbit/)

</details>

**Prism** is a reactive SVG charting library that provides:

- **Cartesian charts** — line, bar, and area with configurable axes, grid, tooltips, and crosshair
- **Signal-driven updates** — charts auto-render when `@vielzeug/ripple` signal data changes
- **CSS theming** — all colors, fonts, and spacing via custom properties with dark mode support

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
  { x: 1, y: 10 },
  { x: 2, y: 25 },
  { x: 3, y: 18 },
  { x: 4, y: 32 },
]);

const chart = createLineChart(document.getElementById('chart')!, {
  series: [{ name: 'Revenue', data, color: '#3b82f6' }],
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  crosshair: true,
});

// Update data → chart re-renders automatically
data.value = [...data.value, { x: 5, y: 28 }];

// Cleanup when done
chart.dispose();
```

## Why Prism?

Charting libraries typically require a framework binding, bundle heavy dependencies, or force canvas rendering that can't be styled with CSS. Prism takes a different approach:

| Feature | Prism | Chart.js | Lightweight Charts | D3 |
|---|---|---|---|---|
| Bundle size | ~8 kB | ~60 kB | ~45 kB | ~30 kB (core) |
| Renderer | SVG | Canvas | Canvas | SVG/Canvas |
| Zero external deps | <sg-icon name="circle-check" size="16"></sg-icon> | <sg-icon name="circle-x" size="16"></sg-icon> | <sg-icon name="circle-check" size="16"></sg-icon> | <sg-icon name="circle-check" size="16"></sg-icon> |
| CSS themeable | <sg-icon name="circle-check" size="16"></sg-icon> | <sg-icon name="circle-x" size="16"></sg-icon> | Limited | <sg-icon name="circle-check" size="16"></sg-icon> |
| Reactive (signals) | <sg-icon name="circle-check" size="16"></sg-icon> | <sg-icon name="circle-x" size="16"></sg-icon> | <sg-icon name="circle-x" size="16"></sg-icon> | <sg-icon name="circle-x" size="16"></sg-icon> |
| Accessible SVG | <sg-icon name="circle-check" size="16"></sg-icon> | <sg-icon name="circle-x" size="16"></sg-icon> | <sg-icon name="circle-x" size="16"></sg-icon> | Manual |
| TypeScript-first | <sg-icon name="circle-check" size="16"></sg-icon> | Partial | <sg-icon name="circle-check" size="16"></sg-icon> | Types available |

**Use Prism when** you need lightweight, reactive charts that integrate with signal-based state and can be styled purely with CSS. Ideal for dashboards, admin panels, and data-heavy applications using Vielzeug.

**Consider alternatives when** you need 50+ chart types (ECharts), financial trading charts (Lightweight Charts), or low-level visualization grammar (D3).

## Features

- **`createLineChart(container, config)`** — line chart with linear, monotone, or step interpolation
- **`createBarChart(container, config)`** — grouped/stacked vertical bar chart
- **`createAreaChart(container, config)`** — filled area with configurable opacity and stacking
- **`linearScale(config)`** — continuous numeric scale with nice tick generation
- **`timeScale(config)`** — date/time scale with interval-based ticks
- **`bandScale(config)`** — categorical scale for bar charts
- **`MaybeSignal<T>`** — pass plain values or reactive signals; both work seamlessly
- **CSS custom properties** — full theme control via `--prism-*` tokens
- **Responsive** — auto-resizes via `ResizeObserver`
- **Accessible** — ARIA labels, semantic SVG structure, keyboard support
- **`Symbol.dispose`** — explicit resource management following TC39 proposal

## Sub-paths

| Import | Purpose |
|---|---|
| `@vielzeug/prism` | All chart factories, scales, and types |
| `@vielzeug/prism/theme` | Default CSS (custom properties + dark mode) |

## Compatibility

| Environment | Support |
|---|---|
| Browser | <sg-icon name="circle-check" size="16"></sg-icon> |
| Node.js (jsdom) | <sg-icon name="circle-check" size="16"></sg-icon> |
| SSR | <sg-icon name="circle-x" size="16"></sg-icon> (requires DOM) |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Ripple](/ripple/) — reactive signals that power Prism's auto-updating charts
- [Sigil](/sigil/) — accessible web components that pair well with Prism for dashboards
- [Orbit](/orbit/) — floating element positioning for chart tooltips and popovers

<!-- markdownlint-enable MD025 MD033 MD060 -->
