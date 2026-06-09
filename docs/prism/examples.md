---
title: Prism — Examples
description: Interactive code examples for @vielzeug/prism charts.
---

[[toc]]

## Line Chart

Basic line chart with tooltip and crosshair:

<ComponentPreview vertical height="320px">

```html
<div id="ex-line" style="width:100%;height:280px;"></div>
<script>
  const { createLineChart } = Prism;
  createLineChart(document.getElementById('ex-line'), {
    series: [{
      name: 'Revenue',
      data: [
        { x: 1, y: 120 }, { x: 2, y: 180 }, { x: 3, y: 150 },
        { x: 4, y: 220 }, { x: 5, y: 195 }, { x: 6, y: 280 },
      ],
      color: '#3b82f6',
      curve: 'monotone',
      strokeWidth: 2,
      showPoints: true,
    }],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: true,
    crosshair: true,
  });
</script>
```

</ComponentPreview>

## Multi-series Line Chart

Multiple lines with different curves:

<ComponentPreview vertical height="320px">

```html
<div id="ex-multi-line" style="width:100%;height:280px;"></div>
<script>
  const { createLineChart } = Prism;
  createLineChart(document.getElementById('ex-multi-line'), {
    series: [
      {
        name: 'Product A',
        data: [{ x: 1, y: 40 }, { x: 2, y: 65 }, { x: 3, y: 55 }, { x: 4, y: 80 }, { x: 5, y: 72 }],
        color: '#3b82f6',
        curve: 'monotone',
      },
      {
        name: 'Product B',
        data: [{ x: 1, y: 20 }, { x: 2, y: 35 }, { x: 3, y: 60 }, { x: 4, y: 45 }, { x: 5, y: 90 }],
        color: '#10b981',
        curve: 'monotone',
      },
    ],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    crosshair: true,
  });
</script>
```

</ComponentPreview>

## Legend — Line Chart

Add `legend: true` to label each series below the chart:

<ComponentPreview vertical height="360px">

```html
<div id="ex-legend-line" style="width:100%;height:280px;"></div>
<script>
  const { createLineChart } = Prism;
  createLineChart(document.getElementById('ex-legend-line'), {
    series: [
      {
        name: 'Revenue',
        data: [{ x: 1, y: 120 }, { x: 2, y: 180 }, { x: 3, y: 150 }, { x: 4, y: 220 }, { x: 5, y: 195 }],
        color: '#3b82f6',
        curve: 'monotone',
      },
      {
        name: 'Expenses',
        data: [{ x: 1, y: 80 }, { x: 2, y: 95 }, { x: 3, y: 110 }, { x: 4, y: 130 }, { x: 5, y: 125 }],
        color: '#ef4444',
        curve: 'monotone',
      },
    ],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: true,
    crosshair: true,
    legend: true,
  });
</script>
```

</ComponentPreview>

## Bar Chart

Grouped bar chart comparing categories:

<ComponentPreview vertical height="320px">

```html
<div id="ex-bar" style="width:100%;height:280px;"></div>
<script>
  const { createBarChart } = Prism;
  createBarChart(document.getElementById('ex-bar'), {
    series: [
      {
        name: '2023',
        data: [{ x: 'Q1', y: 120 }, { x: 'Q2', y: 180 }, { x: 'Q3', y: 150 }, { x: 'Q4', y: 210 }],
        color: '#94a3b8',
        borderRadius: 4,
      },
      {
        name: '2024',
        data: [{ x: 'Q1', y: 150 }, { x: 'Q2', y: 220 }, { x: 'Q3', y: 190 }, { x: 'Q4', y: 280 }],
        color: '#3b82f6',
        borderRadius: 4,
      },
    ],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: true,
  });
</script>
```

</ComponentPreview>

## Legend — Bar Chart

Grouped bar chart with a legend positioned at the top:

<ComponentPreview vertical height="360px">

```html
<div id="ex-legend-bar" style="width:100%;height:280px;"></div>
<script>
  const { createBarChart } = Prism;
  createBarChart(document.getElementById('ex-legend-bar'), {
    series: [
      {
        name: '2023',
        data: [{ x: 'Q1', y: 120 }, { x: 'Q2', y: 180 }, { x: 'Q3', y: 150 }, { x: 'Q4', y: 210 }],
        color: '#94a3b8',
        borderRadius: 4,
      },
      {
        name: '2024',
        data: [{ x: 'Q1', y: 150 }, { x: 'Q2', y: 220 }, { x: 'Q3', y: 190 }, { x: 'Q4', y: 280 }],
        color: '#3b82f6',
        borderRadius: 4,
      },
    ],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: true,
    legend: { position: 'top' },
  });
</script>
```

</ComponentPreview>

## Area Chart

Filled area with monotone curve and low opacity:

<ComponentPreview vertical height="320px">

```html
<div id="ex-area" style="width:100%;height:280px;"></div>
<script>
  const { createAreaChart } = Prism;
  createAreaChart(document.getElementById('ex-area'), {
    series: [{
      name: 'Signups',
      data: [
        { x: 1, y: 500 }, { x: 2, y: 650 }, { x: 3, y: 800 },
        { x: 4, y: 720 }, { x: 5, y: 900 }, { x: 6, y: 1100 },
      ],
      color: '#8b5cf6',
      curve: 'monotone',
      fillOpacity: 0.2,
      showLine: true,
    }],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: { color: '#f1f5f9' } },
    crosshair: { vertical: true },
  });
</script>
```

