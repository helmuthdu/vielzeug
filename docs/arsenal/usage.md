---
title: Arsenal — Usage Guide
description: Use Arsenal root utilities for common work and category entry points for specialized collection, async, cache, object, and string behavior.
---

[[toc]]

## Basic Usage

Start at package root for common transforms. Move to a category entry point when code needs specialized behavior. This keeps imports readable and bundles focused.

```ts
import { chunk, groupBy, retry } from '@vielzeug/arsenal';

const users = [
  { id: 'a1', role: 'admin' },
  { id: 'u1', role: 'user' },
  { id: 'u2', role: 'user' },
];

const pages = chunk(users, 2);
const byRole = groupBy(users, (user) => user.role);
const health = await retry(() => fetch('/health').then((response) => response.json()));

console.log(pages, byRole, health);
```

Use category imports for APIs absent from root:

```ts
import { fuzzyFilter } from '@vielzeug/arsenal/array';
import { taskPool } from '@vielzeug/arsenal/async';
import { cache } from '@vielzeug/arsenal/cache';
import { tryParseJson } from '@vielzeug/arsenal/object';
```

## Transform Collections

Use `/array` for transforms that preserve input immutability. `filterMap` combines mapping and omission; `indexBy` and `groupBy` build lookup structures without mutation.

```ts
import { filterMap, indexBy, sort } from '@vielzeug/arsenal/array';

const products = [
  { id: 'p1', price: 20, published: true },
  { id: 'p2', price: 10, published: false },
  { id: 'p3', price: 15, published: true },
];

const publishedLabels = filterMap(products, (product) => (product.published ? `${product.id}: ${product.price}` : undefined));
const byId = indexBy(products, (product) => product.id);
const byPrice = sort(products, (product) => product.price);

console.log(publishedLabels, byId, byPrice);
```

## Search Explicit Fields

Search string arrays directly. Object collections require `select`, so callers define exactly what can match.

```ts
import { fuzzyFilter, fuzzyScore } from '@vielzeug/arsenal/array';

const users = [
  { email: 'alice@example.com', name: 'Alice' },
  { email: 'bob@example.com', name: 'Bob' },
];

const matches = fuzzyFilter(users, 'alice', { select: (user) => [user.name, user.email] });
const ranked = fuzzyScore(users, 'ali', { select: (user) => user.name });
```

## Work with Object Data

Use `/object` for paths, key selection, stable cache keys, and object transforms.

```ts
import { getPathOr, hash, omit, pick } from '@vielzeug/arsenal/object';

const config = { api: { host: 'localhost', port: 3000 }, debug: true };
const port = getPathOr(config, 'api.port', 8080);
const publicConfig = pick(config, ['api']);
const productionConfig = omit(config, ['debug']);
const key = hash({ port, productionConfig });

console.log(publicConfig, key);
```

## Parse and Validate JSON

`tryParseJson` distinguishes syntax failure from schema failure. Treat successful values as `unknown`, then validate with Spell or application code.

```ts
import { tryParseJson } from '@vielzeug/arsenal/object';
import { s } from '@vielzeug/spell';

const User = s.object({ id: s.string(), name: s.string() });
const parsed = tryParseJson(raw);

if (!parsed.ok) throw parsed.error;

const user = User.parse(parsed.value);
```

## Bound Concurrent Work

Use `parallel` for one finite collection. Use `taskPool` when tasks arrive over time or need disposal.

```ts
import { parallel, taskPool } from '@vielzeug/arsenal/async';

const metadata = await parallel(urls, (url) => fetch(url).then((response) => response.json()), { limit: 4 });

const pool = taskPool({ concurrency: 2 });
const profile = await pool.run((signal) => fetch('/profile', { signal }).then((response) => response.json()));

await pool.idle();
pool.dispose();

console.log(metadata, profile);
```

## Cache Loaded Values

Use `cache` for process-local values. Keys retain native `Map` identity. `getOrLoad` deduplicates concurrent loads for one key.

```ts
import { cache } from '@vielzeug/arsenal/cache';

type Profile = { id: string; name: string };

const profiles = cache<string, Profile>({ capacity: 100, ttlMs: 60_000 });
const profile = await profiles.getOrLoad('me', () => fetch('/profile').then((response) => response.json()));

profiles.delete('me');
const freshProfile = await profiles.getOrLoad('me', () => fetch('/profile').then((response) => response.json()));

console.log(profile, freshProfile);
```

## Test Deterministic Randomness

Random helpers use cryptographic entropy by default. Pass `RandomSource` in tests when output must be deterministic.

```ts
import { random, type RandomSource } from '@vielzeug/arsenal/random';

const source: RandomSource = { next: () => 0.5 };

random(1, 4, source); // 3
```

## Working with Other Vielzeug Libraries

Use Spell after `tryParseJson` for typed external data. Use Vault instead of `cache` when data must survive reloads or process restart.

```ts
import { tryParseJson } from '@vielzeug/arsenal/object';
import { s } from '@vielzeug/spell';

const Settings = s.object({ theme: s.string() });
const parsed = tryParseJson(rawSettings);
const settings = parsed.ok ? Settings.parse(parsed.value) : { theme: 'system' };
```

## Best Practices

- Import common transforms from package root.
- Import specialized APIs from category entry points.
- Pass `select` for every fuzzy search over objects.
- Validate parsed JSON before using it as application data.
- Use `parallel` for finite batches and `taskPool` for ongoing work.
- Dispose task pools when their owner ends.
- Use `cache` only for in-memory data.
- Inject `RandomSource` in deterministic tests.
