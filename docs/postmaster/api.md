---
title: Postmaster — API Reference
description: Job definitions, processor, store contracts, events, errors, and entry points for Postmaster.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `defineJobs()` | Typed job registry with validation | Sync | Throws on invalid version, missing fields, or bad retry config |
| `createPostmaster()` | Processor with leased claims and retry | Sync | Store is borrowed, not disposed with the processor |
| `createIndexedDbPostmasterStore()` | Durable browser store | Sync | Requires `@vielzeug/vault` as a workspace peer |
| `createMemoryPostmasterStore()` | Deterministic in-memory store | Sync | Use for tests only |
| `PostmasterError` | Base class for package errors | Sync | Catch a subtype when recovery is specific |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/postmaster` | Job definitions, processor, store contract, events, errors |
| `@vielzeug/postmaster/indexeddb` | Durable browser store backed by Vault IndexedDB |
| `@vielzeug/postmaster/testing` | Deterministic in-memory store and test helpers |

## Factories

### `defineJobs()`

```ts
function defineJobs<const J extends JobDefinitions>(jobs: J): J;
```

Returns the job registry after validating each definition. Rejects invalid versions, missing `execute`/`key`, and retry configurations with non-positive `maxAttempts`.

| Parameter | Type | Description |
| --- | --- | --- |
| `jobs` | `J extends JobDefinitions` | Map of job name to definition |

**Returns:** `J` — the same registry, typed for payload inference.

**Example**

```ts
import { defineJobs } from '@vielzeug/postmaster';

const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: (v) => v as { id: string; title: string },
    key: (p) => p.id,
    execute: async (payload, { key, signal }) => {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Idempotency-Key': key },
        signal,
      });
    },
  },
});
```

---

### `createPostmaster()`

```ts
function createPostmaster<J extends JobDefinitions>(options: CreatePostmasterOptions<J>): Postmaster<J>;
```

Returns a Postmaster processor that claims, executes, retries, and dead-letters jobs from the borrowed store.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.jobs` | `J` | Job registry from `defineJobs()` |
| `options.store` | `PostmasterStore` | Borrowed store; not disposed with the processor |
| `options.leaseDuration` | `number` | Lease duration in ms (default 30000, minimum 1000) |
| `options.clock` | `() => number` | Deterministic clock for tests (default `Date.now`) |
| `options.signal` | `AbortSignal` | External signal that disposes the processor |

**Returns:** `Postmaster<J>`.

**Example**

```ts
import { createPostmaster } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const store = createIndexedDbPostmasterStore({ name: 'outbox' });
const postmaster = createPostmaster({ jobs, store });

await postmaster.start();
await postmaster.dispose();
await store.dispose();
```

---

### `createIndexedDbPostmasterStore()`

```ts
function createIndexedDbPostmasterStore(options: { name: string }): PostmasterStore;
```

Returns a durable Postmaster store backed by Vault IndexedDB. Uses one internal table indexed by `status`, `availableAt`, and `leaseExpiresAt`. All operations run inside Vault transactions.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.name` | `string` | IndexedDB database name |

**Returns:** `PostmasterStore`.

**Example**

```ts
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const store = createIndexedDbPostmasterStore({ name: 'my-app-outbox' });
await store.dispose();
```

---

### `createMemoryPostmasterStore()`

```ts
function createMemoryPostmasterStore(entries?: readonly StoredJob[]): PostmasterStore;
```

Returns a deterministic in-memory store for tests. Serializes all operations through a promise chain.

| Parameter | Type | Description |
| --- | --- | --- |
| `entries` | `readonly StoredJob[]` | Initial records (default empty) |

**Returns:** `PostmasterStore`.

**Example**

```ts
import { createMemoryPostmasterStore } from '@vielzeug/postmaster/testing';

