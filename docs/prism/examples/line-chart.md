---
title: 'Prism Examples: Create a Line Chart'
description: Render an accessible, responsive two-series line chart with labelled axes, a crosshair, and a tooltip.
---

## Create a Line Chart

### Problem

You need a responsive SVG line chart that compares two series month by month, with labelled axes and point details for pointer and keyboard users.

### Solution

Create the chart after its container has layout, enable `crosshair` and `tooltip` for the month comparison, and dispose it when the view unmounts.

<ComponentPreview vertical align="stretch" height="380px">

```html
<div id="line-chart" style="width:100%;min-width:0;height:300px;"></div>
<script>
  const toSeries = (name, values) => ({
    curve: 'monotone',
    data: values.map((value, i) => ({ key: i + 1, value })),
    name,
    showPoints: true,
  });

  const chart = Prism.createLineChart(document.getElementById('line-chart'), {
    a11y: { ariaLabel: 'Monthly revenue and costs, January to June' },
    crosshair: true,
    legend: { position: 'top' },
    series: [toSeries('Revenue', [120, 180, 150, 210, 240, 230]), toSeries('Costs', [90, 110, 120, 130, 150, 160])],
    tooltip: true,
    xAxis: { label: 'Month' },
    yAxis: { grid: true, label: 'Thousand USD' },
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- Give the container an explicit width and height before mounting.
- Use only number or `Date` keys for line and area charts; use a bar chart for string categories.
- `tickFormat` changes axis labels only; tooltips and announcements show the raw key.
- Set `a11y.ariaLabel` when the chart conveys information.

### Related

- [Plot a time series](./time-series.md)
- [Update chart data](./update-data.md)
- [API reference](../api.md#createlinechart)
- [Usage guide](../usage.md#line-charts)
