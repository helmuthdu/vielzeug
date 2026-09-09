---
title: 'Prism Examples — Render Compact Charts'
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
  .compact-demo { display: grid; grid-template-columns: minmax(10rem, 0.8fr) minmax(14rem, 1.2fr); gap: 1.5rem; width: 100%; min-width: 0; align-items: center; }
  .compact-demo__panel { min-width: 0; }
  .compact-demo__label { margin: 0 0 0.65rem; font-weight: 650; }
  .compact-demo__button { margin-top: 1rem; border: 1px solid #94a3b8; border-radius: 0.75rem; padding: 0.5rem 0.8rem; background: Canvas; color: CanvasText; font: inherit; cursor: pointer; }
  .compact-demo__button:hover:not(:disabled) { background: color-mix(in srgb, CanvasText 8%, Canvas); }
  .compact-demo__button:focus-visible { outline: 3px solid #8b5cf6; outline-offset: 2px; }
  .compact-demo__button:disabled { cursor: not-allowed; opacity: 0.65; }
  @media (max-width: 520px) { .compact-demo { grid-template-columns: 1fr; } }
</style>
<div class="compact-demo">
  <section class="compact-demo__panel" aria-labelledby="channel-label">
    <p id="channel-label" class="compact-demo__label">Orders by channel</p>
    <div id="donut-chart" style="width:100%;height:210px;"></div>
  </section>
  <section class="compact-demo__panel" aria-labelledby="trend-label">
    <p id="trend-label" class="compact-demo__label">Weekly order trend</p>
    <div id="trend-chart" style="width:100%;height:64px;"></div>
    <button id="extend-trend" class="compact-demo__button" type="button">Add latest week</button>
  </section>
</div>
<script>
  const donut = Prism.createPieChart(document.getElementById('donut-chart'), {
    a11y: { ariaLabel: 'Orders by channel' },
    data: [
      { label: 'Direct', value: 60 },
      { label: 'Referral', value: 40 },
    ],
    transition: { duration: 0 },
    variant: 'donut',
  });
  let trendData = [10, 14, 12, 18, 22];
  const trend = Prism.createSparkline(document.getElementById('trend-chart'), {
    a11y: { ariaLabel: 'Weekly order trend' },
    data: trendData,
    variant: 'area',
  });

  document.getElementById('extend-trend').addEventListener('click', (event) => {
    trendData = trendData.concat(25);
    trend.update(trendData);
    event.currentTarget.disabled = true;
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
- Use `StackSegment[]` only with the sparkline `stack` variant.
- Keep every chart container sized before creation.

### Related

- [Pie chart API](../api.md#createpiechart)
- [Sparkline API](../api.md#createsparkline)
- [Update chart data](./update-data.md)
