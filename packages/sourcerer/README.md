# @vielzeug/sourcerer

Atomic reactive sources for local, numbered-page, cursor, and infinite collections.

```sh
pnpm add @vielzeug/sourcerer
```

```ts
import { createPageSource } from '@vielzeug/sourcerer';

const users = createPageSource({
  autoStart: false,
  initialQuery: { pageSize: 20 },
  load: async () => ({ data: [{ id: 1, name: 'Ada' }], total: 1 }),
});

await users.reload();
console.log(users.snapshot.data);
console.log(users.snapshot.pagination.total);
users.dispose();
```

Every source exposes an atomic `snapshot` and `subscribe(listener)`. `setQuery()` changes query fields; `page.*` changes page index. While newer work is active, `pendingQuery` records it without mixing it into loaded data. Page sources cancel superseded requests and preserve successful data on background refresh failures.

| Factory | Purpose |
| --- | --- |
| `createLocalSource()` | Synchronous in-memory collection |
| `createPageSource()` | Numbered async pages |
| `createCursorSource()` | Cursor-based async pages |
| `createInfiniteSource()` | Appended async pages |

Sourcerer manages collection state and request succession. Configure retries, cache, polling, URL serialization, and optimistic mutation with your transport or application layer.

## Documentation

- [Overview](https://vielzeug.dev/sourcerer/)
- [Usage Guide](https://vielzeug.dev/sourcerer/usage)
- [API Reference](https://vielzeug.dev/sourcerer/api)

## License

MIT © Helmuth Saatkamp — part of Vielzeug.
