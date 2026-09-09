# @vielzeug/prism

> Responsive SVG charts with explicit updates — line, bar, area, pie, sparkline

## Installation

```sh
pnpm add @vielzeug/prism
npm install @vielzeug/prism
yarn add @vielzeug/prism
```

## Quick Start

```ts
import { createLineChart, setTheme } from '@vielzeug/prism';
import '@vielzeug/prism/theme';

// Optional: apply a custom color palette at startup
setTheme({ colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981'] });

let series = [
  {
    color: '#3b82f6',
    data: [
      { key: 1, value: 10 },
      { key: 2, value: 25 },
      { key: 3, value: 18 },
      { key: 4, value: 32 },
    ],
    name: 'Revenue',
  },
];

const chart = createLineChart(document.getElementById('chart')!, {
  a11y: { ariaLabel: 'Revenue by month' },
  series,
  xAxis: { position: 'bottom' },
  yAxis: { position: 'left', grid: true },
  tooltip: true,
  crosshair: true,
  onHover: (event) => console.log(event?.datum),
});

// Replace data explicitly when application state changes
series = [{ ...series[0]!, data: [...series[0]!.data, { key: 5, value: 28 }] }];
chart.update(series);

// Cleanup (also works with TC39 `using` declarations)
chart.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/prism/)
- [Usage Guide](https://vielzeug.dev/prism/usage)
- [API Reference](https://vielzeug.dev/prism/api)
- [Examples](https://vielzeug.dev/prism/examples)
- [Migration Guide](https://vielzeug.dev/prism/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
