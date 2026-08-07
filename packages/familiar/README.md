# @vielzeug/familiar

> Typed module-worker pools with cancellation, priority scheduling, streaming, and test utilities.

`@vielzeug/familiar` runs typed work in ES module workers. Worker modules keep imports, source maps, and normal file boundaries intact.

## Installation

```sh
pnpm add @vielzeug/familiar
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

## Exports

- `createWorker()` creates a task pool backed by modules registered with `exposeTask()`.
- `createStreamWorker()` creates a stream-only pool backed by modules registered with `exposeStream()`.
- `batch()` and `createTaskGroup()` compose task-pool work without widening every pool handle.
- `createTestWorker()` provides structured-clone, timeout, cancellation, and error-wrapping parity for task-pool tests.
- `dispose()` stops work immediately; `drain()` waits for active work before teardown.

## Documentation

- [Overview](https://vielzeug.dev/familiar/)
- [Usage Guide](https://vielzeug.dev/familiar/usage)
- [API Reference](https://vielzeug.dev/familiar/api)
- [Examples](https://vielzeug.dev/familiar/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
