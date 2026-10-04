---
title: 'Prism Examples: Sync a Details Panel with Hover'
description: Drive a details panel outside the chart from onHover for pointer and keyboard users.
---

## Sync a Details Panel with Hover

### Problem

A dashboard shows the active point's values in a panel beside the chart instead of a floating tooltip, and the panel must follow keyboard navigation as well as the pointer.

### Solution

Render the panel from `onHover`: it receives every series value for the active key, fires for arrow-key navigation, and receives `null` when the pointer leaves or `Escape` clears the selection.

<ComponentPreview vertical align="stretch" height="400px">

```html
<style>
  .hover-demo { display: grid; grid-template-columns: minmax(0, 1fr) var(--size-48); gap: var(--size-6); width: 100%; min-width: 0; align-items: start; }
  .hover-demo__chart { width: 100%; height: var(--size-72); }
  .hover-demo__panel { display: grid; gap: var(--size-2); margin: 0; }
  .hover-demo__title { margin: 0; font-weight: var(--font-semibold); }
  .hover-demo__row { display: flex; justify-content: space-between; gap: var(--size-3); font-size: var(--text-sm); }
  .hover-demo__row dt { color: var(--text-color-secondary); }
  .hover-demo__row dd { margin: 0; font-variant-numeric: tabular-nums; }
  @media (max-width: 520px) { .hover-demo { grid-template-columns: 1fr; } }
</style>
<div class="hover-demo">
  <div id="hover-chart" class="hover-demo__chart"></div>
  <section aria-labelledby="hover-title">
    <p id="hover-title" class="hover-demo__title">Week overview</p>
    <dl id="hover-panel" class="hover-demo__panel"></dl>
  </section>
</div>
<script>
  const weeks = [1, 2, 3, 4, 5, 6, 7, 8];
  const toSeries = (name, values) => ({ data: weeks.map((key, i) => ({ key, value: values[i] })), name, showPoints: true });
  const series = [
    toSeries('Orders', [120, 132, 101, 154, 190, 176, 210, 232]),
    toSeries('Returns', [12, 9, 14, 11, 18, 15, 13, 16]),
  ];
  const title = document.getElementById('hover-title');
  const panel = document.getElementById('hover-panel');
  const totals = series.map((s) => ({ datum: { value: s.data.reduce((sum, d) => sum + d.value, 0) }, series: s }));

  const render = (heading, values) => {
    title.textContent = heading;
    panel.replaceChildren(
      ...values.map(({ datum, series: s }) => {
        const row = document.createElement('div');
        const name = document.createElement('dt');
        const value = document.createElement('dd');
        row.className = 'hover-demo__row';
        name.textContent = s.name;
        value.textContent = datum ? String(datum.value) : 'No data';
        row.append(name, value);
        return row;
      }),
    );
  };

  const chart = Prism.createLineChart(document.getElementById('hover-chart'), {
    a11y: { ariaLabel: 'Weekly orders and returns' },
    crosshair: true,
    onHover: (event) => (event ? render(`Week ${event.datum.key}`, event.values) : render('All weeks', totals)),
    series,
    xAxis: { label: 'Week' },
    yAxis: { grid: true },
  });

  render('All weeks', totals);
  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- `values` holds one entry per series in series order; `datum` is `undefined` when a series has no point at that key.
- Without `tooltip`, Prism announces the values through its live region; a visible panel does not need its own `aria-live`.
- Build panel content with `textContent`, never by concatenating HTML.
- Pie, radar, and sparkline charts use their own `onHover` signatures; see the event hooks section.

### Related

- [Event hooks](../usage.md#event-hooks)
- [Keyboard and announcements](../usage.md#keyboard-and-announcements)
- [`ChartEvent` type](../api.md#axis-interaction-and-transition-configurations)
- [Render a custom tooltip](./custom-tooltip.md)
