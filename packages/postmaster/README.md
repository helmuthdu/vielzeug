# @vielzeug/postmaster

> Typed durable job outbox with leased processing, retries, and dead-letter recovery

## Installation

```sh
pnpm add @vielzeug/postmaster
npm install @vielzeug/postmaster
yarn add @vielzeug/postmaster
```

For browser persistence, also install `@vielzeug/vault`.

## Quick Start

```ts
import { createPostmaster, defineJobs } from '@vielzeug/postmaster';
import { createIndexedDbPostmasterStore } from '@vielzeug/postmaster/indexeddb';

const jobs = defineJobs({
  createTodo: {
    version: 1,
    validate: (v: unknown) => v as { id: string; title: string },
    key: (p) => p.id,
    execute: async (payload, { key, signal }) => {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Idempotency-Key': key },
        signal,
      });
    },
    retry: { maxAttempts: 5, shouldRetry: (error) => error instanceof TypeError },
  },
});

const store = createIndexedDbPostmasterStore({ name: 'my-app-outbox' });
const postmaster = createPostmaster({ jobs, store });

await postmaster.enqueue('createTodo', { id: crypto.randomUUID(), title: 'Buy milk' });
postmaster.start();

// On page unload:
await postmaster.dispose();
await store.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/postmaster/)
- [Usage Guide](https://vielzeug.dev/postmaster/usage)
- [API Reference](https://vielzeug.dev/postmaster/api)
- [Examples](https://vielzeug.dev/postmaster/examples)
- [Migration Guide](https://vielzeug.dev/postmaster/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
