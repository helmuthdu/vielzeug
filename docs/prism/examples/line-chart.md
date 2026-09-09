---
title: 'Prism Examples — Create a Line Chart'
description: Render an accessible, responsive line chart with axes and a tooltip.
---

## Create a Line Chart

### Problem

You need a responsive SVG line chart with labelled axes and point details.

### Solution

Create the chart after its container has layout, and dispose it when the view unmounts.

<ComponentPreview vertical align="stretch" height="360px">

```html
<div id="line-chart" style="width:100%;min-width:0;height:280px;"></div>
<script>
  const chart = Prism.createLineChart(document.getElementById('line-chart'), {
    a11y: { ariaLabel: 'Monthly revenue' },
    series: [
      {
        data: [
          { key: 1, value: 120 },
          { key: 2, value: 180 },
          { key: 3, value: 150 },
        ],
        name: 'Revenue',
        showPoints: true,
      },
    ],
    tooltip: true,
    xAxis: { label: 'Month' },
    yAxis: { grid: true, label: 'Revenue' },
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- Give the container an explicit width and height before mounting.
- Use only number or `Date` keys for line and area charts.
- Set `a11y.ariaLabel` when the chart conveys information.

### Related

- [Update chart data](./update-data.md)
- [API reference](../api.md#createlinechart)
- [Usage guide](../usage.md#line-charts)
