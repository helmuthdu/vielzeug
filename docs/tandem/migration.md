---
title: Tandem Migration
---

# Tandem Migration

## Post-dispose use throws instead of going silent

`changed()` and `flush()` used to be no-ops after `dispose()`. They now fail loudly: `changed()` throws `TandemDisposedError` and `flush()` rejects with it. A scheduler that stops silently is a sync engine's worst failure, so a leaked handle surfaces instead of quietly stopping sync.

```ts
import { TandemDisposedError } from '@vielzeug/tandem';

// Before: silent no-op
sync.dispose();
sync.changed(); // nothing happened, nothing said

// After: fails loudly
sync.dispose();
try {
  sync.changed();
} catch (error) {
  if (error instanceof TandemDisposedError) {
    // wiring outlived the handle: unsubscribe the store first next time
  }
}
```

If your reactive wiring can fire after disposal, unsubscribe your store subscriptions before disposing the handle (or check `sync.disposed` in the wiring).

## `warning` events carry the original error

The `warning` variant of `TandemEvent` gained an `error` field: the rejected push or transport failure itself, not only its message.

```ts
// Before
case 'warning':
  console.warn(event.message);

// After: the cause travels beside the message
case 'warning':
  console.warn(event.message, event.error);
```

## `SyncDeletion.deletedAt` is optional

The engine never reads `deletedAt`, so it is now `deletedAt?: string`. Existing code that stamps it keeps working unchanged; code that builds deletions without a timestamp no longer needs a placeholder.

## `SyncGateway.records()` may be async

`records()` now returns `SyncEnvelope<TRecord>[] | Promise<SyncEnvelope<TRecord>[]>`, matching the repo-wide seam convention. A disk-backed gateway can read from storage per call instead of holding an in-memory mirror of every synced record. Sync implementations need no change.

## The engine persists a copy of the state

`saveState()` receives a fresh clone each time, and the engine clones what `loadState()` returned before mutating it. A gateway that kept a reference to the object it was handed (or handed the engine its own stored object) no longer sees it mutate in place. Treat each `saveState()` payload as an immutable snapshot.
