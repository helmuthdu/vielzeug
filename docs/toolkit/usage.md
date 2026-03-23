---
title: Toolkit — Usage Guide
description: Array, async, object, string, math, and function utilities for Toolkit.
---

# Toolkit Usage Guide

::: tip New to Toolkit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Basic Usage

### Import Patterns

#### Named Imports (Recommended)

Import only the utilities you need for optimal tree-shaking:

```ts
import { chunk, group, debounce } from '@vielzeug/toolkit';

const batches = chunk([1, 2, 3, 4, 5], 2);
const byRole = group(users, (u) => u.role);
const search = debounce((query) => fetchResults(query), 300);
```

### Namespace Imports (Not Recommended)

⚠️ **Avoid** importing the entire library—this prevents tree-shaking:

```ts
// ❌ Don't do this – imports everything (~50KB)
import * as toolkit from '@vielzeug/toolkit';

// ✅ Do this instead – imports only what you need
import { chunk, group } from '@vielzeug/toolkit';
```

## Common Patterns

### Arrays

```ts
import { select, group, chunk, toggle, uniq, keyBy, sort } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5, 6];

// Filter nil elements from source, then map the rest
const doubled = select([null, 2, null, 4], (n) => n * 2); // [4, 8]

// Filter by predicate, then map
const evenDoubled = select(
  numbers,
  (n) => n * 2,
  (n) => n % 2 === 0,
); // [4, 8, 12]

// Group
const byParity = group(numbers, (n) => (n % 2 === 0 ? 'even' : 'odd'));
// { even: [2, 4, 6], odd: [1, 3, 5] }

// Chunk
const batches = chunk(numbers, 2); // [[1, 2], [3, 4], [5, 6]]

// Sort by selector (ascending by default)
const ascending = sort([{ value: 3 }, { value: 1 }], (item) => item.value);

// Sort by multiple fields
const users = [
  { age: 30, name: 'Bob' },
  { age: 30, name: 'Alice' },
  { age: 25, name: 'Chris' },
];
const sortedUsers = sort(users, { age: 'desc', name: 'asc' });

// Toggle item in/out
const updated = toggle([1, 2, 3], 2); // [1, 3]

// Remove duplicates
const unique = uniq([1, 2, 2, 3]); // [1, 2, 3]
```

### Objects

```ts
import { merge, get, diff, seek, prune } from '@vielzeug/toolkit';

const config = { api: { host: 'localhost', port: 8080 } };
const overrides = { api: { port: 3000 } };

// Deep merge
const final = merge('deep', config, overrides);
// { api: { host: 'localhost', port: 3000 } }

// Access nested properties safely
const port = get(config, 'api.port'); // 8080
const missing = get(config, 'api.timeout', 5000); // 5000 (default value)

// Recursively search object values for a match
seek(config, 'localhost', 1); // true (exact match)
seek(config, 'local', 0.5); // true (fuzzy match)

// Remove nulls/empty values
const clean = prune({ a: 1, b: null, c: '' }); // { a: 1 }

// Find differences
const changes = diff(config, final);
```

### Strings

```ts
import { camelCase, snakeCase, truncate } from '@vielzeug/toolkit';

// Case conversion
camelCase('hello-world'); // 'helloWorld'
snakeCase('helloWorld'); // 'hello_world'

// Truncate
truncate('A very long string', 10); // 'A very lon...'
```

### Type Guards

All type checks live on the `is` namespace:

```ts
import { is } from '@vielzeug/toolkit';

function processInput(input: unknown) {
  if (is.string(input)) {
    return input.toUpperCase(); // TypeScript knows input is string
  }

  if (is.array(input)) {
    return input.length; // TypeScript knows input is array
  }

  if (is.object(input)) {
    return Object.keys(input); // TypeScript knows input is object
  }
}

// Deep equality, pattern matching, numeric checks
is.equal([1, 2], [1, 2]); // true
is.match(user, { role: 'admin' }); // true
is.positive(5); // true
is.within(3, 1, 5); // true
is.ge(5, 5); // true  (a >= b)
```

### Money

```ts
import { currency, exchange } from '@vielzeug/toolkit';
import type { Money } from '@vielzeug/toolkit';

// Money amounts are stored as bigint (minor units) for precision
const usd: Money = { amount: 123456n, currency: 'USD' }; // $1,234.56

// Format for display
currency(usd); // '$1,234.56'
currency(usd, { locale: 'de-DE' }); // '1.234,56 $'
currency(usd, { style: 'code' }); // 'USD 1,234.56'

// Convert between currencies
const rate = { from: 'USD', to: 'EUR', rate: 0.85 };
const eur = exchange(usd, rate);
// { amount: 104937n, currency: 'EUR' } (~€1,049.37)
```

### Dates

```ts
import { timeDiff, interval, expires } from '@vielzeug/toolkit';

// Calculate the largest human-readable time unit between two dates
const diff = timeDiff(new Date('2025-01-01'), new Date('2026-01-01'));
// { value: 1, unit: 'year' }

// Generate a date range
const days = interval('2024-01-01', '2024-01-07', { interval: 'day' });
// [Date(2024-01-01), Date(2024-01-02), ..., Date(2024-01-07)]

// Check a date's expiry status
expires('2024-01-01'); // 'EXPIRED'
expires('2030-06-15'); // 'LATER'
expires('2026-03-18'); // 'SOON' (within 7 days from today)
expires('9999-12-31'); // 'NEVER'
```

