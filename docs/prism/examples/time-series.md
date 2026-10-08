---
title: 'Prism Examples: Plot a Time Series'
description: Plot two date-keyed series as gradient areas with formatted ticks and a snapping crosshair.
---

## Plot a Time Series

### Problem

Daily metrics keyed by `Date` need a readable time axis, a way to compare two series on the same day, and keyboard access to every point.

### Solution

Pass `Date` keys to `createAreaChart` so Prism switches to a time scale, format ticks with `xAxis.tickFormat`, and enable `crosshair` and `tooltip` for the day comparison.

<ComponentPreview vertical align="stretch" height="380px">

```html
<div id="traffic-chart" style="width:100%;min-width:0;height:300px;"></div>
<script>
  const start = new Date(2026, 8, 1);
  const day = (offset) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
  const visits = [420, 460, 510, 480, 620, 700, 540, 580, 640, 690, 760, 720, 810, 880];
  const signups = [32, 35, 41, 38, 52, 61, 44, 47, 55, 58, 66, 63, 72, 79];
  const toSeries = (name, values) => ({
    curve: 'monotone',
    data: values.map((value, i) => ({ key: day(i), value })),
    name,
  });
  const dayFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

  const chart = Prism.createAreaChart(document.getElementById('traffic-chart'), {
    a11y: { ariaLabel: 'Daily visits and signups, last two weeks' },
    crosshair: { snap: true },
    legend: { position: 'top' },
    series: [toSeries('Visits', visits), toSeries('Signups', signups)],
    tooltip: true,
    xAxis: { tickFormat: (value) => dayFormat.format(value) },
    yAxis: { grid: true },
  });

  window.addEventListener('pagehide', () => chart.dispose(), { once: true });
</script>
```

</ComponentPreview>

#### With Flat Fills

Set `fill: 'solid'` and an explicit `fillOpacity` on a series to replace the gradient with a flat tint, for example when areas overlap heavily.

```ts
import { createAreaChart } from '@vielzeug/prism';

const container = document.createElement('div');
container.style.cssText = 'width:640px;height:320px';
document.body.append(container);

const days = [1, 2, 3, 4];
const toSeries = (name, values) => ({
  curve: 'monotone',
  data: values.map((value, i) => ({ key: new Date(2026, 8, days[i]), value })),
  fill: 'solid',
  fillOpacity: 0.2,
  name,
});
const chart = createAreaChart(container, {
  a11y: { ariaLabel: 'Daily visits and signups' },
  series: [toSeries('Visits', [420, 460, 510, 480]), toSeries('Signups', [32, 35, 41, 38])],
});

chart.dispose();
```

### Pitfalls

- Use `Date` keys for every point of every series; mixing numbers and dates breaks the time scale.
- `tickFormat` receives the tick value typed as `Date | number | string`; format it, do not parse it.
- Series on very different magnitudes share one y axis: the smaller series flattens near zero. Plot them in separate charts when the gap is large.
- Keyboard navigation moves between dates; the announcement includes every series value for that date.

### Related

- [Time-based X axis](../usage.md#time-based-x-axis)
- [Area chart API](../api.md#createareachart)
- [Crosshair](../usage.md#crosshair)
- [Create a line chart](./line-chart.md)
