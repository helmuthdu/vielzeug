---
description: Thin, type-safe abstraction over Web Workers with task queuing, pooling, timeouts, and cancellation.
package: worker
category: workers
keywords: [web-workers, pool, concurrency, offload, background, threading, timeout]
related: [toolkit, ripple, relay]
exports: [createWorker, createTestWorker]
---

# /worker

> Thin, type-safe abstraction over Web Workers with task queuing, pooling, timeouts, and cancellation.

[![npm version](https://img.shields.io/npm/v//worker)](https://www.npmjs.com/package//worker) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/worker` &nbsp;·&nbsp; **Category:** Workers

**Key exports:** `createWorker`, `createTestWorker`

**When to use:** Thin, type-safe abstraction over Web Workers with task queuing, pooling, timeouts, and cancellation.

**Related:** [@vielzeug/toolkit](https://vielzeug.dev/toolkit/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/relay](https://vielzeug.dev/relay/)

</details>

`/worker` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /worker
npm install /worker
yarn add /worker
```

## Quick Start

```ts
import { createWorker } from '/worker';

const worker = createWorker<number[], number>((nums) => nums.reduce((sum, value) => sum + value, 0));

console.log(await worker.run([1, 2, 3, 4, 5])); // 15
worker.dispose();

const pool = createWorker<number, number>(
  function fib(n): number {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
  },
  { concurrency: 4, timeout: 5000 },
);

const results = await Promise.all([35, 36, 37, 38].map((n) => pool.run(n)));
pool.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/worker/)
- [Usage Guide](https://vielzeug.dev/worker/usage)
- [API Reference](https://vielzeug.dev/worker/api)
- [Examples](https://vielzeug.dev/worker/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
