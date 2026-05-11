---
title: Toolkit — Usage Guide
description: Practical usage patterns for the current Toolkit API.
---

[[toc]]

## Basic Usage

### Named Imports (Recommended)

```ts
import { chunk, groupBy, indexBy, pick, retry } from '@vielzeug/toolkit';

const pages = chunk([1, 2, 3, 4, 5], 2);
const byRole = groupBy(users, (u) => u.role);
const byId = indexBy(users, (u) => u.id);
const user = pick({ id: 1, name: 'Alice', role: 'admin' }, ['id', 'name']);
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
import { filterMap, groupBy, indexBy, partition, sort, toggle, uniq, zip } from '@vielzeug/toolkit';

const values = [null, 1, 2, 3];

// filterMap maps values and skips undefined results
const mapped = filterMap(values, (n) => (n == null ? 0 : n * 2)); // [0, 2, 4, 6]

// return undefined to filter an item out
const filtered = filterMap(values, (n) => (n == null ? undefined : n)); // [1, 2, 3]

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

// newer helpers
const parts = partition([1, 2, 3, 4], (n) => n % 2 === 0); // [[2, 4], [1, 3]]
const zipped = zip(['a', 'b'], [1, 2]); // [['a', 1], ['b', 2]]
const byRole = groupBy([{ role: 'admin' }, { role: 'user' }], (item) => item.role);
const byId = indexBy([{ id: 1 }, { id: 2 }], (item) => item.id);
```

### Objects

```ts
import { deepMerge, diff, get, prune, parseJSON, seek, pick, omit, mapValues, shallowMerge } from '@vielzeug/toolkit';

const prev = { api: { host: 'localhost', port: 3000 } };
const curr = deepMerge(prev, { api: { port: 4000 } });
const shallow = shallowMerge(prev, { api: { port: 4000 } });

const changes = diff(prev, curr); // { api: { port: 4000 } }
const port = get(curr, 'api.port'); // 4000
const clean = prune({ a: 1, b: null, c: '' }); // { a: 1 }
const parsed = parseJSON('{"ok":true}', { defaultValue: { ok: false } });
const found = seek(curr, 'localhost', 0.6);

const publicUser = pick({ id: 1, name: 'Alice', password: 'secret' }, ['id', 'name']);
const internalUser = omit({ id: 1, name: 'Alice', password: 'secret' }, ['password']);
const renamed = mapValues({ a: 1, b: 2 }, (value) => value * 10);
```

### Functions

```ts
import { compose, debounce, memo, once, partial, pipe, throttle, negate, tap } from '@vielzeug/toolkit';

const doubleAll = partial((values: number[], factor: number) => values.map((n) => n * factor), 2);
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
const odds = [1, 2, 3, 4, 5].filter(negate((n: number) => n % 2 === 0));
const value = tap(42, (n) => console.log('debug', n));
```

### Async

```ts
import { attempt, parallel, queue, retry, sleep, waitFor, timeout, memoizeAsync } from '@vielzeug/toolkit';

const attempted = await attempt(async (signal) => {
  const res = await fetch('/api/user', { signal });
  return res.json();
}, { times: 2, timeout: 5_000 });

const values = await parallel(3, [1, 2, 3, 4], async (n) => n * 2);

const q = queue({ concurrency: 2 });
const a = q.add(() => fetch('/a').then((r) => r.text()));
const b = q.add(() => fetch('/b').then((r) => r.text()));
await q.onIdle();

await retry(() => fetch('/health').then((r) => r.json()), { times: 3, delay: 200 });
await sleep(100);
await waitFor(() => document.querySelector('#app') !== null, { timeout: 3_000 });

const fetchJSON = memoizeAsync((url: string) => fetch(url).then((r) => r.json()));
const payload = await timeout(fetchJSON('/api/profile'), 3_000);

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
import { debounce, filterMap } from '@vielzeug/toolkit';
import { useMemo } from 'react';

const visible = useMemo(() => filterMap(data, (item) => (item.hidden ? undefined : item)), [data]);
const onSearch = useMemo(() => debounce((q: string) => console.log(q), 250), []);
```

### Vue

```ts
import { computed, ref } from 'vue';
import { groupBy } from '@vielzeug/toolkit';

const users = ref<User[]>([]);
const byRole = computed(() => groupBy(users.value, (u) => u.role));
```

## Best Practices

- Prefer named imports from `@vielzeug/toolkit`.
- `pick` selects object properties only (`pick(obj, keys)`).
- Use `partial` when adapting multi-arg APIs to unary composition flows.
- For cancellation-aware async work, pass `AbortSignal` through your callback stack.
- Reactive list models moved to `@vielzeug/sourceit`.

## Performance Tips

- Reuse debounced/throttled functions instead of recreating them per render.
- Use `queue` for explicit concurrency and `parallel` for bounded fan-out processing.
- Prefer `is.match` for partial checks over repeated ad-hoc deep traversals.
