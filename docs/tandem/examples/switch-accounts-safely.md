---
title: 'Tandem Examples: Switch Accounts Safely'
description: Dispose and restart the scheduler when the signed-in account changes.
---

## Switch Accounts Safely

### Problem

The sync baseline is per-account state. If the scheduler keeps running across a sign-out, its next flush pushes the old account's dirty records into the new account's port, and its in-memory baseline no longer matches the storage it reads.

### Solution

Treat the handle as account-scoped: dispose the old scheduler before the store swaps, then start a new one against the new account's port and gateway. The boot sequence (load baseline → pull → push) picks up any offline work from the new account automatically.

```ts
import { createSync, type SyncHandle } from '@vielzeug/tandem';

let sync: SyncHandle | undefined;

async function switchAccount(accountId: string): Promise<void> {
  sync?.dispose(); // stops the timer, removes listeners, aborts the disposal signal
  await closeCurrentStore();

  await openStoreFor(accountId); // new IndexedDB name, new port base URL
  sync = createSync({
    gateway: gatewayFor(accountId),
    port: portFor(accountId),
  });
  sync.tap((event) => log.debug(event, `sync:${accountId}`));
}

async function signOut(): Promise<void> {
  try {
    await sync?.flush(); // deliver this account's last edits before the port dies
  } catch {
    // the cycle failed: the edits stay dirty in this account's store
    // and push on the next sign-in
  }
  sync?.dispose();
  sync = undefined;
}
```

### Pitfalls

- Flush before disposing on sign-out: after `dispose()` the scheduler refuses all work, so unsent edits would strand until the next sign-in. Handle the rejection: a failed flush leaves the edits dirty in the account's store, ready for the next sign-in.
- Do not reuse one `SyncState` row across accounts; key it per account database like every other record.
- Tappers attached with `tap()` are cleared on dispose; re-tap the new handle instead of assuming old subscribers survive.

### Related

- [API Reference: SyncHandle](../api.md#synchandle-methods)
- [Usage Guide: Lifecycle and Disposal](../usage.md#lifecycle-and-disposal)
- [Vault](/vault/): per-account database names make the store swap atomic.
