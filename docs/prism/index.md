---
title: 'Prism: Responsive SVG data visualization'
description: 'Responsive SVG charts with explicit updates: line, bar, area, scatter, pie, radar, sparkline'
package: prism
category: ui
keywords: [chart, svg, visualization, responsive, line-chart, bar-chart, area-chart, scatter-chart, pie-chart, radar-chart, sparkline, accessibility, typescript]
related: [refine, orbit]
exports: [createLineChart, createBarChart, createPieChart, ChartHandle]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="prism" />

## Why Prism?

Prism renders charts as SVG in a host element and keeps application state outside the chart. You can replace chart data explicitly, respond to container resizing, and style the output with CSS custom properties.

```ts
import { createLineChart } from '@vielzeug/prism';

const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px';
document.body.append(host);

// Before: replace a hand-drawn SVG each time values change.
function drawLine(values: number[]) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const low = Math.min(...values);
  const span = Math.max(...values) - low || 1;
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 640;
    const y = 320 - ((value - low) / span) * 320;
    return `${index === 0 ? 'M' : 'L'}${x},${y}`;
  });
  svg.setAttribute('viewBox', '0 0 640 320');
  path.setAttribute('d', points.join(' '));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  svg.append(path);
  host.replaceChildren(svg);
}
drawLine([10, 25, 18]);
drawLine([10, 25, 18, 32]);

// After: keep the chart instance and replace its series data.
const chart = createLineChart(host, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [{ data: [{ key: 1, value: 10 }, { key: 2, value: 25 }, { key: 3, value: 18 }], name: 'Revenue' }],
});
chart.update([{
  data: [{ key: 1, value: 10 }, { key: 2, value: 25 }, { key: 3, value: 18 }, { key: 4, value: 32 }],
  name: 'Revenue',
}]);
chart.dispose();
```

| Feature | Prism | Hand-written SVG |
| --- | --- | --- |
| Bundle size | <PackageInfo package="prism" type="size" /> | No chart package |
| Zero dependencies | <ore-icon name="x" size="16"></ore-icon> (uses Orbit) | <ore-icon name="check" size="16"></ore-icon> |
| Data updates | `ChartHandle.update()` replaces chart data | You implement the update path |
| Responsive sizing | `ResizeObserver` recalculates the chart layout | You implement the resize behavior |
| Chart interactions | Built-in pointer and keyboard interactions on supported charts | You implement them |
| SVG accessibility | Informative charts support an accessible name and keyboard focus | You implement the accessible behavior |

<div class="decision-callout">

**Use Prism when** you need chart factories, responsive SVG output, and an explicit data-update boundary without adopting a charting framework.

**Consider hand-written SVG when** you need a single specialized graphic and prefer to own its scales, resizing, labels, and interactions directly.

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

Create and size a host element before creating the chart. Import `theme.css` once to load Prism's default styles and CSS custom properties.

```ts
import { createLineChart } from '@vielzeug/prism';
import '@vielzeug/prism/theme.css';

const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px';
document.body.append(host);

const chart = createLineChart(host, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [{
    data: [{ key: 1, value: 10 }, { key: 2, value: 25 }, { key: 3, value: 18 }],
    name: 'Revenue',
  }],
  tooltip: true,
});

chart.update([{
  data: [{ key: 1, value: 10 }, { key: 2, value: 25 }, { key: 3, value: 18 }, { key: 4, value: 32 }],
  name: 'Revenue',
}]);

chart.dispose();
```

## Features

<div class="features-grid">

- **`createLineChart()` / `createAreaChart()`**: plot continuous numeric or date-keyed series
- **`createBarChart()`**: compare categories with grouped, stacked, or horizontal bars
- **`createScatterChart()`**: plot independent numeric `(x, y)` points
- **`createPieChart()`**: render pie, donut, or semi-circle slices
- **`createRadarChart()`**: compare series across fixed, labelled axes
- **`createSparkline()`**: render compact line, area, bar, or stacked values without axes
- **`ChartHandle.update(data)`**: replace chart data without handing state ownership to Prism
- **`ChartHandle.dispose()` / `Symbol.dispose`**: release the SVG, observer, overlays, and chart-owned animation
- **`ChartHandle.tap()`**: observe resize and disposal events
- **`setTheme()` / `resetTheme()`**: set supported palette, typography, axis, grid, and tooltip tokens globally or on one element
- **CSS custom properties**: style the chart palette, marks, axes, labels, tooltip, legend, and motion
- **Resize observation**: recalculate SVG layout when the host element changes size
- **Accessible interaction**: labelled interactive charts expose keyboard navigation and polite value announcements; sparklines are pointer-only without value announcements

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

- [Refine](/refine/): web components and theme tokens for building controls and layouts around chart hosts
- [Orbit](/orbit/): floating-element positioning used internally by Prism's built-in tooltip

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
