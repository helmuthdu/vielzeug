---
title: 'Prism Examples: Compare Categories with a Bar Chart'
description: Switch a multi-series bar chart between grouped, stacked, and horizontal layouts and act on a selected category.
---

## Compare Categories with a Bar Chart

### Problem

A report compares several series per category, needs to switch between grouped and stacked layouts, and must act on the category a user picks with a pointer or the keyboard.

### Solution

Recreate the chart with a new `variant` when the layout changes, and read every series value for the picked category from `event.values` in `onClick`.

<ComponentPreview vertical align="stretch" height="460px">

```html
<style>
  .bar-demo { display: grid; gap: var(--size-4); width: 100%; min-width: 0; }
  .bar-demo__chart { width: 100%; height: var(--size-72); }
  .bar-demo__detail { margin: 0; color: var(--text-color-secondary); font-size: var(--text-sm); }
</style>
<div class="bar-demo">
  <ore-radio-group id="bar-variant" label="Layout" name="bar-variant" orientation="horizontal" value="grouped">
    <ore-radio value="grouped">Grouped</ore-radio>
    <ore-radio value="stacked">Stacked</ore-radio>
    <ore-radio value="grouped-horizontal">Horizontal</ore-radio>
  </ore-radio-group>
  <div id="bar-chart" class="bar-demo__chart"></div>
  <p id="bar-detail" class="bar-demo__detail" aria-live="polite">Select a quarter to see its totals.</p>
</div>
<script>
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const toSeries = (name, values) => ({ data: quarters.map((key, i) => ({ key, value: values[i] })), name });
  const series = [
    toSeries('Hardware', [42, 51, 47, 63]),
    toSeries('Software', [28, 34, 41, 45]),
    toSeries('Services', [15, 19, 22, 27]),
  ];
  const container = document.getElementById('bar-chart');
  const detail = document.getElementById('bar-detail');
  let chart;

  const showDetail = ({ datum, values }) => {
    const total = values.reduce((sum, { datum: point }) => sum + (point?.value ?? 0), 0);
    const parts = values.map(({ datum: point, series: s }) => `${s.name} ${point?.value ?? 0}`).join(', ');
    detail.textContent = `${datum.key}: ${total} total (${parts})`;
  };

  const mount = (variant) => {
    chart?.dispose();
    chart = Prism.createBarChart(container, {
      a11y: { ariaLabel: 'Revenue by quarter and product line' },
      legend: { position: 'top' },
      onClick: showDetail,
      series,
      tooltip: true,
      variant,
      xAxis: { grid: variant.endsWith('horizontal') },
      yAxis: { grid: !variant.endsWith('horizontal') },
    });
  };

  mount('grouped');
  document.getElementById('bar-variant').addEventListener('change', (event) => mount(event.detail.values[0]));
  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- `variant` is fixed at creation; `update()` only replaces the series. Dispose and recreate the chart to change layout.
- `onClick` also fires for `Enter` and `Space` on the focused category, so `originalEvent` may be a `KeyboardEvent`.
- In horizontal variants the value axis is `xAxis`; move `grid` to the axis that carries values.
- Stacked variants render square segments; corner radii apply only to grouped bars.

### Related

- [Bar chart variants](../usage.md#variants)
- [Bar chart API](../api.md#createbarchart)
- [Event hooks](../usage.md#event-hooks)
- [Refine radio group](/refine/components/radio)
