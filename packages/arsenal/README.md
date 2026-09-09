# @vielzeug/arsenal

> Non-trivial TypeScript utilities — retry, cancellation, cache, safe-path, serialization, prototype-pollution-guarded collections

## Installation

```sh
pnpm add @vielzeug/arsenal
npm install @vielzeug/arsenal
yarn add @vielzeug/arsenal
```

## Quick Start

```ts
import { groupBy, retry } from '@vielzeug/arsenal';
import { fuzzyFilter } from '@vielzeug/arsenal/array';
import { taskPool } from '@vielzeug/arsenal/async';
import { cache } from '@vielzeug/arsenal/cache';
import { tryParseJson } from '@vielzeug/arsenal/object';

const parsed = tryParseJson('{"users":[{"name":"Alice"}]}');
const users = parsed.ok ? (parsed.value as { users: { name: string }[] }).users : [];
const matches = fuzzyFilter(users, 'ali', { select: (user) => user.name });

const pool = taskPool({ concurrency: 2 });
const data = await pool.run((signal) => retry(() => fetch('/api', { signal }).then((response) => response.json())));

const responses = cache<string, unknown>({ ttlMs: 60_000 });
const profile = await responses.getOrLoad('/profile', () => fetch('/profile').then((response) => response.json()));
const cachedResponses = responses.entries();

console.log(groupBy(matches, (user) => user.name), data, profile, cachedResponses);
pool.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/arsenal/)
- [Usage Guide](https://vielzeug.dev/arsenal/usage)
- [API Reference](https://vielzeug.dev/arsenal/api)
- [Examples](https://vielzeug.dev/arsenal/examples)
- [Migration Guide](https://vielzeug.dev/arsenal/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
