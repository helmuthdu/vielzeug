---
title: 'Prism Examples — Render a Custom Tooltip'
description: Render safe structured tooltip content without HTML string injection.
---

## Render a Custom Tooltip

### Problem

A chart tooltip needs formatted, structured content rather than Prism's default text.

### Solution

Return a DOM node from `tooltip.render`. Assign dynamic values with `textContent`.

<ComponentPreview vertical align="stretch" height="390px">

```html
<style>
  .tooltip-demo { width: 100%; min-width: 0; }
  .tooltip-demo__hint { margin: 0 0 0.75rem; color: color-mix(in srgb, CanvasText 65%, Canvas); font-size: 0.875rem; }
  .tooltip-demo__value { margin-top: 0.2rem; font-variant-numeric: tabular-nums; }
</style>
<div class="tooltip-demo">
  <p class="tooltip-demo__hint">Move across the line to inspect monthly revenue.</p>
  <div id="tooltip-chart" style="width:100%;height:280px;"></div>
</div>
<script>
  const chart = Prism.createLineChart(document.getElementById('tooltip-chart'), {
    a11y: { ariaLabel: 'Monthly revenue' },
    series: [
      {
        data: [
          { key: 1, value: 4200 },
          { key: 2, value: 5100 },
          { key: 3, value: 4800 },
          { key: 4, value: 6300 },
        ],
        name: 'Revenue',
        showPoints: true,
      },
    ],
    tooltip: {
      render: (datum, series) => {
        const content = document.createElement('div');
        const title = document.createElement('strong');
        const value = document.createElement('div');
        title.textContent = series.name;
        value.className = 'tooltip-demo__value';
        value.textContent = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(datum.value);
        content.append(title, value);
        return content;
      },
    },
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- Returned strings are displayed as text, not parsed as HTML.
- Do not reuse one mutable node across multiple charts.
- Keep tooltip rendering synchronous.

### Related

- [TooltipConfig API](../api.md#axis-interaction-and-transition-configurations)
- [Create a line chart](./line-chart.md)
- [Orbit](/orbit/) — tooltip positioning primitives used by Prism
