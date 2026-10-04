---
title: 'Prism Examples: Compare Hero Stats with a Radar Chart'
description: Render one hero's stats as a radar chart and overlay a second hero for comparison.
---

## Compare Hero Stats with a Radar Chart

### Problem

A character sheet needs a hero's stats at a glance, and a way to compare two heroes on the same axes.

### Solution

Use `createRadarChart` with a shared `domain`, a gradient fill and vertex values for the single hero, then `update()` with a second series to compare.

<ComponentPreview vertical align="stretch" height="420px">

```html
<style>
  .radar-demo { display: grid; gap: var(--size-4); width: 100%; min-width: 0; }
  .radar-demo__chart { width: 100%; height: var(--size-80); }
</style>
<div class="radar-demo">
  <ore-switch id="compare">Compare with Eve</ore-switch>
  <div id="radar-chart" class="radar-demo__chart"></div>
</div>
<script>
  const axes = [
    { key: 'str', label: 'Strength' },
    { key: 'agi', label: 'Agility' },
    { key: 'int', label: 'Intellect' },
    { key: 'wil', label: 'Willpower' },
    { key: 'end', label: 'Endurance' },
    { key: 'luck', label: 'Luck' },
  ];
  const hero = (name, values) => ({ name, data: axes.map((axis, i) => ({ key: axis.key, value: values[i] })) });
  const adam = hero('Adam', [8, 6, 4, 7, 9, 5]);
  const eve = hero('Eve', [5, 9, 7, 6, 4, 8]);

  const chart = Prism.createRadarChart(document.getElementById('radar-chart'), {
    a11y: { ariaLabel: 'Hero stats' },
    axes,
    domain: [0, 10],
    fill: 'gradient',
    legend: true,
    series: [adam],
    showValues: true,
    tooltip: true,
  });

  document.getElementById('compare').addEventListener('change', (event) => {
    chart.update(event.currentTarget.checked ? [adam, eve] : [adam]);
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- The axes are fixed at creation; `update()` replaces only the series. Recreate the chart to change axes.
- Use a shared `domain` so heroes are comparable; set `axis.min`/`axis.max` only for a stat on a different scale.
- Vertex values suit one or two series; with more, rely on the tooltip instead.

### Related

- [Radar chart API](../api.md#createradarchart)
- [Radar usage](../usage.md#radar-charts)
- [Update chart data](./update-data.md)
