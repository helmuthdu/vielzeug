<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~0.5KB-success" alt="Size">
</div>

# Scheduler / polyfillScheduler

`Scheduler` is a lightweight wrapper around the [Prioritized Task Scheduling API](https://developer.mozilla.org/en-US/docs/Web/API/Prioritized_Task_Scheduling_API). It guarantees a stable `postTask` API in all environments by installing a small polyfill when the native API is not available.

`polyfillScheduler` allows explicit opt-in installation of the polyfill on `globalThis`.

## Signature

```typescript
class Scheduler {
  constructor();
  postTask<T>(
    callback: () => T | PromiseLike<T>,
    options?: {
      delay?: number;
      priority?: TaskPriority;
      signal?: AbortSignal;
    },
  ): Promise<T>;
}

type TaskPriority = 'background' | 'user-blocking' | 'user-visible';

function polyfillScheduler(): void;
```

## Parameters — `postTask`

| Option       | Type           | Default         | Description                                                                                     |
| ------------ | -------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `delay`      | `number`       | `0`             | Milliseconds to wait before running the callback                                                |
| `priority`   | `TaskPriority` | `'user-visible'` | Scheduling hint: `'background'` runs after other work, `'user-blocking'` runs as soon as possible |
| `signal`     | `AbortSignal`  | —               | Cancel the task; the returned promise rejects with the signal's `reason`                        |

## Returns

A `Promise` that resolves with the callback's return value, or rejects if the signal is aborted.

## Examples

### Basic Delayed Task

```typescript
import { Scheduler } from '@vielzeug/toolkit';

const scheduler = new Scheduler();
await scheduler.postTask(() => console.log('hello'), { delay: 100 });
```

### Background Priority Task

Use `'background'` priority to defer low-urgency work (e.g. analytics, cache cleanup) until the browser is idle. In native environments this defers to the scheduler; in the polyfill it uses `setTimeout`.

```typescript
import { Scheduler } from '@vielzeug/toolkit';

const scheduler = new Scheduler();

await scheduler.postTask(
  () => {
    pruneOldCacheEntries();
  },
  {
    delay: 5 * 60_000, // run after 5 minutes of inactivity
    priority: 'background',
  },
);
```

### Cancellable Task

```typescript
import { Scheduler } from '@vielzeug/toolkit';

const scheduler = new Scheduler();
const controller = new AbortController();

const taskPromise = scheduler
  .postTask(() => heavyComputation(), {
    delay: 1000,
    priority: 'background',
    signal: controller.signal,
  })
  .catch(() => {
    // AbortError — task was cancelled
  });

// Cancel before the delay elapses
controller.abort();
await taskPromise;
```

### Explicit Polyfill Installation

Call `polyfillScheduler()` once at your app's entry point to ensure `globalThis.scheduler` is available. It is safe to call multiple times — it only installs if not already present.

```typescript
import { polyfillScheduler } from '@vielzeug/toolkit';

polyfillScheduler();

// globalThis.scheduler is now guaranteed to exist
await globalThis.scheduler.postTask(() => doWork(), { priority: 'background' });
```

### Using `Scheduler` in a Library

`new Scheduler()` is the recommended approach when writing a library — it installs the polyfill just-in-time without touching `globalThis` until the first constructor call.

```typescript
import { Scheduler } from '@vielzeug/toolkit';

export function scheduleCleanup(fn: () => void, delayMs: number, signal: AbortSignal): void {
  const scheduler = new Scheduler();

  void scheduler
    .postTask(fn, { delay: delayMs, priority: 'background', signal })
    .catch(() => {
      // expected when cancelled
    });
}
```

## Polyfill Behaviour

The polyfill faithfully implements the `delay` and `signal` options using `setTimeout`. The `priority` hint is accepted but not enforced — all tasks are scheduled with the same effective priority as `setTimeout`. In native environments the browser enforces `'background'` (runs during idle time) and `'user-blocking'` (runs before rendering).

## Related

- [sleep](./sleep.md) – Simple promise-based delay
- [waitFor](./waitFor.md) – Poll a condition until true

