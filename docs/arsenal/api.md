---
title: Arsenal — API Reference
description: Reference for Arsenal root utilities and category entry points.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `groupBy` | Group values by key (prototype-pollution guarded) | Sync | Root export |
| `chunk` / `zip` / `compact` | Typed collection transforms | Sync | Available from `/array` |
| `range` / `average` / `median` | Numeric generation and aggregation | Sync | Available from `/math` |
| `assert` | Assert and narrow a condition | Sync | Available from `/function` |
| `retry` | Retry async work | Async | Rethrows final error |
| `taskPool` | Bound concurrent tasks | Async | Available from `/async` |
| `cache` | In-memory identity-keyed cache | Async | Available from `/cache` |
| `fuzzyFilter` | Filter string or selected object fields | Sync | Object collections require `select` |
| `fuzzyScore` | Rank string or selected object fields | Sync | Object collections require `select` |
| `tryParseJson` | Preserve JSON syntax result | Sync | Returns `unknown` on success |
| `getPath` | Optional object lookup (safe-path guarded) | Sync | Available from `/object` |
| `allocate` | Lossless proportional distribution | Sync | Available from `/math` |
| `isEqual` | Structural equality | Sync | Root export |
| `hash` | Deterministic serialization for cache keys | Sync | Available from `/object` |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/arsenal` | Curated common utilities |
| `@vielzeug/arsenal/array` | Immutable transforms, set operations, sorting, fuzzy search |
| `@vielzeug/arsenal/async` | Retry, cancellation, task pool, timing |
| `@vielzeug/arsenal/cache` | In-memory cache and memoization |
| `@vielzeug/arsenal/function` | Assertions, composition, timing, teardown |
| `@vielzeug/arsenal/guards` | Type guards, predicate combinators, equality guards |
| `@vielzeug/arsenal/math` | Ranges, aggregation, statistics, interpolation, exact allocation |
| `@vielzeug/arsenal/object` | Paths, transforms, hash, JSON parse result |
| `@vielzeug/arsenal/random` | Cryptographic-entropy selection and shuffle |
| `@vielzeug/arsenal/string` | Unicode-aware case transforms and similarity |

## Array

### Typed transforms

```ts
chunk<T>(input: readonly T[], size?: number): T[][]
compact<T>(array: readonly T[]): Array<Exclude<T, false | '' | 0 | 0n | null | undefined>>
first<T>(array: readonly T[], fallback?: T): T | undefined
last<T>(array: readonly T[], fallback?: T): T | undefined
replace<T>(array: readonly T[], predicate: (value: T) => boolean, value: T): T[]
rotate<T>(array: readonly T[], positions: number, options?: { wrap?: boolean }): T[]
zip(...arrays): Array<tuple>
unzip(rows): tupleOfArrays
```

`take`, `takeLast`, `drop`, and `dropLast` return new arrays and normalize negative counts to zero. Set operations accept optional selectors for object identity.

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
  entries(): ReadonlyArray<readonly [K, T]>;
  get(key: K): T | undefined;
  set(key: K, value: T, options?: { ttlMs?: number }): void;
  getOrLoad(key: K, load: () => Promise<T>): Promise<T>;
  delete(key: K): boolean;
  clear(): void;
  readonly size: number;
}

cache<K, T>(options?: CacheOptions): Cache<K, T>
```

Keys use native `Map` identity. Expiry is lazy, evaluated by `get`, `getOrLoad`, `set`, and `entries`. `entries()` trims expired values and returns a new insertion-ordered snapshot without exposing internal storage. The `size` getter does not evict expired entries.

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

### hash

```ts
hash(value: unknown, options?: HashOptions): string
```

Produces a deterministic, order-independent serialization. Handles `Date`, `RegExp`, `Set`, `Map`, and `bigint`. Circular references produce a sentinel. Useful for stable cache keys.

---

## Math

### Numeric toolkit

```ts
range(stop: number): number[]
range(start: number, stop: number, step?: number): number[]
clamp(value: number, min?: number, max?: number): number
sum<T>(values: readonly T[], select?: (value: T) => number): number
average<T>(values: readonly T[], select?: (value: T) => number): number | undefined
median<T>(values: readonly T[], select?: (value: T) => number): number | undefined
variance<T>(values: readonly T[], select?: (value: T) => number): number
standardDeviation<T>(values: readonly T[], select?: (value: T) => number): number
```

`sum` and `average` reject non-finite values. `gcd` and `lcm` require safe integers. `linspace` requires finite bounds and a positive integer point count. `variance` and `standardDeviation` compute population statistics.

### allocate

```ts
allocate(amount: number, ratios: number[] | number): number[]
allocate(amount: bigint, ratios: number[] | number): bigint[]
```

Distributes an amount proportionally across ratios. The indivisible remainder is applied to the last bucket so the sum equals the original amount exactly — critical for financial operations.

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
