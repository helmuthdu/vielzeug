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
    series: [
      {
        name: 'Revenue',
        data: [
          { key: 1, value: 120 },
          { key: 2, value: 180 },
          { key: 3, value: 150 },
          { key: 4, value: 220 },
          { key: 5, value: 195 },
          { key: 6, value: 280 },
        ],
        color: '#3b82f6',
        curve: 'monotone',
        strokeWidth: 2,
        showPoints: true,
      },
    ],
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
        data: [
          { key: 1, value: 40 },
          { key: 2, value: 65 },
          { key: 3, value: 55 },
          { key: 4, value: 80 },
          { key: 5, value: 72 },
        ],
        color: '#3b82f6',
        curve: 'monotone',
      },
      {
        name: 'Product B',
        data: [
          { key: 1, value: 20 },
          { key: 2, value: 35 },
          { key: 3, value: 60 },
          { key: 4, value: 45 },
          { key: 5, value: 90 },
        ],
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
        data: [
          { key: 1, value: 120 },
          { key: 2, value: 180 },
          { key: 3, value: 150 },
          { key: 4, value: 220 },
          { key: 5, value: 195 },
        ],
        color: '#3b82f6',
        curve: 'monotone',
      },
      {
        name: 'Expenses',
        data: [
          { key: 1, value: 80 },
          { key: 2, value: 95 },
          { key: 3, value: 110 },
          { key: 4, value: 130 },
          { key: 5, value: 125 },
        ],
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
        data: [
          { key: 'Q1', value: 120 },
          { key: 'Q2', value: 180 },
          { key: 'Q3', value: 150 },
          { key: 'Q4', value: 210 },
        ],
        color: '#94a3b8',
        borderRadius: 4,
      },
      {
        name: '2024',
        data: [
          { key: 'Q1', value: 150 },
          { key: 'Q2', value: 220 },
          { key: 'Q3', value: 190 },
          { key: 'Q4', value: 280 },
        ],
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

## Stacked Bar Chart

Bar chart with `variant: 'stacked'` — series stack vertically per category:

<ComponentPreview vertical height="320px">

```html
<div id="ex-bar-stacked" style="width:100%;height:280px;"></div>
<script>
  const { createBarChart } = Prism;
  createBarChart(document.getElementById('ex-bar-stacked'), {
    series: [
      {
        name: 'Mobile',
        data: [
          { key: 'Q1', value: 80 },
          { key: 'Q2', value: 110 },
          { key: 'Q3', value: 95 },
          { key: 'Q4', value: 130 },
        ],
        color: '#3b82f6',
        borderRadius: 0,
      },
      {
        name: 'Desktop',
        data: [
          { key: 'Q1', value: 60 },
          { key: 'Q2', value: 90 },
          { key: 'Q3', value: 75 },
          { key: 'Q4', value: 100 },
        ],
        color: '#10b981',
        borderRadius: 0,
      },
      {
        name: 'Tablet',
        data: [
          { key: 'Q1', value: 20 },
          { key: 'Q2', value: 30 },
          { key: 'Q3', value: 25 },
          { key: 'Q4', value: 35 },
        ],
        color: '#f59e0b',
        borderRadius: 0,
      },
    ],
    variant: 'stacked',
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: true,
    legend: true,
  });
</script>
```

</ComponentPreview>

## Horizontal Bar Chart

Bar chart with `variant: 'grouped-horizontal'` — categories on the Y axis, values on the X axis:

<ComponentPreview vertical height="320px">

```html
<div id="ex-bar-horizontal" style="width:100%;height:280px;"></div>
<script>
  const { createBarChart } = Prism;
  createBarChart(document.getElementById('ex-bar-horizontal'), {
    variant: 'grouped-horizontal',
    series: [
      {
        name: 'Revenue',
        data: [
          { key: 'Q1', value: 80 },
          { key: 'Q2', value: 110 },
          { key: 'Q3', value: 95 },
          { key: 'Q4', value: 130 },
        ],
        color: '#3b82f6',
      },
    ],
    xAxis: { position: 'bottom', grid: true },
    yAxis: { position: 'left' },
    tooltip: true,
  });
</script>
```

</ComponentPreview>

## Horizontal Stacked Bar Chart

Use `variant: 'stacked-horizontal'` — horizontal bars stacked per category:

<ComponentPreview vertical height="320px">

```html
<div id="ex-bar-h-stacked" style="width:100%;height:280px;"></div>
<script>
  const { createBarChart } = Prism;
  createBarChart(document.getElementById('ex-bar-h-stacked'), {
    variant: 'stacked-horizontal',
    series: [
      {
        name: 'Mobile',
        data: [
          { key: 'Q1', value: 80 },
          { key: 'Q2', value: 110 },
          { key: 'Q3', value: 95 },
          { key: 'Q4', value: 130 },
        ],
        color: '#3b82f6',
        borderRadius: 0,
      },
      {
        name: 'Desktop',
        data: [
          { key: 'Q1', value: 60 },
          { key: 'Q2', value: 90 },
          { key: 'Q3', value: 75 },
          { key: 'Q4', value: 100 },
        ],
        color: '#10b981',
        borderRadius: 0,
      },
    ],
    xAxis: { position: 'bottom', grid: true },
    yAxis: { position: 'left' },
    tooltip: true,
    legend: true,
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
        data: [
          { key: 'Q1', value: 120 },
          { key: 'Q2', value: 180 },
          { key: 'Q3', value: 150 },
          { key: 'Q4', value: 210 },
        ],
        color: '#94a3b8',
        borderRadius: 4,
      },
      {
        name: '2024',
        data: [
          { key: 'Q1', value: 150 },
          { key: 'Q2', value: 220 },
          { key: 'Q3', value: 190 },
          { key: 'Q4', value: 280 },
        ],
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
    series: [
      {
        name: 'Signups',
        data: [
          { key: 1, value: 500 },
          { key: 2, value: 650 },
          { key: 3, value: 800 },
          { key: 4, value: 720 },
          { key: 5, value: 900 },
          { key: 6, value: 1100 },
        ],
        color: '#8b5cf6',
        curve: 'monotone',
        fillOpacity: 0.2,
        showLine: true,
      },
    ],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: { color: '#f1f5f9' } },
    crosshair: { vertical: true },
  });
</script>
```

</ComponentPreview>

## Legend — Area Chart

Multi-series area chart with a bottom legend:

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
          { key: 1, value: 300 },
          { key: 2, value: 420 },
          { key: 3, value: 510 },
          { key: 4, value: 480 },
          { key: 5, value: 620 },
          { key: 6, value: 750 },
        ],
        color: '#8b5cf6',
        curve: 'monotone',
        fillOpacity: 0.25,
      },
      {
        name: 'Desktop',
        data: [
          { key: 1, value: 200 },
          { key: 2, value: 230 },
          { key: 3, value: 290 },
          { key: 4, value: 240 },
          { key: 5, value: 280 },
          { key: 6, value: 350 },
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
    series: [
      {
        name: 'Status',
        data: [
          { key: 1, value: 0 },
          { key: 2, value: 1 },
          { key: 3, value: 1 },
          { key: 4, value: 0 },
          { key: 5, value: 1 },
          { key: 6, value: 0 },
        ],
        color: '#f59e0b',
        curve: 'step',
        strokeWidth: 3,
      },
    ],
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
    { key: 1, value: 20 },
    { key: 2, value: 35 },
    { key: 3, value: 28 },
    { key: 4, value: 45 },
  ]);

  createLineChart(document.getElementById('ex-reactive'), {
    series: [{ name: 'Live', data, color: '#10b981', curve: 'monotone', showPoints: true }],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    crosshair: true,
    transition: { duration: 400, easing: 'ease-out' },
  });

  document.getElementById('ex-reactive-btn').addEventListener('click', function () {
    var prev = data.value;
    var nextX = prev.length + 1;
    var nextY = 20 + Math.floor(Math.random() * 40);
    data.value = prev.concat([{ key: nextX, value: nextY }]);
  });
