# @vielzeug/familiar

> Typed Web Worker pools with queuing, priorities, streaming, heartbeat, and testing utilities.

[![npm version](https://img.shields.io/npm/v/@vielzeug/familiar)](https://www.npmjs.com/package/@vielzeug/familiar) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/familiar` &nbsp;·&nbsp; **Category:** Workers

**Key exports:** `createWorker`, `createModuleWorker`, `createTestWorker`

**When to use:** Typed Web Worker pools with task queuing, priorities, per-task timeouts, AbortSignal cancellation, streaming, heartbeat monitoring, and in-process testing.

**Related:** [@vielzeug/arsenal](https://vielzeug.dev/arsenal/) · [@vielzeug/ripple](https://vielzeug.dev/ripple/) · [@vielzeug/herald](https://vielzeug.dev/herald/)

</details>

`@vielzeug/familiar` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/familiar
npm install @vielzeug/familiar
yarn add @vielzeug/familiar
```

## Quick Start

```ts
import { createWorker } from '@vielzeug/familiar';

// Single worker — runs one task at a time
const worker = createWorker<number[], number>((nums) => nums.reduce((sum, n) => sum + n, 0));
console.log(await worker.run([1, 2, 3, 4, 5])); // 15
worker.dispose();

// Worker pool — 4 concurrent slots with a 5 s timeout
const pool = createWorker<number, number>(
  function fib(n) {
    return n <= 1 ? n : fib(n - 1) + fib(n - 2);
  },
  { concurrency: 4, timeout: 5000 },
);

const results = await Promise.all([35, 36, 37, 38].map((n) => pool.run(n)));
pool.dispose();

// Priority queue — higher values run first
await pool.run(heavyTask, { priority: 10 }); // runs before default-priority tasks

// Batch processing — yield results as they arrive
for await (const result of pool.batch([1, 2, 3, 4])) {
  console.log(result);
}

// Typed errors — instanceof checks for precise handling
import { FamiliarTimeoutError, FamiliarQueueFullError } from '@vielzeug/familiar';
try {
  await pool.run(input, { timeout: 100 });
} catch (err) {
  if (err instanceof FamiliarTimeoutError) console.error(`Timed out after ${err.timeoutMs}ms`);
  if (err instanceof FamiliarQueueFullError) console.error(`Queue full (max ${err.maxQueue})`);
}
```

## Documentation

- [Overview](https://vielzeug.dev/familiar/)
- [Usage Guide](https://vielzeug.dev/familiar/usage)
- [API Reference](https://vielzeug.dev/familiar/api)
- [Examples](https://vielzeug.dev/familiar/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
