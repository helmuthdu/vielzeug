---
title: Toolkit — Examples
description: Practical Toolkit examples organized by utility category.
---

# Toolkit Examples

Use these example collections to find working snippets for the current Toolkit API.

## How to Use These Examples

1. Start with the category that matches your immediate task.
2. Move to adjacent categories as your utility needs grow.
3. Keep the API page open while adapting snippets to your project.

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

## Getting Started

```ts
import { chunk, retry, currency, Scheduler } from '@vielzeug/toolkit';

const batches = chunk([1, 2, 3, 4], 2);
const value = currency({ amount: 1299n, currency: 'USD' });

await retry(async () => fetch('/api/health'), {
  times: 3,
  delay: 100,
  shouldRetry: (err, attempt) => attempt < 2,
});

// Background-priority task (won't delay user interactions)
const scheduler = new Scheduler();
void scheduler.postTask(() => cleanupOldData(), { delay: 60_000, priority: 'background' });
```
