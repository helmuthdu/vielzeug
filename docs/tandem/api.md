---
title: 'Tandem: API Reference'
description: Factory, port and gateway contracts, events, and types for Tandem.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createSync()` | Scheduler driving a port against a gateway | Sync (queues async work) | Boot runs pull-then-push; dispose before switching accounts |

## Package Entry Point

| Import | Purpose |
| --- | --- |
| `@vielzeug/tandem` | `createSync`, `TandemError`, `TandemDisposedError`, port/gateway contracts, events, and types |

## Factories

### `createSync()`

```ts
function createSync<TRecord extends SyncRecordBase = SyncRecordBase>(
  options: SyncOptions<TRecord>,
): SyncHandle;
```

Starts a sync scheduler: it loads the persisted baseline, pulls remote changes, pushes anything dirty, then flushes on `changed()`, on tab hide, and on foreground return.

| Parameter | Type | Description |
| --- | --- | --- |
| `options.gateway` | `SyncGateway<TRecord>` | The device's storage seam |
| `options.idleDelayMs` | `number \| undefined` | Quiet period before a flush (default `3000`) |
| `options.port` | `SyncPort<TRecord>` | The server seam |

**Returns** a `SyncHandle`. Ambient flushes never reject: they surface failures as `warning` events through `tap()`. An explicit `flush()` rejects when its cycle fails.

**Example**

```ts
import { createSync } from '@vielzeug/tandem';

const sync = createSync({ gateway, idleDelayMs: 1500, port });
sync.changed();
await sync.flush();
sync.dispose();
```

#### `SyncHandle` methods

| Member | Description |
| --- | --- |
| `changed()` | Notes a local change and (re)starts the idle flush timer; throws `TandemDisposedError` after `dispose` |
| `dispose()` | Stops the scheduler, clears the timer, removes document/window listeners |
| `disposed` | `true` once disposed |
| `disposalSignal` | `AbortSignal` aborted on dispose |
| `flush()` | Runs a full cycle: pull, then push; resolves when it completes, rejects when it fails, and rejects with `TandemDisposedError` after `dispose` |
| `tap(handler, options?)` | Observes `TandemEvent`s; returns an unsubscribe function |
| `[Symbol.dispose]()` | Calls `dispose()` for `using` scopes |

## Contracts

### `SyncPort`

The server seam. `pull(since)` returns remote records, remote deletions, and the next cursor. `push(records, deletions, options)` sends local changes; reject it when the server diverged so the engine pulls to reconcile. `options.keepalive` marks a flush that must survive the tab closing.

### `SyncGateway`

The storage seam. The engine owns every rev comparison: it calls your gateway with the decisions already made.

| Member | Contract |
| --- | --- |
| `records()` | This device's own records, remote mirrors excluded; sync or async, so a disk-backed gateway can read from storage instead of holding a mirror |
| `pendingDeletions()` | Tombstones the server has not acknowledged |
| `applyRecords(records)` | Upsert the given records: already filtered to what the server is ahead on; return the ids that failed validation |
| `applyDeletions(deletions)` | Remove records deleted remotely |
| `clearDeletions(deletions)` | Drop the given tombstones a successful push carried |
| `loadState()` | The persisted `SyncState`, or `null` on a fresh device |
| `saveState(state)` | Persist the baseline after a completed pull or push |

## Events

### `TandemEvent`

```ts
type TandemEvent =
  | { readonly records: number; readonly type: 'pull' }
  | { readonly records: number; readonly type: 'push' }
  | { readonly message: string; readonly skipped: readonly string[]; readonly type: 'invalid' }
  | { readonly error: unknown; readonly message: string; readonly type: 'warning' }
  | { readonly type: 'dispose' };
```

`invalid` reports record ids `applyRecords` refused; `warning` reports a rejected push or transport failure and carries the original cause in `error` beside its `message`; `pull` and `push` report the record counts applied and pushed. `dispose` fires once, before tappers are cleared.

## Types

### `SyncRecordBase`

```ts
interface SyncRecordBase {
  readonly id: string;
  readonly rev: number;
}
```

The only shape Tandem reads from a record: identity and a write counter. `rev` is required: the dirty model is a rev comparison, so every synced record carries one from birth.

### `SyncEnvelope`

```ts
interface SyncEnvelope<TRecord extends SyncRecordBase = SyncRecordBase> {
  readonly entity: string;
  readonly record: TRecord;
}
```

A record paired with the entity (table or kind) it belongs to.

### `SyncDeletion`

```ts
interface SyncDeletion {
  readonly deletedAt?: string;
  readonly entity: string;
  readonly id: string;
}
```

A tombstone: a deletion that travels to the server on the next push. `deletedAt` is set by whoever recorded the deletion and the engine never reads it: include it when your server wants the timestamp, omit it otherwise.

### `SyncState`

```ts
interface SyncState {
  cursor: string | null;
  revs: Record<string, number>;
}
```

The persisted baseline. `revs` maps `"${entity}:${id}"` to the newest rev the server has seen.

### `SyncPullResult`

```ts
interface SyncPullResult<TRecord extends SyncRecordBase = SyncRecordBase> {
  readonly cursor: string | null;
  readonly deletions: readonly SyncDeletion[];
  readonly records: readonly SyncEnvelope<TRecord>[];
}
```

### `SyncOptions`

```ts
interface SyncOptions<TRecord extends SyncRecordBase = SyncRecordBase> {
  gateway: SyncGateway<TRecord>;
  idleDelayMs?: number;
  port: SyncPort<TRecord>;
}
```

## Errors

### `TandemError`

```ts
class TandemError extends Error {}
```

Base class for every error Tandem throws; `instanceof TandemError` catches them all in one branch.

### `TandemDisposedError`

```ts
class TandemDisposedError extends TandemError {}
```

Thrown by `changed()` and rejected by `flush()` after `dispose()`. A scheduler that stops silently is a sync engine's worst failure: the device keeps editing while nothing uploads, so a leaked handle fails loudly instead.

Beyond disposal, Tandem defines no error classes. A rejected `push` is expected input, not a failure: the engine pulls to reconcile and reports it as a `warning` event. `flush()` additionally rejects with the underlying port or gateway error; dirty records survive the failure and retry on the next cycle.
