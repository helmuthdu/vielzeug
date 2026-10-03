# @vielzeug/tandem

> Offline-first sync engine with rev baselines, tombstoned deletions, and idle-batched pushes

## Installation

```sh
pnpm add @vielzeug/tandem
npm install @vielzeug/tandem
yarn add @vielzeug/tandem
```

## Quick Start

Tandem drives sync between your storage and your server through two interfaces you implement: a `SyncPort` (the server) and a `SyncGateway` (the device). Records are opaque: the engine reads only `id` and a `rev` write counter.

```ts
import { createSync, type SyncGateway, type SyncPort } from '@vielzeug/tandem';

const port: SyncPort = {
  pull: (since) => fetch(`/sync?since=${since ?? ''}`).then((r) => r.json()),
  push: async (records, deletions) => {
    const response = await fetch('/sync', { method: 'POST', body: JSON.stringify({ records, deletions }) });
    if (!response.ok) throw new Error('server diverged'); // the engine pulls to reconcile
  },
};

const gateway: SyncGateway = {
  records: () => localRecords.map((record) => ({ entity: 'docs', record })),
  pendingDeletions: () => readTombstones(),
  applyRecords: (pulled) => upsert(pulled), // the engine pre-filters; you validate untrusted records
  applyDeletions: (deletions) => removeLocal(deletions),
  clearDeletions: (deletions) => dropTombstones(deletions),
  loadState: () => readSyncState(),
  saveState: (state) => writeSyncState(state),
};

const sync = createSync({ gateway, port });
myStore.subscribe(() => sync.changed()); // a local write: the engine batches and pushes
await sync.flush(); // pulls remote changes, then pushes dirty records; rejects on failure
sync.dispose(); // on account switch or teardown
```

## Documentation

- [Overview](https://vielzeug.dev/tandem/)
- [Usage Guide](https://vielzeug.dev/tandem/usage)
- [API Reference](https://vielzeug.dev/tandem/api)
- [Examples](https://vielzeug.dev/tandem/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu): part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
