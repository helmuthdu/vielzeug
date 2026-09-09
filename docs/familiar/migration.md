---
title: Familiar Migration
---

# Familiar Migration

## 3.0

Familiar 3.0 narrows the package to typed module-worker pools and protocol/testing entry points. Familiar owns worker slots, queueing, cancellable batch composition, streaming, and teardown; application state owns domain task groups.

### Rename `batch()` to `runBatch()`

```diff
- import { batch } from '@vielzeug/familiar';
+ import { runBatch } from '@vielzeug/familiar';

- for await (const result of batch(pool, inputs, { signal })) {
+ for await (const result of runBatch(pool, inputs, { signal })) {
    consume(result);
  }
```

`runBatch()` preserves ordered progressive results, already-aborted signals, fail-fast sibling cancellation, early-exit cleanup, and complete settlement. Use `getTransferables(input, index)` when each task needs a distinct transfer list. See [Cancellable batch](./examples/cancellable-batch.md).

### Replace `createTaskGroup()` with an owned controller and task set

Create one `AbortController` at the application scope, pass its signal to each `pool.run()`, and retain task promises when settlement reporting is required:

```ts
const controller = new AbortController();
const tasks = new Set<Promise<Output>>();

function run(input: Input): Promise<Output> {
  const task = pool.run(input, { signal: controller.signal });
  tasks.add(task);
  void task.then(
    () => tasks.delete(task),
    () => tasks.delete(task),
  );
  return task;
}

const pending = inputs.map(run);
const outcomes = await Promise.allSettled(pending); // normal drain without cancellation

controller.abort(reason); // alternatively, cancel before normal settlement
await Promise.allSettled([...tasks]);
```

The final two lines illustrate cancellation as an alternative to awaiting normal settlement, not a required step after it.

`TaskGroup`, `TaskGroupOptions`, group `name`, `pending`, `size`, and `drain()` are removed. Store domain names and counters in the application state that owns them.

### Replace `prime()` with explicit work

`prime()` is removed because it only constructed Worker objects; it did not wait for module loading, protocol compatibility, or worker readiness. No generic warm-up operation replaces it. If startup latency matters, extend that worker's input protocol with an explicit warm-up task and await it.

### Validate timeout and queue options

Factory, run, stream, test-worker, and drain timeouts must be integer milliseconds from 1 through 2,147,483,647. `priority` must be finite, `onFull` must be `"reject"` or `"wait"`, and concurrency remains limited to 512 slots.

With `onFull: "wait"`, overflow calls wait for admission outside the bounded queue. `stats.queued` now includes both admitted queue entries and capacity waiters, and priority applies to both groups.

### Treat streams as one-shot

A value returned by `runStream()` can be consumed once. Consumption begins with the first iterator operation; unused iterators can be discarded, and `return()` immediately cancels pending chunk work. A second active iterator rejects with `FamiliarRuntimeError`. Caller abort listeners are installed only when iteration starts and removed when iteration settles. Worker chunks remain buffered in memory when producers outpace consumers; keep chunk sizes and production rates bounded.

### Handle stricter worker failures

Malformed responses, unexpected task chunks, worker `error`, and `messageerror` events reject active work with `FamiliarRuntimeError` and replace the slot. Task/stream registration mismatches now return a deterministic worker error instead of hanging. `onSlotError` failures cannot prevent task settlement.

### NodeNext declarations and stable errors

Root, protocol, and testing declarations now use explicit `.js` specifiers. Familiar error names remain stable in minified ESM and CJS artifacts.
