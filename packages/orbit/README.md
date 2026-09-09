# @vielzeug/orbit

> Floating UI positioning with lifecycle-owned geometry and middleware

## Installation

```sh
pnpm add @vielzeug/orbit
npm install @vielzeug/orbit
yarn add @vielzeug/orbit
```

Install `@vielzeug/ripple` only when importing `@vielzeug/orbit/reactive`.

## Quick Start

```ts
import { createPositioner, flip, offset, shift } from '@vielzeug/orbit';

const positioner = createPositioner(trigger, tooltip, {
  middleware: [offset(8), flip(), shift({ padding: 6 })],
  placement: 'top',
});

positioner.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/orbit/)
- [Usage Guide](https://vielzeug.dev/orbit/usage)
- [API Reference](https://vielzeug.dev/orbit/api)
- [Examples](https://vielzeug.dev/orbit/examples)
- [Migration Guide](https://vielzeug.dev/orbit/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
