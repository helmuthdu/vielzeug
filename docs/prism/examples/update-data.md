---
title: 'Prism Examples — Update Chart Data'
description: Connect application state to a Prism chart through its explicit update boundary.
---

## Update Chart Data

### Problem

Application data changes after a chart is mounted, and the chart must stay synchronized without owning framework state.

### Solution

Keep state in the application and pass the next complete data value to `update()`.

<ComponentPreview vertical align="stretch" height="420px">

```html
<style>
  .chart-demo { width: 100%; min-width: 0; }
  .chart-demo__toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
  .chart-demo__button { border: 1px solid #94a3b8; border-radius: 0.75rem; padding: 0.55rem 0.9rem; background: Canvas; color: CanvasText; font: inherit; cursor: pointer; }
  .chart-demo__button:hover { background: color-mix(in srgb, CanvasText 8%, Canvas); }
  .chart-demo__button:focus-visible { outline: 3px solid #6366f1; outline-offset: 2px; }
  .chart-demo__status { color: color-mix(in srgb, CanvasText 65%, Canvas); font-size: 0.875rem; }
</style>
<div class="chart-demo">
  <div class="chart-demo__toolbar">
    <button id="refresh-chart" class="chart-demo__button" type="button">Update tasks</button>
    <span id="chart-status" class="chart-demo__status" aria-live="polite">12 open</span>
  </div>
  <div id="bar-chart" style="width:100%;height:280px;"></div>
</div>
<script>
  let alternate = false;
  const chart = Prism.createBarChart(document.getElementById('bar-chart'), {
    a11y: { ariaLabel: 'Tasks by status' },
    series: [{ data: [{ key: 'Open', value: 12 }], name: 'Tasks' }],
    xAxis: { grid: false },
    yAxis: { grid: true },
  });

  document.getElementById('refresh-chart').addEventListener('click', () => {
    alternate = !alternate;
    const data = alternate
      ? [{ key: 'Open', value: 8 }, { key: 'Done', value: 4 }]
      : [{ key: 'Open', value: 12 }];
    chart.update([{ data, name: 'Tasks' }]);
    document.getElementById('chart-status').textContent = alternate ? '8 open, 4 done' : '12 open';
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- Pass the complete series array, including names and visual options.
- Do not call `update()` after `dispose()`.
- Dispose subscriptions and the chart from the same application lifecycle.

### Related

- [Create a line chart](./line-chart.md)
- [ChartHandle API](../api.md#core-types)
- [Framework integration](../usage.md#framework-integration)
