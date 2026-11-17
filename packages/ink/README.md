# @vielzeug/ink

> Freehand stroke smoothing, width profiling, and SVG path output

## Installation

```sh
pnpm add @vielzeug/ink
npm install @vielzeug/ink
yarn add @vielzeug/ink
```

## Quick Start

```ts
import { smoothStroke, strokeOutline, strokeOutlineToSvgPath, strokeWidths } from '@vielzeug/ink';

const samples = [
  { x: 0, y: 0 },
  { x: 12, y: 3 },
  { x: 25, y: -2 },
  { x: 40, y: 1 },
];

const smoothed = smoothStroke(samples);
const widths = strokeWidths(smoothed, { baseWidth: 6 });
const d = strokeOutlineToSvgPath(strokeOutline(smoothed, widths));
```

## Features

- `smoothStroke()`: deterministic Catmull-Rom resampling or Streamline-style causal averaging
- `strokeWidths()`: velocity-derived widths with pressure modulation
- `strokeOutline()`: closed variable-width outline polygon with capped ends
- `simplifyStroke()`: Ramer-Douglas-Peucker decimation preserving endpoints
- `strokeToSvgPath()` / `strokeOutlineToSvgPath()`: SVG `d` strings with configurable precision
- Pure functions, zero dependencies, no DOM requirement

## Documentation

- [Overview](https://vielzeug.dev/ink/)
- [Usage Guide](https://vielzeug.dev/ink/usage)
- [API Reference](https://vielzeug.dev/ink/api)
- [Examples](https://vielzeug.dev/ink/examples)
- [Migration Guide](https://vielzeug.dev/ink/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