</script>
```

</ComponentPreview>

## Reactive Bar Chart

Bar chart that updates when signal data changes, with stagger animation on new bars:

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
    { key: 'Q1', value: 120 },
    { key: 'Q2', value: 180 },
    { key: 'Q3', value: 150 },
    { key: 'Q4', value: 210 },
  ]);

  createBarChart(document.getElementById('ex-reactive-bar'), {
    series: [{ name: 'Revenue', data: barData, color: '#6366f1', borderRadius: 4 }],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: true,
    transition: { duration: 400, easing: 'ease-out', stagger: 40 },
  });

  var quarters = ['Q5', 'Q6', 'Q7', 'Q8'];
  var qIdx = 0;
  document.getElementById('ex-reactive-bar-btn').addEventListener('click', function () {
    if (qIdx >= quarters.length) return;
    var nextY = 150 + Math.floor(Math.random() * 120);
    barData.value = barData.value.concat([{ key: quarters[qIdx++], value: nextY }]);
  });
</script>
```

</ComponentPreview>

## Event Hooks

Using `onHover` and `onClick` to react to chart interactions:

<ComponentPreview vertical height="360px">

```html
<div id="ex-events-info" style="margin-bottom:8px;font-size:13px;color:#64748b;min-height:20px;"></div>
<div id="ex-events" style="width:100%;height:280px;"></div>
<script>
  const { createLineChart } = Prism;

  const info = document.getElementById('ex-events-info');

  createLineChart(document.getElementById('ex-events'), {
    series: [
      {
        name: 'Revenue',
        data: [
          { key: 1, value: 120 },
          { key: 2, value: 180 },
          { key: 3, value: 150 },
          { key: 4, value: 220 },
          { key: 5, value: 195 },
          { key: 6, value: 280 },
        ],
        color: '#3b82f6',
        curve: 'monotone',
        showPoints: true,
      },
    ],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    onHover: function (event) {
      info.textContent = event ? 'Hovering key=' + event.datum.key + ' value=' + event.datum.value : '';
    },
    onClick: function (event) {
      info.textContent = 'Clicked key=' + event.datum.key + ' value=' + event.datum.value;
    },
  });
</script>
```

