---
title: Prism 3 Migration
---

# Prism 3 Migration

Prism 3 replaces implicit reactive inputs with explicit chart updates, removes the plugin API, narrows invalid axis and line-data types, and makes tooltip rendering safe by construction.

## Replace signals with `ChartHandle.update()`

Chart configuration accepts plain arrays. Keep state in your application and pass the next complete data value to `update()`.

```ts
// Prism 2
const data = signal([{ key: 1, value: 10 }]);
const chart = createLineChart(container, {
  series: [{ data, name: 'Revenue' }],
});
data.value = [{ key: 2, value: 20 }];

// Prism 3
const chart = createLineChart(container, {
  series: [{ data: [{ key: 1, value: 10 }], name: 'Revenue' }],
});
chart.update([{ data: [{ key: 2, value: 20 }], name: 'Revenue' }]);
```

`signal`, `MaybeSignal`, `Readable`, `Signal`, `SignalOptions`, and `Equality` are no longer exported by Prism. If your application uses Ripple, subscribe at the ownership boundary and call `chart.update()` from that subscription.

## Remove chart plugins

`ChartPlugin`, `ChartPluginContext`, and the `plugins` config field are removed. Compose application behavior around the returned handle instead. Use `handle.el` for DOM listeners and `handle.disposalSignal` for cleanup.

```ts
const chart = createLineChart(container, config);
const onClick = () => recordChartClick();

chart.el.addEventListener('click', onClick);
chart.disposalSignal.addEventListener(
  'abort',
  () => chart.el.removeEventListener('click', onClick),
  { once: true },
);
```

The plugin-only `LegendState`, `TooltipState`, and `Point` exports are also removed. `animate()` and `AnimationTarget` are no longer part of the package root.

## Replace HTML tooltip rendering

`TooltipConfig.sanitize` is removed. Tooltip strings are rendered as text. Return a DOM node when you need structured content.

```ts
// Prism 2
{
  render: (datum) => `<strong>${datum.value}</strong>`,
  sanitize: (html) => DOMPurify.sanitize(html),
}

// Prism 3
{
  render: (datum) => {
    const content = document.createElement('strong');
    content.textContent = String(datum.value);
    return content;
  },
}
```

## Use valid continuous keys and axis positions

Line and area data now use `ContinuousDatum`, whose key is `number | Date`. String keys remain valid for bar charts. `xAxis.position` accepts only `'top' | 'bottom'`; `yAxis.position` accepts only `'left' | 'right'`.

## Label informative charts

Charts without `a11y` are decorative and receive `aria-hidden="true"`. Set an accessible label for every chart that conveys information.

```ts
createBarChart(container, {
  a11y: { ariaLabel: 'Orders by status' },
  series,
});
```

## Update handle annotations

`ChartHandle` now accepts the value consumed by `update()`.

```ts
let chart: ChartHandle<LineSeriesConfig[]>;
```

Repeated `dispose()` calls remain safe. Calling `update()` after disposal throws `PrismRenderError`.