### Random

```ts
import { uuid, random, draw, shuffle } from '@vielzeug/toolkit';

// Cryptographically secure random values
uuid(); // 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
random(1, 10); // integer between 1 and 10 (inclusive)

// Array sampling
draw([1, 2, 3, 4, 5]); // random element, e.g. 3
shuffle([1, 2, 3, 4, 5]); // new shuffled array, e.g. [3, 1, 5, 2, 4]
```

## Advanced Usage

### Async Operations

```ts
import { parallel, retry, race, waitFor, Scheduler } from '@vielzeug/toolkit';

// Process with concurrency limit
const users = await parallel(3, ids, async (id) => fetchUser(id));

// Retry with exponential backoff
const data = await retry(() => fetchData(), { times: 3, delay: 500, backoff: 2 });

// Retry with per-attempt delay and selective predicate
const data = await retry(() => fetchData(), {
  times: 4,
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  shouldRetry: (err) => !(err instanceof Response && err.status < 500),
});

// Ensure loading state shows for at least 300ms (prevents flicker)
const result = await race(fetchQuickData(), 300);

// Poll until ready
await waitFor(() => document.querySelector('#app') !== null, { timeout: 5000 });

// Schedule a low-priority background task (e.g. cache cleanup)
const scheduler = new Scheduler();
void scheduler.postTask(() => pruneStaleEntries(), {
  delay: 5 * 60_000,
  priority: 'background',
});
```

### Composition

Combine utilities for complex transformations:

```ts
import { select, group } from '@vielzeug/toolkit';

// Filter in-stock products and group by category
const result = group(
  select(products, (p) => (p.inStock ? p : null)),
  (p) => p.category,
);
```

### Function Utilities

```ts
import { debounce, throttle, memo } from '@vielzeug/toolkit';

// Debounce – delay execution
const search = debounce((query) => {
  console.log('Searching:', query);
}, 300);

// Throttle – limit rate
const trackScroll = throttle(() => {
  console.log('Scroll:', window.scrollY);
}, 100);

// Memoize – cache results
const calculate = memo((n) => n * n);
```

## Framework Integration

### React

Use utilities with React hooks for optimal performance:

```tsx
import { debounce, chunk } from '@vielzeug/toolkit';
import { useState, useCallback, useMemo } from 'react';

function ProductList({ products }) {
  const [search, setSearch] = useState('');

  // Debounce search input
  const handleSearch = useCallback(
    debounce((query) => setSearch(query), 300),
    [],
  );

  // Memoize expensive operations
  const pages = useMemo(() => chunk(products, 20), [products]);

  return null;
}
```

### Vue 3

Use utilities with Vue composition API:

```vue
<script setup>
import { computed, ref } from 'vue';
import { group, select } from '@vielzeug/toolkit';

const products = ref([]);
const grouped = computed(() =>
  group(
    select(products.value, (p) => p),
    (p) => p.category,
  ),
);
</script>
```

### Node.js / Express

Use utilities in server-side code:

```ts
import { group } from '@vielzeug/toolkit';

app.get('/api/products', async (req, res) => {
  const products = await fetchProducts();
  const grouped = group(products, (p) => p.category);
  res.json(grouped);
});
```

> **💡 Tip**: See [Examples](./examples/array.md) for complete category examples.

## TypeScript Configuration

For optimal TypeScript support, configure your `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
  },
}
```

## Best Practices

### 1. Use Named Imports

✅ **Good**: Enables tree-shaking

```ts
import { chunk, group } from '@vielzeug/toolkit';
```

❌ **Bad**: Imports entire library

```ts
import * as toolkit from '@vielzeug/toolkit';
```

### 2. Leverage Type Inference

✅ **Good**: Let TypeScript infer types

```ts
const names = select(users, (u) => u.name); // string[]
```

❌ **Bad**: Manual type assertions

```ts
const names = select(users, (u) => u.name) as string[];
```

### 3. Use Type Guards

✅ **Good**: Type-safe runtime checks

```ts
if (is.string(value)) {
  return value.toUpperCase();
}
```

❌ **Bad**: Unsafe type assertions

```ts
return (value as string).toUpperCase();
```

### 4. Compose Utilities

✅ **Good**: Readable transformations

```ts
const result = group(select(items, isValid), (item) => item.category);
```

❌ **Bad**: Nested callbacks

```ts
const result = items.reduce((acc, item) => {
  if (isValid(item)) {
    // ... complex logic
  }
  return acc;
}, {});
```

### 5. Handle Async Operations

✅ **Good**: Use `parallel` for concurrent fetching

```ts
const users = await parallel(5, ids, async (id) => fetchUser(id));
```

❌ **Bad**: Manual Promise.all

```ts
const promises = ids.map((id) => fetchUser(id));
const users = await Promise.all(promises);
```

## Performance Tips

1. **Import only what you need**: Tree-shaking reduces bundle size
2. **Use memoization**: Cache expensive computations with `memo()`
3. **Debounce/throttle**: Reduce function call frequency
4. **Chunk large arrays**: Process data in batches for better performance
5. **Profile your code**: Use DevTools to identify bottlenecks

## Browser Compatibility

Toolkit requires modern JavaScript features (ES2020+):

- **Modern browsers**: Chrome 80+, Firefox 75+, Safari 13.1+, Edge 80+
- **Node.js**: v16.x or higher recommended

For older browsers, use a transpiler like Babel or SWC.