</ComponentPreview>

## Legend — Area Chart

Stacked area chart with a bottom legend:

<ComponentPreview vertical height="360px">

```html
<div id="ex-legend-area" style="width:100%;height:280px;"></div>
<script>
  const { createAreaChart } = Prism;
  createAreaChart(document.getElementById('ex-legend-area'), {
    series: [
      {
        name: 'Mobile',
        data: [
          { x: 1, y: 300 }, { x: 2, y: 420 }, { x: 3, y: 510 },
          { x: 4, y: 480 }, { x: 5, y: 620 }, { x: 6, y: 750 },
        ],
        color: '#8b5cf6',
        curve: 'monotone',
        fillOpacity: 0.25,
      },
      {
        name: 'Desktop',
        data: [
          { x: 1, y: 200 }, { x: 2, y: 230 }, { x: 3, y: 290 },
          { x: 4, y: 240 }, { x: 5, y: 280 }, { x: 6, y: 350 },
        ],
        color: '#06b6d4',
        curve: 'monotone',
        fillOpacity: 0.25,
      },
    ],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    crosshair: true,
    legend: true,
  });
</script>
```

</ComponentPreview>

## Step Line Chart

Line chart with step interpolation:

<ComponentPreview vertical height="320px">

```html
<div id="ex-step" style="width:100%;height:280px;"></div>
<script>
  const { createLineChart } = Prism;
  createLineChart(document.getElementById('ex-step'), {
    series: [{
      name: 'Status',
      data: [
        { x: 1, y: 0 }, { x: 2, y: 1 }, { x: 3, y: 1 },
        { x: 4, y: 0 }, { x: 5, y: 1 }, { x: 6, y: 0 },
      ],
      color: '#f59e0b',
      curve: 'step',
      strokeWidth: 3,
    }],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left' },
  });
</script>
```

</ComponentPreview>

## Reactive Chart

Chart that updates when signal data changes:

<ComponentPreview vertical height="320px">

```html
<div style="margin-bottom:8px;">
  <button id="ex-reactive-btn" style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;">
    Add Data Point
  </button>
</div>
<div id="ex-reactive" style="width:100%;height:250px;"></div>
<script>
  const { createLineChart } = Prism;
  const { signal } = Ripple;

  const data = signal([
    { x: 1, y: 20 }, { x: 2, y: 35 }, { x: 3, y: 28 }, { x: 4, y: 45 },
  ]);

  createLineChart(document.getElementById('ex-reactive'), {
    series: [{ name: 'Live', data, color: '#10b981', curve: 'monotone', showPoints: true }],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    crosshair: true,
    transition: { duration: 400, easing: 'ease-out' },
  });

  document.getElementById('ex-reactive-btn').addEventListener('click', function() {
    var prev = data.value;
    var nextX = prev.length + 1;
    var nextY = 20 + Math.floor(Math.random() * 40);
    data.value = prev.concat([{ x: nextX, y: nextY }]);
  });
</script>
```

</ComponentPreview>

## Reactive Bar Chart

Bar chart that updates when signal data changes:

<ComponentPreview vertical height="320px">

```html
<div style="margin-bottom:8px;">
  <button id="ex-reactive-bar-btn" style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;">
    Add Category
  </button>
</div>
<div id="ex-reactive-bar" style="width:100%;height:250px;"></div>
<script>
  const { createBarChart } = Prism;
  const { signal } = Ripple;

  const barData = signal([
    { x: 'Q1', y: 120 }, { x: 'Q2', y: 180 }, { x: 'Q3', y: 150 }, { x: 'Q4', y: 210 },
  ]);

  createBarChart(document.getElementById('ex-reactive-bar'), {
    series: [{ name: 'Revenue', data: barData, color: '#6366f1', borderRadius: 4 }],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: true,
    transition: { duration: 400, easing: 'ease-out' },
  });

  var quarters = ['Q5', 'Q6', 'Q7', 'Q8'];
  var qIdx = 0;
  document.getElementById('ex-reactive-bar-btn').addEventListener('click', function() {
    if (qIdx >= quarters.length) return;
    var nextY = 150 + Math.floor(Math.random() * 120);
    barData.value = barData.value.concat([{ x: quarters[qIdx++], y: nextY }]);
  });
</script>
```

</ComponentPreview>

## Custom Tooltip

Rich HTML tooltip with custom formatting:

<ComponentPreview vertical height="320px">

```html
<div id="ex-tooltip" style="width:100%;height:280px;"></div>
<script>
  const { createBarChart } = Prism;
  createBarChart(document.getElementById('ex-tooltip'), {
    series: [{
      name: 'Revenue',
      data: [
        { x: 'Jan', y: 4200 }, { x: 'Feb', y: 5100 },
        { x: 'Mar', y: 4800 }, { x: 'Apr', y: 6300 },
        { x: 'May', y: 5900 }, { x: 'Jun', y: 7200 },
      ],
      color: '#6366f1',
      borderRadius: 6,
    }],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: {
      render: function(point, series) {
        return '<div style="font-weight:600">' + series.name + '</div>' +
          '<div style="opacity:0.7;font-size:11px">' + point.x + '</div>' +
          '<div style="font-size:14px;margin-top:2px">$' + point.y.toLocaleString() + '</div>';
      },
    },
  });
</script>
```

</ComponentPreview>
