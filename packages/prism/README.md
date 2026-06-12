---
description: Reactive SVG charting library — line, bar, and area charts. Zero external dependencies, signal-driven updates.
package: prism
category: ui
keywords: [chart, svg, visualization, reactive, line-chart, bar-chart, area-chart, signals, typescript]
related: [ripple, sigil, orbit]
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
    warn,
    issue,
  ]
---

# @vielzeug/prism

> Reactive SVG charting library — line, bar, area, pie, and sparkline charts. Zero external dependencies, signal-driven updates.

[![npm version](https://img.shields.io/npm/v/@vielzeug/prism)](https://www.npmjs.com/package/@vielzeug/prism) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/prism` &nbsp;·&nbsp; **Category:** UI / Visualization

**Key exports:** `createLineChart`, `createBarChart`, `createAreaChart`, `createPieChart`, `createSparkline`, `linearScale`, `timeScale`, `bandScale`, `seriesColor`, `setTheme`

**When to use:** Data visualization with reactive charts that auto-update when signal-based data sources change. Renders accessible SVG, themeable via CSS custom properties.

**Related:** [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/sigil](https://vielzeug.dev/sigil/) · [@vielzeug/orbit](https://vielzeug.dev/orbit/)

</details>

`@vielzeug/prism` is part of Vielzeug. It depends on `@vielzeug/ripple` for reactivity and ships as a TypeScript package with ESM+CJS output.

## Installation

```sh
# pnpm
pnpm add @vielzeug/prism
# npm
npm install @vielzeug/prism
# yarn
yarn add @vielzeug/prism
```

## Sub-paths

| Import                     | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `@vielzeug/prism`          | Chart factories, scales, and types                             |
| `@vielzeug/prism/theme`    | Default CSS custom properties (light + dark mode)              |
| `@vielzeug/prism/devtools` | `warn` / `issue` helpers (dev-only, tree-shaken in production) |

## Quick Start

```ts
import { createLineChart, setTheme } from '@vielzeug/prism';
import { signal } from '@vielzeug/ripple';
import '@vielzeug/prism/theme';

// Optional: apply a custom color palette at startup
setTheme({ colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981'] });

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
  onHover: (event) => console.log(event?.point),
});

// Data updates → chart re-renders automatically
data.value = [...data.value, { x: 5, y: 28 }];

// Cleanup (also works with TC39 `using` declarations)
chart.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/prism/)
- [Usage Guide](https://vielzeug.dev/prism/usage)
- [API Reference](https://vielzeug.dev/prism/api)
- [Examples](https://vielzeug.dev/prism/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
