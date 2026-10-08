# @vielzeug/prism

> Responsive SVG charts with explicit updates: line, bar, area, pie, radar, sparkline

## Installation

```sh
pnpm add @vielzeug/prism
npm install @vielzeug/prism
yarn add @vielzeug/prism
```

## Quick Start

```ts
import { createLineChart } from '@vielzeug/prism';
import '@vielzeug/prism/theme.css';

const host = document.createElement('div');
host.style.cssText = 'width:640px;height:320px';
document.body.append(host);

const chart = createLineChart(host, {
  a11y: { ariaLabel: 'Revenue by month' },
  series: [{
    color: '#3b82f6',
    data: [{ key: 1, value: 10 }, { key: 2, value: 25 }, { key: 3, value: 18 }, { key: 4, value: 32 }],
    name: 'Revenue',
  }],
  tooltip: true,
});

chart.update([{
  color: '#3b82f6',
  data: [{ key: 1, value: 10 }, { key: 2, value: 25 }, { key: 3, value: 18 }, { key: 4, value: 32 }, { key: 5, value: 28 }],
  name: 'Revenue',
}]);

chart.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/prism/)
- [Usage Guide](https://vielzeug.dev/prism/usage)
- [API Reference](https://vielzeug.dev/prism/api)
- [Examples](https://vielzeug.dev/prism/examples)
- [Migration Guide](https://vielzeug.dev/prism/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
