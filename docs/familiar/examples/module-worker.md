---
title: Module Worker
description: Load a worker from a real module file using createModuleWorker for import access and top-level await.
---

## Module Worker

### Problem

A task needs to `import` a heavy library, use top-level `await`, or organize helper functions across multiple module-scope variables. Inline workers (created with `createWorker`) serialize the entire task function as a string — they cannot reference imports or outer-scope bindings.

### Solution

Write the worker as a standalone ES module and load it with `createModuleWorker`.

```ts
// packages/app/src/workers/hash-worker.ts
import { PROTOCOL_VERSION } from '@vielzeug/familiar';
// Can also import any other ESM-compatible library here
// import { sha256 } from 'some-crypto-lib';

// Optional: log protocol version on startup for debugging skew
self.postMessage({ protocol: PROTOCOL_VERSION });

self.onmessage = async (event: MessageEvent) => {
  const { id, input, heartbeatInterval } = event.data as {
    id: number;
    input: { text: string };
    heartbeatInterval?: number;
  };

  // Send heartbeats if requested
  const hb = heartbeatInterval
    ? setInterval(() => self.postMessage({ id, heartbeat: true }), heartbeatInterval)
    : null;

  try {
    // Simulate work — replace with real computation
    const result = await Promise.resolve(input.text.length);
    self.postMessage({ id, result });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    self.postMessage({ id, error: { name: err.name, message: err.message, stack: err.stack } });
  } finally {
    if (hb) clearInterval(hb);
  }
};
```

```ts
// main.ts
import { createModuleWorker } from '@vielzeug/familiar';

const pool = createModuleWorker<{ text: string }, number>(
  new URL('./workers/hash-worker.ts', import.meta.url),
  { concurrency: 4, timeout: 5000 },
);

await pool.prime(); // pre-spawn all 4 slots

const length = await pool.run({ text: 'hello world' }); // 11
console.log('char count:', length);

pool.dispose();
```

- The `new URL('./...', import.meta.url)` pattern is correctly resolved by Vite, Webpack, and Rollup.
- The worker file runs as `{ type: 'module' }`, so all standard ESM features are available.

### Worker File Protocol

The message contract:

| Direction    | Shape |
| ------------ | ----- |
| Host → Worker | `{ id, input, stream?, heartbeatInterval? }` |
| Worker → Host (success) | `{ id, result }` |
| Worker → Host (error) | `{ id, error: { name, message, stack? } }` |
| Worker → Host (stream chunk) | `{ id, chunk }` |
| Worker → Host (stream end) | `{ id, result: undefined }` |
| Worker → Host (heartbeat) | `{ id, heartbeat: true }` |

### Pitfalls

- TypeScript must be configured to compile worker files as module workers (usually the same `tsconfig.json` suffices, but check your bundler config).
- If you use a relative `new URL` path, the worker must be in the same bundle chunk as the caller, or explicitly included in your bundler's output.
- `createTestWorker` runs tasks in-process and does not support module workers. Mock the underlying function directly in tests.

### Related

- [API Reference — createModuleWorker](../api.md#createmoduleworker)
- [Usage Guide — Module Workers](../usage.md#module-workers-createmoduleworker)
