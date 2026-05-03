---
title: Toolkit — Usage Guide
description: Practical usage patterns for the current Toolkit API.
---

[[toc]]

## Basic Usage

### Named Imports (Recommended)

```ts
import { chunk, group, retry } from '@vielzeug/toolkit';

const pages = chunk([1, 2, 3, 4, 5], 2);
const byRole = group(users, (u) => u.role);
const result = await retry(() => fetch('/api').then((r) => r.json()), { times: 2 });
```

### Namespace Import (Avoid)

```ts
// Avoid: imports everything and weakens tree-shaking
import * as toolkit from '@vielzeug/toolkit';
```

## Common Patterns

### Arrays

```ts
import { select, sort, toggle, uniq, list } from '@vielzeug/toolkit';

const values = [null, 1, 2, 3];

// select now maps all items unless you pass a predicate
const mapped = select(values, (n) => n == null ? 0 : n * 2); // [0, 2, 4, 6]

// pass predicate when you want filtering
const filtered = select(values, (n) => n!, (n) => n != null); // [1, 2, 3]

const sorted = sort(
  [
    { age: 30, name: 'Bob' },
    { age: 30, name: 'Alice' },
    { age: 25, name: 'Chris' },
  ],
  { age: 'desc', name: 'asc' },
);

const tags = toggle(['ts', 'node'], 'ts'); // ['node']
const deduped = uniq([1, 1, 2, 3]); // [1, 2, 3]

const pager = list(data, { limit: 10 });
pager.search('alice', { immediate: true });
```

### Objects

```ts
import { merge, diff, get, prune, parseJSON, seek } from '@vielzeug/toolkit';

const prev = { api: { host: 'localhost', port: 3000 } };
const curr = merge('deep', prev, { api: { port: 4000 } });

const changes = diff(prev, curr); // { api: { port: 4000 } }
const port = get(curr, 'api.port'); // 4000
const clean = prune({ a: 1, b: null, c: '' }); // { a: 1 }
const parsed = parseJSON('{"ok":true}', { defaultValue: { ok: false } });
const found = seek(curr, 'localhost', 0.6);
```

### Functions

```ts
import { configure, compose, debounce, memo, once, pipe, throttle } from '@vielzeug/toolkit';
import { select } from '@vielzeug/toolkit';

const doubleAll = configure(select, (n: number) => n * 2);
const doubled = doubleAll([1, 2, 3]); // [2, 4, 6]

const toUpperTrimmed = pipe(
  (s: string) => s.trim(),
  (s) => s.toUpperCase(),
);

const toUpperTrimmedRtl = compose(
  (s: string) => s.toUpperCase(),
  (s: string) => s.trim(),
);

const loadOnce = once(() => initApp());
const expensive = memo((a: number, b: number) => a * b);
const onInput = debounce((q: string) => console.log(q), 300);
const onScroll = throttle(() => console.log(window.scrollY), 100);
```

### Async

```ts
import { attempt, parallel, queue, race, retry, sleep, waitFor } from '@vielzeug/toolkit';

const attempted = await attempt(async (signal) => {
  const res = await fetch('/api/user', { signal });
  return res.json();
}, { times: 2, timeout: 5_000 });

const values = await parallel(3, [1, 2, 3, 4], async (n) => n * 2);

const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/a').then((r) => r.text()));
const b = q.add(() => fetch('/b').then((r) => r.text()));
await q.onIdle();

await race(fetch('/fast').then((r) => r.text()), 250);
await retry(() => fetch('/health').then((r) => r.json()), { times: 3, delay: 200 });
await sleep(100);
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

await Promise.all([a, b]);
```

### Typed Namespace

```ts
import { is } from '@vielzeug/toolkit';

function normalize(input: unknown) {
  if (is.string(input)) return input.trim();
  if (is.number(input)) return String(input);
  if (is.array(input)) return input.length;
  if (is.nil(input)) return null;
  return input;
}

is.equal({ a: 1 }, { a: 1 }); // true
is.match({ a: 1, b: 2 }, { a: 1 }); // true
is.typeOf(new Date()); // 'date'
```

## Advanced Usage

### Scheduler + Queue

```ts
import { Scheduler, queue } from '@vielzeug/toolkit';

const scheduler = new Scheduler();
const q = queue({ concurrency: 1 });

void scheduler.postTask(() => q.add(() => fetch('/refresh')), {
  delay: 10_000,
  priority: 'background',
});
```

### Cache via stash

```ts
import { stash } from '@vielzeug/toolkit';

const cache = stash<string>({
  hash: (key) => JSON.stringify(key),
});

cache.set(['user', 1], 'Alice', { ttlMs: 5_000 });
const value = cache.get(['user', 1]);
```

## Framework Integration

### React

```tsx
import { debounce, list } from '@vielzeug/toolkit';
import { useMemo } from 'react';

const pager = useMemo(() => list(data, { limit: 20 }), [data]);
const onSearch = useMemo(() => debounce((q: string) => pager.search(q), 250), [pager]);
```

### Vue

```ts
import { computed, ref } from 'vue';
import { group } from '@vielzeug/toolkit';

const users = ref<User[]>([]);
const byRole = computed(() => group(users.value, (u) => u.role));
```

## Best Practices

- Prefer named imports from `@vielzeug/toolkit`.
- Use `configure` when adapting multi-arg APIs to unary composition flows.
- For cancellation-aware async work, pass `AbortSignal` through your callback stack.
- Keep `list` and `remoteList` updates batched when mutating multiple controls.

## Performance Tips

- Reuse debounced/throttled functions instead of recreating them per render.
- Use `queue` for explicit concurrency and `parallel` for bounded fan-out processing.
- Prefer `is.match` for partial checks over repeated ad-hoc deep traversals.
