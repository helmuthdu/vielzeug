---
title: Arsenal — Examples
description: Practical Arsenal examples by category.
---

Use these examples as copy/paste starting points for real applications.

## Categories

- [Array utilities](./examples/array.md)
- [Async utilities](./examples/async.md)
- [Function utilities](./examples/function.md)
- [Math utilities](./examples/math.md)
- [Object utilities](./examples/object.md)
- [Random utilities](./examples/random.md)
- [String utilities](./examples/string.md)
- [Typed utilities](./examples/typed.md)

> **Money utilities** (`currency`, `exchange`) have moved to [`@vielzeug/coins`](/coins/examples/).
> **Date utilities** (`expires`, `timeDiff`, `dateRange`) have moved to [`@vielzeug/tempo`](/tempo/examples/).

## Quick Example

```ts
import { chunk, partial, queue, retry, search, stableStringify } from '@vielzeug/arsenal';

const doubleAll = partial((factor: number, values: number[]) => values.map((n) => n * factor), 2);
const pages = chunk(doubleAll([1, 2, 3, 4, 5]), 2);

const q = queue({ concurrency: 2 });
await q.add(() => retry(() => fetch('/api/a').then((r) => r.json()), { times: 2 }));

// Fuzzy search with scored results
const results = search(pages.flat().map((n) => ({ value: n })), '4', { mode: 'scored' });

// Deterministic cache key
const key = stableStringify({ query: 'all', page: 1 });

console.log(pages, results, key);
```
