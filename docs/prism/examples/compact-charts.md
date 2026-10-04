---
title: 'Prism Examples: Render Compact Charts'
description: Render and update pie charts and sparklines in constrained layouts.
---

## Render Compact Charts

### Problem

A dashboard needs compact proportional and trend visualizations without cartesian axes.

### Solution

Use a donut for labelled proportions and a decorative sparkline for an adjacent trend.

<ComponentPreview vertical align="stretch" height="360px">

```html
<style>
  .compact-demo { display: grid; grid-template-columns: minmax(var(--size-40), 0.8fr) minmax(var(--size-56), 1.2fr); gap: var(--size-6); width: 100%; min-width: 0; align-items: center; }
  .compact-demo__panel { min-width: 0; }
  .compact-demo__label { margin: 0 0 var(--size-3); font-weight: var(--font-semibold); }
  .compact-demo__trend { width: 100%; height: var(--size-16); margin-bottom: var(--size-4); }
  .compact-demo__donut { width: 100%; height: var(--size-52); }
  @media (max-width: 520px) { .compact-demo { grid-template-columns: 1fr; } }
</style>
<div class="compact-demo">
  <section class="compact-demo__panel" aria-labelledby="channel-label">
    <p id="channel-label" class="compact-demo__label">Orders by channel</p>
    <div id="donut-chart" class="compact-demo__donut"></div>
  </section>
  <section class="compact-demo__panel" aria-labelledby="trend-label">
    <p id="trend-label" class="compact-demo__label">Weekly order trend</p>
    <div id="trend-chart" class="compact-demo__trend"></div>
    <ore-button id="extend-trend" variant="bordered" size="sm">Add latest week</ore-button>
  </section>
</div>
<script>
  const donut = Prism.createPieChart(document.getElementById('donut-chart'), {
    a11y: { ariaLabel: 'Orders by channel' },
    data: [
      { label: 'Direct', value: 48 },
      { label: 'Referral', value: 27 },
      { label: 'Social', value: 17 },
      { label: 'Email', value: 8 },
    ],
    legend: { position: 'bottom' },
    tooltip: true,
    variant: 'donut',
  });
  let trendData = [10, 14, 12, 18, 22];
  const trend = Prism.createSparkline(document.getElementById('trend-chart'), {
    a11y: { ariaLabel: 'Weekly order trend' },
    data: trendData,
    showEndPoint: true,
    variant: 'area',
  });

  document.getElementById('extend-trend').addEventListener('click', (event) => {
    trendData = trendData.concat(25);
    trend.update(trendData);
    event.currentTarget.setAttribute('disabled', '');
    event.currentTarget.textContent = 'Latest week added';
  });

  window.addEventListener('pagehide', () => {
    donut.dispose();
    trend.dispose();
  }, { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- Sparklines are decorative unless you set `a11y.ariaLabel`.
- Slice labels hide when they do not fit their slice; keep `tooltip` or a legend so small slices stay identifiable.
- Use `StackSegment[]` only with the sparkline `stack` variant.
- Sparklines have no keyboard navigation; pair them with a visible value when the trend matters.

### Related

- [Pie chart API](../api.md#createpiechart)
- [Sparkline API](../api.md#createsparkline)
- [Update chart data](./update-data.md)
