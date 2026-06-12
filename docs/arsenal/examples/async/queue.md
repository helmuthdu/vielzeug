---
title: 'Arsenal Examples — queue'
description: 'queue example for @vielzeug/arsenal.'
---

## queue

### Problem

You have multiple async jobs that must not all run at once — for example uploads or API calls that must be serialized or bounded to avoid overload.

### Solution

Use `queue({ concurrency })` to create a shared job queue. `.add(fn)` enqueues a task and returns its promise. `.onIdle()` resolves when all enqueued tasks complete.

```ts
import { queue } from '@vielzeug/arsenal';

const q = queue({ concurrency: 2 });

const a = q.add(() => fetch('/api/a').then((r) => r.json()));
const b = q.add(() => fetch('/api/b').then((r) => r.json()));
const c = q.add(() => fetch('/api/c').then((r) => r.json()));

await q.onIdle(); // wait for all three to finish

const [dataA, dataB, dataC] = await Promise.all([a, b, c]);
```

#### Inspecting queue state

```ts
import { queue } from '@vielzeug/arsenal';

const q = queue({ concurrency: 1 });

q.add(() => sleep(100));
q.add(() => sleep(100));

q.active; // tasks currently running
q.pending; // tasks waiting to start
q.size; // active + pending

q.clear(); // discard pending tasks (running tasks continue)
```

### Pitfalls

- `concurrency` defaults to `1` (serial). Pass a value greater than `1` for bounded parallelism.
- `.clear()` discards pending tasks but does not cancel already-running ones.
- `.onIdle()` only resolves once — it does not re-arm if new tasks are added after the queue drains.

### Related

- [parallel](./parallel.md)
- [retry](./retry.md)
