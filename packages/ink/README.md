# @vielzeug/ink

> Causal stroke stabilization, smoothing, speed-based width profiling, and SVG path output

## Installation

```sh
pnpm add @vielzeug/ink
npm install @vielzeug/ink
yarn add @vielzeug/ink
```

## Quick Start

```ts
import { polylineToSvgPath, stabilizeStroke, strokeOutline, strokeWidths } from '@vielzeug/ink';

// Stamp samples with PointerEvent.timeStamp for speed-derived widths.
const samples = [
  { time: 0, x: 0, y: 0 },
  { time: 16, x: 12, y: 3 },
  { time: 32, x: 25, y: -2 },
  { time: 48, x: 40, y: 1 },
];

const stabilized = stabilizeStroke(samples);
const widths = strokeWidths(stabilized, { width: 6 });
const d = polylineToSvgPath(strokeOutline(stabilized, widths), { close: true });
```

## Features

- `stabilizeStroke()`: causal Streamline-style averaging for live drawing; the stroke ends where the pen lifted
- `smoothStroke()`: deterministic Catmull-Rom resampling after capture
- `strokeWidths()`: widths from real pen speed (`distance / Δtime`) with pressure modulation
- `strokeOutline()`: closed variable-width outline polygon with capped ends; constant width with a single number
- `simplifyStroke()`: Ramer-Douglas-Peucker decimation preserving endpoints
- `polylineToSvgPath()`: SVG `d` strings for strokes and closed rings, with configurable precision
- Pure functions, zero dependencies, no DOM requirement

## Documentation

- [Overview](https://vielzeug.dev/ink/)
- [Usage Guide](https://vielzeug.dev/ink/usage)
- [API Reference](https://vielzeug.dev/ink/api)
- [Examples](https://vielzeug.dev/ink/examples)
- [Migration Guide](https://vielzeug.dev/ink/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
