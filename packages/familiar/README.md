# @vielzeug/familiar

> Web Worker pool with tasks, timeouts, cancellation

## Installation

```sh
pnpm add @vielzeug/familiar
npm install @vielzeug/familiar
yarn add @vielzeug/familiar
```

## Quick Start

```ts
// sum.worker.ts
import { exposeTask } from '@vielzeug/familiar/protocol';

exposeTask((values: number[]) => values.reduce((total, value) => total + value, 0));
```

```ts
// main.ts
import { createWorker } from '@vielzeug/familiar';

const pool = createWorker<number[], number>(new URL('./sum.worker.ts', import.meta.url), {
  concurrency: 2,
  timeout: 5_000,
});

try {
  console.log(await pool.run([1, 2, 3]));
} finally {
  pool.dispose();
}
```

## Documentation

- [Overview](https://vielzeug.dev/familiar/)
- [Usage Guide](https://vielzeug.dev/familiar/usage)
- [API Reference](https://vielzeug.dev/familiar/api)
- [Examples](https://vielzeug.dev/familiar/examples)
- [Migration Guide](https://vielzeug.dev/familiar/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
