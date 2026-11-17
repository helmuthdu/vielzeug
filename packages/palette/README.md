# @vielzeug/palette

> Color parsing, conversion, mixing, and contrast for design tools

## Installation

```sh
pnpm add @vielzeug/palette
npm install @vielzeug/palette
yarn add @vielzeug/palette
```

## Quick Start

```ts
import { mix, parseColor, ramp, readableOn, toHex } from '@vielzeug/palette';

const brand = parseColor('#3366cc');
const surface = parseColor('rgb(248 250 252)');

const ink = readableOn(surface, [parseColor('#0f172a'), parseColor('#334155')]);
const midpoint = mix(brand, surface, 0.5); // linear-light interpolation
const shades = ramp(brand, { steps: 9 }); // OKLCH lightness ramp

console.log(toHex(ink ?? brand), toHex(midpoint), shades.map(toHex));
```

## Documentation

- [Overview](https://vielzeug.dev/palette/)
- [Usage Guide](https://vielzeug.dev/palette/usage)
- [API Reference](https://vielzeug.dev/palette/api)
- [Examples](https://vielzeug.dev/palette/examples)
- [Migration Guide](https://vielzeug.dev/palette/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
