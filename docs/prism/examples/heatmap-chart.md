---
title: 'Prism Examples: Show a Win-Rate Matrix with a Heatmap'
description: Render a hero-by-region win-rate matrix as a heatmap with binned colors and a legend.
---

## Show a Win-Rate Matrix with a Heatmap

### Problem

A stats page needs to show how each hero performs in each region at a glance, without a wall of numbers.

### Solution

Use `createHeatmapChart` with `bins` for discrete color steps, a swatch legend, and `valueFormat` to render the in-cell values as percentages.

<ComponentPreview vertical align="stretch" height="420px">

```html
<style>
  .heatmap-demo { display: grid; gap: var(--size-4); width: 100%; min-width: 0; }
  .heatmap-demo__chart { width: 100%; height: var(--size-80); }
</style>
<div class="heatmap-demo">
  <ore-switch id="continuous">Continuous ramp</ore-switch>
  <div id="heatmap-chart" class="heatmap-demo__chart"></div>
</div>
<script>
  const rows = ['Aria', 'Brom', 'Cira'];
  const columns = ['Forest', 'Swamp', 'Cave', 'Ridge'];
  const values = [
    [90, 40, 65, 78],
    [20, 75, 55, 47],
    [61, 83, 34, 92],
  ];
  const cells = rows.flatMap((row, r) =>
    columns.map((column, c) => ({ column, row, value: values[r][c] })),
  );

  const create = (bins) =>
    Prism.createHeatmapChart(document.getElementById('heatmap-chart'), {
      a11y: { ariaLabel: 'Win rate by hero and region' },
      bins,
      cells,
      columns,
      emptyLabel: 'No data',
      rows,
      tooltip: true,
      valueFormat: (value) => `${value}%`,
    });

  let chart = create([40, 60, 80]);

  document.getElementById('continuous').addEventListener('change', (event) => {
    chart.dispose();
    chart = create(event.currentTarget.checked ? undefined : [40, 60, 80]);
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

### Pitfalls

- With `bins`, each value maps to the first bin whose threshold exceeds it, and the chart shows a swatch legend with `<40`, `40–60`, `60–80`, and `≥80` labels. Without bins the ramp is continuous over the data's `[min, max]` domain and the legend is hidden.
- Cells whose value is `null` (or that the data never carried) render in `emptyColor`; `emptyLabel` adds a matching legend swatch.
- `rowSummary: { header, values }` paints a right-hand column of pre-formatted per-row texts (aligned with `rows`; `null` renders as a dash), shrinking the grid to make room.
- Hover or use the arrow keys to focus a cell: the tooltip (or the live region without one) announces `row · column: value`, and Enter fires `onCellClick`.

### Related

- [Heatmap chart API](../api.md#createheatmapchart)
- [Heatmaps](../usage.md#heatmaps)
- [Sync a details panel with hover](./hover-details.md)
