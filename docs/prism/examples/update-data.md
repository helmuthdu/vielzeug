---
title: 'Prism Examples: Update Chart Data'
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
  .chart-demo { display: grid; gap: var(--size-4); width: 100%; min-width: 0; }
  .chart-demo__toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--size-4); }
  .chart-demo__status { color: var(--text-color-secondary); font-size: var(--text-sm); }
  .chart-demo__chart { width: 100%; height: var(--size-72); }
</style>
<div class="chart-demo">
  <div class="chart-demo__toolbar">
    <ore-button id="next-sprint" variant="bordered">Next sprint</ore-button>
    <span id="chart-status" class="chart-demo__status" aria-live="polite">Sprint 1</span>
  </div>
  <div id="bar-chart" class="chart-demo__chart"></div>
</div>
<script>
  const statuses = ['To do', 'In progress', 'Review', 'Done'];
  const sprints = [
    [14, 6, 3, 2],
    [9, 7, 4, 5],
    [4, 5, 6, 10],
    [1, 2, 3, 19],
  ];
  const toSeries = (counts) => [{ data: statuses.map((key, i) => ({ key, value: counts[i] })), name: 'Tasks' }];
  let sprint = 0;

  const chart = Prism.createBarChart(document.getElementById('bar-chart'), {
    a11y: { ariaLabel: 'Tasks by status for the current sprint' },
    series: toSeries(sprints[sprint]),
    tooltip: true,
    xAxis: {},
    yAxis: { grid: true },
  });

  document.getElementById('next-sprint').addEventListener('click', () => {
    sprint = (sprint + 1) % sprints.length;
    chart.update(toSeries(sprints[sprint]));
    document.getElementById('chart-status').textContent = `Sprint ${sprint + 1}`;
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
- [ChartHandle API](../api.md#chart-handle)
- [Framework integration](../usage.md#framework-integration)
