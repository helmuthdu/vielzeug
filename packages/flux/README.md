# @vielzeug/flux

> Minimal push streams with explicit ownership, bounded buffering, and structural bridges

## Installation

```sh
pnpm add @vielzeug/flux
npm install @vielzeug/flux
yarn add @vielzeug/flux
```

## Quick Start

```ts
import { toArray, interval, map, pipe, take } from '@vielzeug/flux';

const values = pipe(
  interval(100),
  map((value) => value * 2),
  take(3),
);

console.log(await toArray(values, { maxItems: 3 })); // [0, 2, 4]
```

## Documentation

- [Overview](https://vielzeug.dev/flux/)
- [Usage Guide](https://vielzeug.dev/flux/usage)
- [API Reference](https://vielzeug.dev/flux/api)
- [Examples](https://vielzeug.dev/flux/examples)
- [Migration Guide](https://vielzeug.dev/flux/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
