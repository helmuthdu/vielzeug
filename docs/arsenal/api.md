---
title: 'Arsenal: API Reference'
description: Reference for Arsenal root utilities and category entry points.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution | Common gotcha |
| --- | --- | --- | --- |
| `groupBy` | Group values by key (prototype-pollution guarded) | Sync | Root export |
| `chunk` / `zip` / `compact` | Typed collection transforms | Sync | Available from `/array` |
| `paginate` | Cut one page and its totals out of a list | Sync | Pages past the last return empty `items`, unclamped |
| `sort` | Sort by a selector, keyed fields, or ordered path criteria | Sync | Criteria paths are resolved safely; mixed value types throw |
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
| `compressBytes` / `decompressBytes` | Native byte compression with bounded decompression | Async | Requires native compression streams; decoding requires an output limit |
| `pack` / `unpack` | Versioned, compressed, URL-safe payload envelope | Async | Both sides bound the payload with `maxBytes`; compression falls back to raw |

## Package Entry Points

| Import | Purpose |
| --- | --- |
| `@vielzeug/arsenal` | Curated common utilities |
| `@vielzeug/arsenal/array` | Immutable transforms, pagination, set operations, sorting, fuzzy search |
| `@vielzeug/arsenal/async` | Retry, cancellation, task pool, timing |
| `@vielzeug/arsenal/cache` | In-memory cache and memoization |
| `@vielzeug/arsenal/encoding` | Base64url and native byte compression |
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

### paginate

```ts
paginate<T>(items: readonly T[], options?: PaginateOptions): PageEnvelope<T>
```

Cuts one page out of an in-memory list and returns the items with the arithmetic that produced them. `pageOffset` selects the caller's page base: `1` (default) for one-based paging, `0` for zero-based servers such as Spring. The default `page` is the first page in that base, and the default `pageSize` is `20`. `totalPages` is at least 1, even for an empty list, so `page < totalPages` never underflows. Pages past the last yield empty `items` and echo the requested page rather than clamping it. Throws `TypeError` for a non-array and `RangeError` when `page` is not an integer in the selected base or `pageSize` is not a positive integer.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | `number` | First page in `pageOffset`'s base | Requested page; must be an integer greater than or equal to `pageOffset` |
| `pageSize` | `number` | `20` | Number of items per page; must be a positive integer |
| `pageOffset` | `0 \| 1` | `1` | Page-number base: `0` for zero-based callers, `1` for one-based callers |

```ts
import { paginate } from '@vielzeug/arsenal/array';

paginate([1, 2, 3, 4, 5], { page: 2, pageSize: 2 });
// { items: [3, 4], page: 2, pageSize: 2, totalItems: 5, totalPages: 3 }

const springPage = 0;
paginate([1, 2, 3, 4, 5], { page: springPage, pageOffset: 0 });
// { items: [1, 2, 3, 4, 5], page: 0, pageSize: 20, totalItems: 5, totalPages: 1 }
```

The envelope is server-neutral: it models no HTTP dialect, so adapters map their response onto it and map it back out.

### sort

```ts
sort<T>(array: readonly T[], selector: (item: T) => unknown, direction?: SortDirection): T[];
sort<T>(array: readonly T[], selectors: SortSelectors<T>): T[];
sort<T>(array: readonly T[], criteria: ReadonlyArray<SortCriterion<T>>): T[];
```

Three forms, one entry point. The selector form sorts by one extracted value; the selectors form accepts an object mapping property keys to directions; the criteria form sorts by an ordered list of paths, which is the shape a data grid hands over when its sortable columns are runtime strings.

```ts
import { sort } from '@vielzeug/arsenal/array';

const users = [{ name: 'Ada', age: 41 }, { name: 'Grace', age: 30 }];
sort(users, (user) => user.name);
sort(users, { name: 'asc', age: 'desc' });

const rows = [
  { address: { city: 'Berlin' }, age: 41 },
  { address: { city: 'Aachen' }, age: 30 },
];
sort(rows, [{ key: 'address.city' }, { key: 'age', direction: 'desc' }]);
```

Criteria paths are resolved with `getPath`, so dotted and bracketed paths (`'address.city'`, `'tags[0]'`) work and prototype-access segments are refused. The first criterion that differs wins and earlier ties keep their input order. Ordering is delegated to `compare`, so a column that mixes value types (a number beside a string) throws a `TypeError` instead of guessing an order.

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

## Encoding

URL-safe base64 (`base64url`) codecs without `btoa`/`Buffer`, so the same code runs in browsers, workers, and Node.

```ts
import { base64UrlToBytes, base64UrlToText, bytesToBase64Url, textToBase64Url, utf8Bytes } from '@vielzeug/arsenal';

textToBase64Url('{"build":"hero"}'); // never contains '+', '/', or '='
base64UrlToText(textToBase64Url('League of Legends')); // round-trips any UTF-8 text
bytesToBase64Url(Uint8Array.from([0, 1, 250])); // byte-level codec for binary payloads
base64UrlToBytes(code); // throws on characters outside the alphabet
utf8Bytes('Hunter äöü'); // 11: byte length of a UTF-8 string
```

