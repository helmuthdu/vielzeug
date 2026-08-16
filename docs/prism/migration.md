---
title: Prism Migration
---

# Prism 2.0 Migration

Prism 2.0 removes the speculative `PrismDisposedError` class, the `PrismError.is()` type guard, and the deprecated `ariaLabel` config field.

## Replace `PrismError.is()` with `instanceof`

The static `PrismError.is()` type guard is removed. Use `instanceof PrismError` to narrow unknown values to the prism error hierarchy.

```ts
// Prism 1
if (PrismError.is(err)) { ... }

// Prism 2
if (err instanceof PrismError) { ... }
```

## Remove `PrismDisposedError`

`PrismDisposedError` was a reserved-for-future class with no code path throwing it. It is removed from exports. `dispose()` remains an idempotent no-op — no error is thrown on repeated calls. If you imported the class for `instanceof` checks, remove the import; no runtime behavior changes.

## Replace `ariaLabel` with `a11y: { ariaLabel }`

The deprecated `ariaLabel` field on `BaseChartConfig` and `SparklineConfig` is removed. Use the `a11y` field instead.

```ts
// Prism 1
createLineChart(container, { ariaLabel: 'Revenue', series: [...] });
createSparkline(container, { ariaLabel: 'Trend', data: [1, 2, 3] });

// Prism 2
createLineChart(container, { a11y: { ariaLabel: 'Revenue' }, series: [...] });
createSparkline(container, { a11y: { ariaLabel: 'Trend' }, data: [1, 2, 3] });
```

For decorative sparklines (the previous default when `ariaLabel` was omitted), omit `a11y` entirely — the SVG is marked `aria-hidden="true"` automatically.

## Give chart effects a scope

Update chart integrations so reactive effects created for a chart belong to a Ripple scope. Dispose that scope with the chart lifetime to prevent effects surviving an unmounted chart.

## Retain chart-handle disposal

Continue to dispose the `ChartHandle` returned by chart factories. Review plugin and lifecycle integrations for ownership assumptions that changed with scoped effects.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for current chart factory, handle, plugin, and Ripple integration contracts.
