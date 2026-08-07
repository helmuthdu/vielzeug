---
title: Familiar — Typed module-worker pools
description: Typed ES module Worker pools with cancellation, priority scheduling, streaming, and test utilities.
package: familiar
category: workers
keywords: [web-workers, module-workers, pool, concurrency, timeout, cancellation, streaming]
related: [arsenal, ripple, herald]
exports: [createWorker, createStreamWorker, batch, createTaskGroup, FamiliarError, FamiliarTimeoutError, FamiliarTaskError, FamiliarQueueFullError, FamiliarTerminatedError, FamiliarRuntimeError]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="familiar" />

## Why Familiar?

Raw workers force every application to maintain its own message contract, lifecycle, cancellation, and pool scheduler. Familiar provides those boundaries while keeping worker code in normal typed ES modules.

```ts
// Before
const worker = new Worker(new URL('./sum.worker.ts', import.meta.url), { type: 'module' });
worker.postMessage([1, 2, 3]);

// After
const pool = createWorker<number[], number>(new URL('./sum.worker.ts', import.meta.url));
await pool.run([1, 2, 3]);
```

| Feature | Familiar | Raw Worker | Comlink |
| --- | --- | --- | --- |
| Bundle size | <PackageInfo package="familiar" type="size" /> | built-in | ~2 kB |
| Module-worker contract | <ore-icon name="check" size="16"></ore-icon> | manual | <ore-icon name="check" size="16"></ore-icon> |
| Pool scheduling | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |
| AbortSignal cancellation | <ore-icon name="check" size="16"></ore-icon> | manual | manual |
| Versioned protocol | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> | implementation-specific |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon> |

<div class="decision-callout">

**Use Familiar when** worker jobs need bounded concurrency, typed errors, cancellation, or queue policy.

**Consider raw Worker when** one isolated worker and custom messaging are enough.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/familiar
```

```sh [npm]
npm install @vielzeug/familiar
```

```sh [yarn]
yarn add @vielzeug/familiar
```

:::

## Quick Start

Register task logic inside a worker module.

```ts
// double.worker.ts
import { exposeTask } from '@vielzeug/familiar/protocol';

exposeTask((value: number) => value * 2);
```

Create pool from module URL and dispose it after use.

```ts
import { createWorker } from '@vielzeug/familiar';

const worker = createWorker<number, number>(new URL('./double.worker.ts', import.meta.url));

try {
  console.log(await worker.run(21));
} finally {
  worker.dispose();
}
```

## Features

<div class="features-grid">

- `createWorker()` — versioned task protocol over ES module workers
- `createStreamWorker()` — stream-only worker capability
- `run()` — priority scheduling, transferables, timeout, and cancellation
- `batch()` — ordered task composition
- `createTaskGroup()` — shared cancellation and settlement tracking
- `stats` — active, queued, completed, and failed counters
- `createTestWorker()` — faithful in-process task-pool testing
- `dispose()` and `drain()` — immediate or draining teardown, with `using` support

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Arsenal](/arsenal/) — async helpers for application coordination.
- [Ripple](/ripple/) — expose worker results through reactive state.
- [Herald](/herald/) — publish application events after worker jobs settle.

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
