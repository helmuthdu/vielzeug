---
title: Toolkit — Examples
description: Practical Toolkit examples by category.
---

Use these examples as copy/paste starting points for real applications.

## Categories

- [Array utilities](./examples/array.md)
- [Async utilities](./examples/async.md)
- [Date utilities](./examples/date.md)
- [Function utilities](./examples/function.md)
- [Math utilities](./examples/math.md)
- [Money utilities](./examples/money.md)
- [Object utilities](./examples/object.md)
- [Random utilities](./examples/random.md)
- [String utilities](./examples/string.md)
- [Typed utilities](./examples/typed.md)

## Quick Example

```ts
import { chunk, partial, queue, retry } from '@vielzeug/toolkit';

const doubleAll = partial((values: number[], factor: number) => values.map((n) => n * factor), 2);
const pages = chunk(doubleAll([1, 2, 3, 4, 5]), 2);

const q = queue({ concurrency: 2 });
await q.add(() => retry(() => fetch('/api/a').then((r) => r.json()), { times: 2 }));

console.log(pages);
```