</ComponentPreview>

## Pie Chart

Basic pie chart with labeled slices:

<ComponentPreview vertical height="340px">

```html
<div id="ex-pie" style="width:300px;height:300px;"></div>
<script>
  const { createPieChart } = Prism;
  createPieChart(document.getElementById('ex-pie'), {
    data: [
      { label: 'Direct', value: 42, color: '#3b82f6' },
      { label: 'Organic', value: 28, color: '#10b981' },
      { label: 'Referral', value: 18, color: '#f59e0b' },
      { label: 'Social', value: 12, color: '#8b5cf6' },
    ],
    variant: 'pie',
    transition: { duration: 600, easing: 'ease-out' },
  });
</script>
```

</ComponentPreview>

## Donut Chart

Donut chart with tooltip:

<ComponentPreview vertical height="340px">

```html
<div id="ex-donut" style="width:300px;height:300px;"></div>
<script>
  const { createPieChart } = Prism;
  createPieChart(document.getElementById('ex-donut'), {
    data: [
      { label: 'Direct', value: 42, color: '#3b82f6' },
      { label: 'Organic', value: 28, color: '#10b981' },
      { label: 'Referral', value: 18, color: '#f59e0b' },
      { label: 'Social', value: 12, color: '#8b5cf6' },
    ],
    variant: 'donut',
    tooltip: true,
    transition: { duration: 600, easing: 'ease-out' },
  });
</script>
```

</ComponentPreview>

## Semi-circle Donut

Semicircle donut — useful for gauges and progress indicators:

<ComponentPreview vertical height="220px">

```html
<div id="ex-semi" style="width:300px;height:180px;"></div>
<script>
  const { createPieChart } = Prism;
  createPieChart(document.getElementById('ex-semi'), {
    data: [
      { label: 'Used', value: 68, color: '#3b82f6' },
      { label: 'Free', value: 32, color: '#e2e8f0' },
    ],
    variant: 'semi',
    transition: { duration: 800, easing: 'ease-out' },
  });
</script>
```

</ComponentPreview>

## Sparkline — Line

Minimal inline sparkline inside a table cell or card:

<ComponentPreview vertical height="80px">

```html
<div id="ex-spark-line" style="width:200px;height:40px;"></div>
<script>
  const { createSparkline } = Prism;
  createSparkline(document.getElementById('ex-spark-line'), {
    data: [12, 18, 14, 22, 19, 28, 24, 32],
    variant: 'line',
    color: '#3b82f6',
    curve: 'monotone',
    strokeWidth: 1.5,
  });
</script>
```

</ComponentPreview>

## Sparkline — Area

Area variant with fill:

<ComponentPreview vertical height="80px">

```html
<div id="ex-spark-area" style="width:200px;height:40px;"></div>
<script>
  const { createSparkline } = Prism;
  createSparkline(document.getElementById('ex-spark-area'), {
    data: [12, 18, 14, 22, 19, 28, 24, 32],
    variant: 'area',
    color: '#8b5cf6',
    curve: 'monotone',
    fillOpacity: 0.25,
  });
</script>
```

</ComponentPreview>

## Sparkline — Bar

Bar variant — one rect per value:

<ComponentPreview vertical height="80px">

```html
<div id="ex-spark-bar" style="width:200px;height:40px;"></div>
<script>
  const { createSparkline } = Prism;
  createSparkline(document.getElementById('ex-spark-bar'), {
    data: [12, 18, 14, 22, 19, 28, 24, 32],
    variant: 'bar',
    color: '#10b981',
    transition: { duration: 400, easing: 'ease-out', stagger: 30 },
  });
</script>
```