### compressBytes

```ts
compressBytes(bytes: Uint8Array, options?: CompressionOptions): Promise<Uint8Array>
```

Compresses bytes using the native `CompressionStream` API without modifying the input.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `format` | `CompressionFormat` | `'deflate-raw'` | Compression format; the receiver must use the same format |

**Returns:** Compressed bytes. Rejects with `ArsenalSerializationError` when the format or capability is unavailable, or stream processing fails. Does not fall back to another format.

**Example:** Encode compressed bytes for a URL.

```ts
import { bytesToBase64Url, compressBytes } from '@vielzeug/arsenal';

const bytes = new TextEncoder().encode(JSON.stringify({ name: 'Hunters' }));
const code = bytesToBase64Url(await compressBytes(bytes));
```

---

### decompressBytes

```ts
decompressBytes(bytes: Uint8Array, options: DecompressionOptions): Promise<Uint8Array>
```

Decompresses bytes using the native `DecompressionStream` API, enforcing the output limit while reading chunks.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `format` | `CompressionFormat` | `'deflate-raw'` | Format used by the sender |
| `maxOutputBytes` | `number` | Required | Non-negative safe integer; maximum decoded byte length |

**Returns:** Decompressed bytes. Rejects with `ArsenalSerializationError` for invalid limits, corrupt or truncated data, unavailable formats/capabilities, or output exceeding the limit. A failed stream is canceled and its reader lock released. Bound encoded input separately before calling this function.

**Example:** Decode text within an application-defined byte limit.

```ts
import { compressBytes, decompressBytes } from '@vielzeug/arsenal';

const compressed = await compressBytes(new TextEncoder().encode('Hunters'));
const bytes = await decompressBytes(compressed, { maxOutputBytes: 8192 });
const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
```

---

### pack

```ts
pack(payload: unknown, options: ShareCodeOptions): Promise<string>
```

Serializes `payload` as JSON and encodes it into a compact share code: `prefix` + mode marker + base64url bytes, compressed with raw DEFLATE when the compressed form is shorter and the runtime supports the streams.

| Option | Type | Meaning |
| --- | --- | --- |
| `maxBytes` | `number` | Positive safe integer; maximum serialized payload size |
| `prefix` | `string` | 1–8 alphanumeric characters identifying the code family and version |

**Returns:** The shorter of the raw (`prefix` + `r`) and compressed (`prefix` + `d`) representations. Throws `ShareCodeError` (`too-large`, `invalid`) for oversized payloads and misconfigured options.

**Example:** Encode a shareable build as a code small enough for a URL.

```ts
import { pack } from '@vielzeug/arsenal';

const code = await pack({ cards: ['slash', 'guard'] }, { maxBytes: 8192, prefix: 'ab1' });
```

---

### unpack

```ts
unpack(code: string, options: ShareCodeOptions): Promise<unknown>
```

Decodes a share code produced by `pack` with the same options. Both sides are bounded: input longer than `maxBytes` could carry is refused up front, streamed decompression stops at `maxBytes`, and non-canonical base64url is rejected by round-trip.

**Returns:** The parsed JSON payload. Throws `ShareCodeError` (`invalid` for foreign or malformed codes, `too-large` for budget overruns, `compression-unavailable` when a compressed code arrives on a runtime without `DecompressionStream`). Underlying compression failures surface as `ArsenalSerializationError`.

**Example:** Decode untrusted input within the byte budget.

```ts
import { unpack } from '@vielzeug/arsenal';

const payload = await unpack(code, { maxBytes: 8192, prefix: 'ab1' });
```

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

Distributes an amount proportionally across ratios. The indivisible remainder is applied to the last bucket so the sum equals the original amount exactly: critical for financial operations.

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

type PageEnvelope<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}>;

type PaginateOptions = Readonly<{
  page?: number;
  pageSize?: number;
  pageOffset?: 0 | 1;
}>;

type SortDirection = 'asc' | 'desc';

type SortSelectors<T> = Partial<Record<keyof T, SortDirection>>;

type SortCriterion<T> = Readonly<{
  key: keyof T | (string & {});
  direction?: SortDirection;
}>;

type CacheOptions = {
  capacity?: number;
  now?: () => number;
  ttlMs?: number;
};

interface CompressionOptions {
  format?: CompressionFormat;
}

interface DecompressionOptions extends CompressionOptions {
  maxOutputBytes: number;
}
```

## Errors

- `RangeError`: invalid numeric bounds, capacity, concurrency, or retry count.
- `TypeError`: invalid value types, unsupported comparison, or required path missing.
- `ArsenalSerializationError`: memo or hash cannot serialize supplied input; compression fails, is unavailable, receives an invalid output limit, or exceeds that limit. Stream failures retain the original error as `cause`.
- `ShareCodeError`: a share code cannot be encoded or decoded; the `reason` field is `invalid`, `too-large`, or `compression-unavailable`.
