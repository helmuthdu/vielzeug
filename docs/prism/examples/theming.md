---
title: 'Prism Examples: Match Charts to Your Design System'
description: Scope Prism theme tokens to one container and map them to Refine design tokens.
---

## Match Charts to Your Design System

### Problem

Charts must use the application's brand colours, fonts, and surfaces in one section of a page without changing every other chart. A global `setTheme()` call is too broad, and a component-driven app keeps its palette in a JS object rather than a stylesheet.

### Solution

Override `--prism-*` custom properties on a container class. They inherit into the SVG and the tooltip, so toggling the class restyles mounted charts without recreating them.

<ComponentPreview vertical align="stretch" height="420px">

```html
<style>
  .theme-demo { display: grid; gap: var(--size-4); width: 100%; min-width: 0; }
  .theme-demo__chart { width: 100%; height: var(--size-72); }
  .theme-demo--brand {
    --prism-color-1: var(--color-primary);
    --prism-color-2: var(--color-success);
    --prism-font-family: var(--font-sans);
    --prism-grid-color: var(--color-contrast-300);
    --prism-grid-dash: none;
    --prism-line-width: 3px;
    --prism-text-color: var(--text-color-body);
    --prism-text-color-secondary: var(--text-color-secondary);
    --prism-tooltip-bg: var(--color-canvas);
    --prism-tooltip-radius: var(--rounded-lg);
  }
</style>
<div id="theme-demo" class="theme-demo theme-demo--brand">
  <ore-switch id="brand-theme" checked>Use brand theme</ore-switch>
  <div id="theme-chart" class="theme-demo__chart"></div>
</div>
<script>
  const months = [1, 2, 3, 4, 5, 6];
  const toSeries = (name, values) => ({
    curve: 'monotone',
    data: months.map((key, i) => ({ key, value: values[i] })),
    name,
    showPoints: true,
  });

  const chart = Prism.createLineChart(document.getElementById('theme-chart'), {
    a11y: { ariaLabel: 'Active users and paying users by month' },
    legend: { position: 'top' },
    series: [toSeries('Active', [320, 410, 380, 520, 610, 680]), toSeries('Paying', [80, 96, 110, 142, 170, 205])],
    tooltip: true,
    xAxis: { label: 'Month' },
    yAxis: { grid: true },
  });

  document.getElementById('brand-theme').addEventListener('change', (event) => {
    document.getElementById('theme-demo').classList.toggle('theme-demo--brand', event.currentTarget.checked);
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

#### With a JS palette (MUI, Chakra, Backstage)

When the palette lives in a JS object, write the tokens onto the chart container with `setTheme({ … }, { scope })` instead of a CSS class:

```tsx
import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { createLineChart, resetTheme, setTheme, type LineSeriesConfig } from '@vielzeug/prism';
import '@vielzeug/prism/theme.css';

function PaletteChart({ series }: { series: LineSeriesConfig[] }) {
  const theme = useTheme();
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scope.current) return;

    setTheme(
      { axisColor: theme.palette.divider, textColor: theme.palette.text.primary },
      { scope: scope.current },
    );

    const chart = createLineChart(scope.current, { series, tooltip: true });

    return () => {
      chart.dispose();
      resetTheme({ scope: scope.current! });
    };
  }, [series, theme]);

  return <div ref={scope} style={{ height: 300 }} />;
}
```

For a dark/light toggle without a stylesheet, set `data-prism-theme="dark"` on the container (or any ancestor): the shipped theme ships the same dark token block for `[data-prism-theme='dark']` as for `html.dark`.

### Pitfalls

- Keep enough contrast between adjacent series colours; Prism's default palette is colour-blind safe, a brand palette may not be.
- Explicit `color`, `strokeWidth`, or `fillOpacity` in the config win over tokens. Leave them unset when the theme should decide.
- Scoped values apply in light and dark mode alike. Map them to Refine tokens, which adapt through `light-dark()`, or re-apply on palette change.
- `setTheme()` without `scope` writes to `:root`; a scoped class or scoped `setTheme()` call still wins inside its container.

### Related

- [Scoped themes](../usage.md#scoped-themes)
- [Available tokens](../usage.md#available-tokens)
- [`setTheme()`](../api.md#settheme)
- [Refine theming](/refine/theming)