</ComponentPreview>

## Sparkline — Reactive

Sparkline that updates when signal data changes:

<ComponentPreview vertical height="120px">

```html
<div style="margin-bottom:8px;">
  <button id="ex-spark-btn" style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:4px;cursor:pointer;">
    Add Point
  </button>
</div>
<div id="ex-spark-reactive" style="width:200px;height:40px;"></div>
<script>
  const { createSparkline } = Prism;
  const { signal } = Ripple;

  const sparkData = signal([10, 15, 12, 18, 14]);

  createSparkline(document.getElementById('ex-spark-reactive'), {
    data: sparkData,
    variant: 'area',
    color: '#f59e0b',
    curve: 'monotone',
    fillOpacity: 0.2,
    transition: { duration: 300, easing: 'ease-out' },
  });

  document.getElementById('ex-spark-btn').addEventListener('click', function () {
    sparkData.value = sparkData.value.concat([10 + Math.floor(Math.random() * 25)]);
  });
</script>
```

</ComponentPreview>

## Sparkline — Stack

Horizontal stacked bar — proportional segments with per-segment colors:

<ComponentPreview vertical height="80px">

```html
<div id="ex-spark-stack" style="width:200px;height:40px;"></div>
<script>
  const { createSparkline } = Prism;
  createSparkline(document.getElementById('ex-spark-stack'), {
    variant: 'stack',
    data: [
      { label: 'Chrome', value: 341, color: '#3b82f6' },
      { label: 'Safari', value: 217, color: '#06b6d4' },
      { label: 'Firefox', value: 124, color: '#10b981' },
      { label: 'Edge', value: 53, color: '#f59e0b' },
    ],
    cornerRadius: 4,
    padPixels: 4,
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
    series: [
      {
        name: 'Revenue',
        data: [
          { key: 'Jan', value: 4200 },
          { key: 'Feb', value: 5100 },
          { key: 'Mar', value: 4800 },
          { key: 'Apr', value: 6300 },
          { key: 'May', value: 5900 },
          { key: 'Jun', value: 7200 },
        ],
        color: '#6366f1',
        borderRadius: 6,
      },
    ],
    xAxis: { position: 'bottom' },
    yAxis: { position: 'left', grid: true },
    tooltip: {
      render: function (datum, series) {
        return (
          '<div style="font-weight:600">' +
          series.name +
          '</div>' +
          '<div style="opacity:0.7;font-size:11px">' +
          datum.key +
          '</div>' +
          '<div style="font-size:14px;margin-top:2px">$' +
          datum.value.toLocaleString() +
          '</div>'
        );
      },
    },
  });
</script>
```

</ComponentPreview>

## Pie Chart with Plugin

A donut chart that installs a custom plugin to draw a total count label in the center hole:

<ComponentPreview vertical height="320px">

```html
<div id="ex-pie-plugin" style="width:100%;height:280px;"></div>
<script>
  const { createPieChart } = Prism;

  const data = [
    { label: 'Direct', value: 42, color: '#6366f1' },
    { label: 'Organic', value: 28, color: '#10b981' },
    { label: 'Social', value: 18, color: '#f59e0b' },
    { label: 'Referral', value: 12, color: '#8b5cf6' },
  ];

  const total = data.reduce((s, d) => s + d.value, 0);
  let centerLabel;

  const centerPlugin = {
    install(ctx) {
      const ns = 'http://www.w3.org/2000/svg';
      centerLabel = document.createElementNS(ns, 'text');
      centerLabel.setAttribute('text-anchor', 'middle');
      centerLabel.setAttribute('dominant-baseline', 'middle');
      centerLabel.setAttribute('font-size', '20');
      centerLabel.setAttribute('font-weight', '600');
      centerLabel.setAttribute('fill', 'var(--prism-text-color, #334155)');
      centerLabel.textContent = total;
      ctx.svg.appendChild(centerLabel);
      // Position at SVG center once dimensions are available
      requestAnimationFrame(() => {
        const { width, height } = ctx.dimensions.value;
        if (width && height) {
          centerLabel.setAttribute('x', String(width / 2));
          centerLabel.setAttribute('y', String(height / 2));
        }
      });
    },
    dispose() {
      centerLabel?.remove();
    },
  };

  createPieChart(document.getElementById('ex-pie-plugin'), {
    data,
    variant: 'donut',
    tooltip: true,
    transition: { duration: 400, easing: 'ease-out' },
    plugins: [centerPlugin],
  });
</script>
```

</ComponentPreview>