const store = createMemoryPostmasterStore();
await store.dispose();
```

## Postmaster Methods

### `enqueue()`

```ts
enqueue<K extends keyof J & string>(name: K, payload: InferJobPayload<J[K]>): Promise<PostmasterEntry>;
```

Validates the payload (if `validate` is defined), derives the key, persists the job, and wakes the processor. Throws `PostmasterError` for an empty key or non-JSON-serializable payload.

---

### `start()`

```ts
start(): Promise<void>;
```

Begins background processing. Idempotent.

---

### `flush()`

```ts
flush(options?: { signal?: AbortSignal }): Promise<FlushResult>;
```

Processes every available job until the queue is empty or the signal aborts. Concurrent `flush()` calls join the same drain. Returns counts of processed, completed, dead-lettered, and retry-scheduled jobs.

---

### `list()`

```ts
list(filter?: EntryFilter): Promise<PostmasterEntry[]>;
```

Returns entries ordered by `createdAt`. Filter by `status` optionally.

---

### `stats()`

```ts
stats(): Promise<PostmasterStats>;
```

Returns counts of queued, running, and dead-letter jobs.

---

### `retry()`

```ts
retry(id: string): Promise<RetryResult>;
```

Moves a dead-letter job back to queued. Returns a discriminated result: `retried`, `not-found`, `not-dead-letter`, or `running`.

---

### `remove()`

```ts
remove(id: string): Promise<RemoveResult>;
```

Deletes a queued or dead-letter job. Returns a discriminated result: `removed`, `not-found`, or `running`.

---

### `tap()`

```ts
tap(handler: (event: PostmasterEvent) => void, options?: { signal?: AbortSignal }): () => void;
```

Observe runtime events (enqueued, started, completed, retry-scheduled, dead-lettered, removed, lease-lost, processor-error, dispose). Handler errors are swallowed — observability never affects processing. Returns an unsubscribe function. Pass `{ signal }` to auto-detach on abort.

---

### `dispose()`

```ts
dispose(): Promise<void>;
[Symbol.asyncDispose](): Promise<void>;
```

Aborts owned work, releases all active leases, and tears down subscriptions. Idempotent. Does not dispose the borrowed store.

## Types

### `JobDefinition<T>`

```ts
interface JobDefinition<T> {
  readonly version: number;
  readonly validate?: Validate<T>;
  readonly key: (payload: T) => string;
  readonly execute: (payload: T, context: JobContext) => Promise<void>;
  readonly retry?: RetryPolicy;
  readonly migrate?: (payload: unknown, fromVersion: number) => unknown;
}
```

`validate` is optional. Accepts a function `(value: unknown) => T` or any structural parser with `parse(value: unknown): T` (Spell schemas, Zod schemas, etc). Called once at enqueue. If omitted, payload trusted as-is.

---

### `Validate<T>`

```ts
type Validate<T> = ((value: unknown) => T) | { parse(value: unknown): T };
```

Accepts either a plain validation function or any object with a `parse(value: unknown): T` method. Spell's `Schema` and `s.object(...)` satisfy this contract directly — no adapter needed.

---

### `JobContext`

```ts
interface JobContext {
  readonly attempt: number;
  readonly entryId: string;
  readonly key: string;
  readonly signal: AbortSignal;
}
```

---

### `RetryPolicy`

```ts
interface RetryPolicy {
  readonly maxAttempts: number;
  readonly shouldRetry: (error: unknown, attempt: number) => boolean;
  readonly delay?: (attempt: number) => number;
}
```

`maxAttempts` is total executions including the first. `shouldRetry` is required when retries are enabled. Default delay uses Arsenal's `backoff(attempt)`.

---

### `StoredJob`

```ts
interface StoredJob {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly payload: JsonValue;
  readonly key: string;
  readonly status: 'queued' | 'running' | 'dead-letter';
  readonly attempts: number;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly availableAt: number;
  readonly ownerId?: string;
  readonly leaseExpiresAt?: number;
  readonly failure?: StoredFailure;
}
```

---

### `StoredFailure`

```ts
interface StoredFailure {
  readonly name: string;
  readonly message: string;
  readonly occurredAt: number;
}
```

Only a bounded error name/message/timestamp is persisted. Never persist arbitrary error objects, response bodies, headers, or stacks.

---

### `PostmasterEntry`

```ts
type PostmasterEntry = Pick<StoredJob,
  'attempts' | 'availableAt' | 'createdAt' | 'failure' | 'id' |
  'key' | 'name' | 'status' | 'updatedAt' | 'version'
>;
```

The public entry view excludes `payload`, `ownerId`, and `leaseExpiresAt`.

---

### `PostmasterStore`

```ts
interface PostmasterStore {
  transact<T>(fn: (tx: StoreTx) => Promise<T>): Promise<T>;
  list(filter?: EntryFilter): Promise<StoredJob[]>;
  subscribe(listener: () => void): () => void;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  [Symbol.asyncDispose](): Promise<void>;
}

interface StoreTx {
  get(id: string): Promise<StoredJob | undefined>;
  put(entry: StoredJob): Promise<void>;
  delete(id: string): Promise<void>;
  findClaimable(now: number): Promise<StoredJob | undefined>;
  findNextWake(now: number): Promise<number | undefined>;
  countByStatus(): Promise<PostmasterStats>;
}
```

The store exposes transactional primitives. The processor owns all ownership and transition logic — stores implement storage, not the job state machine. `transact` wraps all operations in an atomic transaction. `findClaimable` returns the earliest eligible job (queued with `availableAt <= now`, or running with expired lease). `findNextWake` returns the earliest future wake time across queued and running jobs.

---

### `PostmasterEvent`

```ts
type PostmasterEvent =
  | { readonly type: 'enqueued' | 'started' | 'completed' | 'retry-scheduled' | 'dead-lettered'; readonly entry: PostmasterEntry }
  | { readonly type: 'removed' | 'lease-lost'; readonly id: string }
  | { readonly type: 'processor-error'; readonly error: Error }
  | { readonly type: 'dispose' };
```

---

### `FlushResult`

```ts
interface FlushResult {
  readonly processed: number;
  readonly completed: number;
  readonly deadLettered: number;
  readonly retryScheduled: number;
}
```

---

### `RetryResult` / `RemoveResult`

```ts
type RetryResult =
  | { readonly status: 'not-found' | 'not-dead-letter' | 'running' }
  | { readonly status: 'retried'; readonly entry: PostmasterEntry };

type RemoveResult =
  | { readonly status: 'not-found' | 'running' }
  | { readonly status: 'removed'; readonly id: string };
```

## Errors

### `PostmasterError`

```ts
class PostmasterError extends Error {
  constructor(message: string, options?: ErrorOptions);
}
```

Base class for package-defined errors. Use `instanceof PostmasterError` to narrow to the hierarchy. Covers configuration errors, serialization errors, and store failures.

---

### `PostmasterDisposedError`

```ts
class PostmasterDisposedError extends PostmasterError {}
```

Thrown when a public method is called after disposal.

---

### `PostmasterJobError`

```ts
class PostmasterJobError extends PostmasterError {}
```

Thrown when a job definition is missing, a version is incompatible, or a migration fails. These errors move the job to dead-letter rather than rejecting the public call.
