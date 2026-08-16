---
title: Arsenal — API Reference
description: Reference for Arsenal root utilities and category entry points.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `chunk` | Split arrays or strings | Sync | Root export |
| `groupBy` | Group values by key | Sync | Root export |
| `retry` | Retry async work | Async | Rethrows final error |
| `taskPool` | Bound concurrent tasks | Async | Available from `/async` |
| `cache` | In-memory identity-keyed cache | Async | Available from `/cache` |
| `fuzzyFilter` | Filter string or selected object fields | Sync | Object collections require `select` |
| `fuzzyScore` | Rank string or selected object fields | Sync | Object collections require `select` |
| `tryParseJson` | Preserve JSON syntax result | Sync | Returns `unknown` on success |
| `getPath` | Optional object lookup | Sync | Available from `/object` |
| `clamp` | Bound number to range | Sync | Root export |
| `isEqual` | Structural equality | Sync | Root export |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/arsenal` | Curated common utilities |
| `@vielzeug/arsenal/array` | Array transforms, sorting, fuzzy search |
| `@vielzeug/arsenal/async` | Retry, cancellation, task pool, timing |
| `@vielzeug/arsenal/cache` | In-memory cache and memoization |
| `@vielzeug/arsenal/function` | Composition, timing, assertions |
| `@vielzeug/arsenal/guards` | Predicate and type guard helpers |
| `@vielzeug/arsenal/math` | Numeric and statistical helpers |
| `@vielzeug/arsenal/object` | Paths, transforms, hash, JSON parse result |
| `@vielzeug/arsenal/random` | Random selection and UUID helpers |
| `@vielzeug/arsenal/string` | Text transforms and similarity |

## Array

### fuzzyFilter / fuzzyScore

```ts
fuzzyFilter(strings: readonly string[], query: string, options?: FuzzyOptions): string[]
fuzzyFilter<T>(items: readonly T[], query: string, options: FuzzySelection<T>): T[]
fuzzyScore(strings: readonly string[], query: string, options?: FuzzyOptions): ScoredResult<string>[]
fuzzyScore<T>(items: readonly T[], query: string, options: FuzzySelection<T>): ScoredResult<T>[]
```

`fuzzyFilter` preserves input order. `fuzzyScore` orders results by descending score.

```ts
import { fuzzyFilter } from '@vielzeug/arsenal/array';

const users = [{ email: 'alice@example.com', name: 'Alice' }];
const matches = fuzzyFilter(users, 'alice', { select: (user) => [user.name, user.email] });
```

---

## Async

### taskPool

```ts
interface TaskPool {
  run<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T>;
  idle(): Promise<void>;
  dispose(reason?: unknown): void;
  readonly active: number;
  readonly pending: number;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
}

taskPool(options?: { concurrency?: number }): TaskPool
```

`dispose()` aborts running cooperative tasks and rejects pending tasks.

```ts
import { taskPool } from '@vielzeug/arsenal/async';

const pool = taskPool({ concurrency: 2 });
const user = await pool.run((signal) => fetch('/user', { signal }).then((response) => response.json()));
pool.dispose();
```

---

## Cache

### cache

```ts
interface Cache<K, T> {
  get(key: K): T | undefined;
  set(key: K, value: T, options?: { ttlMs?: number }): void;
  getOrLoad(key: K, load: () => Promise<T>): Promise<T>;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
}

cache<K, T>(options?: CacheOptions): Cache<K, T>
```

Keys use native `Map` identity. Expiry is lazy, evaluated by `get` and `getOrLoad`. The `size` getter returns the live entry count without evicting.

```ts
import { cache } from '@vielzeug/arsenal/cache';

const profiles = cache<string, Profile>({ ttlMs: 60_000 });
const profile = await profiles.getOrLoad('me', loadProfile);
```

---

## Object

### tryParseJson

```ts
type JsonParseResult = { ok: true; value: unknown } | { error: SyntaxError; ok: false };

tryParseJson(text: string): JsonParseResult
```

Use a schema validator after success to refine `unknown` data.

```ts
import { tryParseJson } from '@vielzeug/arsenal/object';

const result = tryParseJson(raw);
if (!result.ok) throw result.error;
```

### getPath

```ts
getPath<T extends Record<string, unknown>, P extends string>(item: T, path: P): PathValue<T, P> | undefined
getPathOr<T extends Record<string, unknown>, P extends string, F>(item: T, path: P, fallback: F): PathValue<T, P> | F
requirePath<T extends Record<string, unknown>, P extends string>(item: T, path: P): Exclude<PathValue<T, P>, undefined>
```

## Types

```ts
type FuzzyOptions = {
  normalize?: boolean;
  threshold?: number;
};

type FuzzySelection<T> = FuzzyOptions & {
  select: (item: T) => string | readonly string[];
};

type ScoredResult<T> = { item: T; score: number };

type CacheOptions = {
  capacity?: number;
  now?: () => number;
  ttlMs?: number;
};
```

## Errors

- `RangeError` — invalid numeric bounds, capacity, concurrency, or retry count.
- `TypeError` — invalid value types, unsupported comparison, or required path missing.
- `ArsenalSerializationError` — memo or hash cannot serialize supplied input.
