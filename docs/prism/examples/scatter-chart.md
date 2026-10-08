---
title: 'Prism Examples: Plot a Scatter Chart'
description: Plot independent numeric x/y measurements and inspect the nearest point with pointer and keyboard interaction.
---

## Plot a Scatter Chart

### Problem

You need to compare independent measurements where each observation has its own x and y value, rather than a shared category or connected time series. You also need the selected point's values available to users exploring the chart.

### Solution

Create a labelled scatter chart with separate series, formatted axis labels, and a tooltip; use `onHover` to keep a details line in sync with the nearest point.

<ComponentPreview vertical align="stretch" height="440px">

```html
<style>
  .scatter-demo { display: grid; gap: var(--size-3); width: 100%; min-width: 0; }
  .scatter-demo__chart { width: 100%; height: var(--size-80); }
  .scatter-demo__detail { margin: 0; color: var(--text-color-secondary); font-size: var(--text-sm); }
</style>
<div class="scatter-demo">
  <div id="scatter-chart" class="scatter-demo__chart"></div>
  <p id="scatter-detail" class="scatter-demo__detail">Move over a point or focus the chart and use the arrow keys.</p>
</div>
<script>
  const detail = document.getElementById('scatter-detail');
  const chart = Prism.createScatterChart(document.getElementById('scatter-chart'), {
    a11y: { ariaLabel: 'Study participants by height and weight' },
    crosshair: { horizontal: true },
    onHover: (event) => {
      detail.textContent = event
        ? `${event.series.name}: ${event.datum.key} cm, ${event.datum.value} kg`
        : 'Move over a point or focus the chart and use the arrow keys.';
    },
    series: [
      {
        color: 'var(--prism-color-1)',
        data: [
          { key: 158, value: 52 },
          { key: 164, value: 58 },
          { key: 169, value: 63 },
          { key: 173, value: 67 },
        ],
        name: 'Group A',
        pointRadius: 5,
      },
      {
        color: 'var(--prism-color-2)',
        data: [
          { key: 162, value: 60 },
          { key: 168, value: 66 },
          { key: 177, value: 73 },
          { key: 184, value: 82 },
        ],
        name: 'Group B',
        pointRadius: 5,
      },
    ],
    tooltip: true,
    xAxis: { label: 'Height (cm)', tickFormat: (value) => `${value} cm` },
    yAxis: { grid: true, label: 'Weight (kg)', tickFormat: (value) => `${value} kg` },
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- Each datum is an independent `(x, y)` pair: `key` is x and `value` is y; Prism does not connect points.
- Use number or `Date` keys consistently across all scatter series.
- The y-scale fits the data instead of forcing zero into its domain, so similarly sized values in separate charts do not imply the same scale.
- Scatter callbacks report one nearest `datum` and `series`; they do not include cross-series `values`.

### Related

- [Scatter chart API](../api.md#createscatterchart)
- [Scatter charts](../usage.md#scatter-charts)
- [Sync a details panel with hover](./hover-details.md)
- [Plot a time series](./time-series.md)
