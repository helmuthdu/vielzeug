---
title: Prism Migration
---

# Upcoming Train Migration

Line, area, bar, pie, and sparkline charts now share the radar chart's interaction model: series comparison, keyboard navigation, and active-key highlighting. Default visuals, default motion, and a few DOM contracts changed.

## Charts animate by default

Every chart now animates without configuration: line and area series are wiped in left to right on mount (the final shape is painted first and revealed behind a clip, so the curve never deforms), radar series fade in while rising, pie slices morph between values instead of replaying their entry sweep, and sparklines reveal their final plot on mount and tween an update instead of snapping. Previously these charts drew every frame synchronously unless you passed a `transition` config.

```ts
// Before: static unless a transition was configured
createLineChart(container, { series });

// After: same call animates; opt out to restore synchronous rendering
createLineChart(container, { series, transition: false });
```

`transition` now also accepts a boolean: `false` renders every update synchronously, `true` states the default explicitly. Reduced-motion users still get synchronous rendering through `preference: 'system'`, the default.

Three consequences for tests: a first render no longer ends on final geometry (drive the animation frames, or pass `transition: false`); during a mount entrance a line/area series group carries a temporary `clip-path` pointing at a `prism-reveal-*` clip (it is removed when the entrance completes, so settled charts have none); and crosshair guides carry their position in a `transform` instead of `x1`/`y1` attributes so a snapped guide can glide to the next datum.

## Import the theme as `theme.css`

The theme subpath is now `@vielzeug/prism/theme.css`; the extensionless `@vielzeug/prism/theme` export is removed. The `.css` suffix lets extension-based CSS loaders and Jest `moduleNameMapper` rules resolve the subpath without a bespoke mapping.

```ts
// Before
import '@vielzeug/prism/theme';

// After
import '@vielzeug/prism/theme.css';
```

## Expect axes to render by default

Line, area, and bar charts render both axes when the config omits them, with gridlines on the value axis. Previously a chart with no `xAxis`/`yAxis` key drew no axis at all. Pass `false` to keep the old look.

```ts
// Before: no axes drawn
createBarChart(container, { series });

// After: same call now draws both axes; opt out explicitly
createBarChart(container, { series, xAxis: false, yAxis: false });
```

Update visual snapshots that captured an axis-less chart, and drop the now-redundant `xAxis: {}` / `yAxis: { grid: true }` boilerplate.

## Keep flat area fills

Area series default to a gradient that fades toward the baseline. Set `fill: 'solid'` to keep the previous flat fill.

```ts
// Before: flat fill by default
createAreaChart(container, { series: [{ data, name: 'Users' }] });

// After: opt back into a flat fill
createAreaChart(container, { series: [{ data, fill: 'solid', name: 'Users' }] });
```

Sparkline `area` fills also use a gradient. Their default `fillOpacity` is now the `--prism-spark-fill-opacity` token instead of `0.2`.

## Keep square bars

Grouped bars take their corner radius from `--prism-bar-radius`, now `4px`. Stacked bars stay square.

```ts
// Per series
createBarChart(container, { series: [{ borderRadius: 0, data, name: 'Sales' }] });
```

```css
/* Or for every chart */
:root {
  --prism-bar-radius: 0;
}
```

## Review explicit stroke and opacity values

`strokeWidth` (line series), `fillOpacity` (area series and sparklines), and `borderRadius` (bar series) now override the theme tokens. Previously the stylesheet overrode them. Remove values you set but relied on the theme replacing.

## Read announcements from `.prism-live`

Each chart has one `role="status"` region, `.prism-live`, replacing `.prism-crosshair-live` and `.prism-radar-live`. Announcements and the default tooltip now compare every series at the active key.

```ts
// Before
chart.el.querySelector('.prism-crosshair-live')?.textContent; // 'Revenue: 10'

// After
chart.el.querySelector('.prism-live')?.textContent; // '1: Revenue 10, Costs 6'
```

## Expect the first arrow press to focus the first point

On line and area charts, the first arrow press now focuses the first x position instead of the second. Update keyboard tests that pressed once to reach the second point.

## Expect date axes to fit the data

Line and area charts with `Date` keys no longer round the x domain outwards to a tick interval, matching numeric keys. The series now spans the full plot width, and edge ticks may fall inside the data range. Update visual snapshots that captured the padded axis.

```ts
// Before: 3 to 14 September rendered on an axis from 27 August to 17 September
// After: the same data renders on an axis from 3 to 14 September
```

## Replace `debugChart()` with `ChartHandle.tap()`

The `@vielzeug/prism/devtools` subpath and its `debugChart()` helper are removed. Every handle now exposes `tap()`, which observes the chart's own resize and dispose events with no second observer and no wrapper.

```ts
// Before
import { debugChart } from '@vielzeug/prism/devtools';
const chart = debugChart(createLineChart(container, config), { label: 'revenue' });

// After
const chart = createLineChart(container, config);
const unsubscribe = chart.tap((event) => {
  if (event.type === 'resize') console.log('resized', event.width, event.height);
  if (event.type === 'dispose') console.log('disposed');
});
```

`tap()` returns an unsubscribe function and accepts `{ signal }` for automatic detach. Handler errors are swallowed. Tapping a disposed handle returns a no-op unsubscribe.

## Read pie and sparkline events from one object

Pie and sparkline `onClick`/`onHover` callbacks now receive a single event object instead of positional arguments, matching the `ChartEvent` and `RadarEvent` shape used by the other charts.

```ts
// Before
createPieChart(container, {
  data,
  onClick: (slice, index) => console.log(index, slice.label),
  onHover: (slice, index) => slice && console.log(index),
});

// After
createPieChart(container, {
  data,
  onClick: (event) => console.log(event.index, event.slice.label),
  onHover: (event) => event && console.log(event.index),
});
```

`PieEvent` carries `index`, `slice`, and `originalEvent`; `SparklineEvent` carries `index`, `value`, and `originalEvent`. `onHover` still receives `null` when the pointer leaves.

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
