# @vielzeug/coins

> Currency formatting and exchange utilities for monetary arithmetic

## Installation

```sh
pnpm add @vielzeug/coins
npm install @vielzeug/coins
yarn add @vielzeug/coins
```

## Quick Start

```ts
import { USD, add, money, toDecimal } from '@vielzeug/coins';

const subtotal = add(money('12.50', USD), money('7.25', USD));

console.log(toDecimal(subtotal)); // '19.75'
```

## Documentation

- [Overview](https://vielzeug.dev/coins/)
- [Usage Guide](https://vielzeug.dev/coins/usage)
- [API Reference](https://vielzeug.dev/coins/api)
- [Examples](https://vielzeug.dev/coins/examples)
- [Migration Guide](https://vielzeug.dev/coins/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
