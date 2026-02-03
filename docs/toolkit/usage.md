# Toolkit Usage Guide

A comprehensive guide to installing, importing, and using Toolkit in your projects.

## Installation

### Package Managers

Install Toolkit using your preferred package manager:

```sh
# pnpm (recommended)
pnpm add @vielzeug/toolkit

# npm
npm install @vielzeug/toolkit

# yarn
yarn add @vielzeug/toolkit

# bun
bun add @vielzeug/toolkit
```

### Verify Installation

After installation, verify that Toolkit is installed correctly:

```ts
import { map } from '@vielzeug/toolkit';

console.log(map([1, 2, 3], (x) => x * 2)); // [2, 4, 6]
```

## Import Patterns

### Named Imports (Recommended)

Import only the utilities you need for optimal tree-shaking:

```ts
import { chunk, group, debounce } from '@vielzeug/toolkit';

const batches = chunk([1, 2, 3, 4, 5], 2);
const byRole = group(users, (u) => u.role);
const search = debounce((query) => fetchResults(query), 300);
```

### Category-Specific Imports

Import from specific modules for better code organization:

```ts
import { chunk, map, filter } from '@vielzeug/toolkit/array';
import { merge, clone } from '@vielzeug/toolkit/object';
import { camelCase } from '@vielzeug/toolkit/string';
import { debounce, throttle } from '@vielzeug/toolkit/function';
```

### Namespace Imports (Not Recommended)

⚠️ **Avoid** importing the entire library—this prevents tree-shaking:

```ts
// ❌ Don't do this - imports everything (~50KB)
import * as toolkit from '@vielzeug/toolkit';

// ✅ Do this instead - imports only what you need
import { chunk, group } from '@vielzeug/toolkit';
```

## Basic Usage

### Arrays

```ts
import { map, filter, group, chunk } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5, 6];

// Transform
const doubled = map(numbers, (n) => n * 2); // [2, 4, 6, 8, 10, 12]

// Filter
const evens = filter(numbers, (n) => n % 2 === 0); // [2, 4, 6]

// Group
const byParity = group(numbers, (n) => (n % 2 === 0 ? 'even' : 'odd'));
// { even: [2, 4, 6], odd: [1, 3, 5] }

// Chunk
const batches = chunk(numbers, 2); // [[1, 2], [3, 4], [5, 6]]
```

### Objects

```ts
import { merge, clone, path, diff } from '@vielzeug/toolkit';

const config = { api: { host: 'localhost', port: 8080 } };
const overrides = { api: { port: 3000 } };

// Deep merge
const final = merge('deep', config, overrides);
// { api: { host: 'localhost', port: 3000 } }

// Deep clone
const copy = clone(config);

// Access nested properties
const port = path(config, 'api.port'); // 8080

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

```ts
import { isString, isArray, isObject, isEmpty } from '@vielzeug/toolkit';

function processInput(input: unknown) {
  if (isString(input)) {
    return input.toUpperCase(); // TypeScript knows input is string
  }

  if (isArray(input)) {
    return input.length; // TypeScript knows input is array
  }

  if (isObject(input)) {
    return Object.keys(input); // TypeScript knows input is object
  }
}
```

## Advanced Usage

### Async Operations

Many utilities support async callbacks:

```ts
import { map, filter } from '@vielzeug/toolkit';

// Async map - fetches all users in parallel
const users = await map([1, 2, 3], async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
});

// Async filter
const activeUsers = await filter(users, async (user) => {
  const status = await checkStatus(user.id);
  return status === 'active';
});
```

### Composition

Combine utilities for powerful transformations:

```ts
import { map, filter, group, sortBy } from '@vielzeug/toolkit';

const products = [
  { name: 'Laptop', category: 'electronics', price: 999, inStock: true },
  { name: 'Desk', category: 'furniture', price: 299, inStock: false },
  { name: 'Mouse', category: 'electronics', price: 29, inStock: true },
];

// Filter → Sort → Group
const result = group(
  sortBy(
    filter(products, (p) => p.inStock),
    (p) => p.price,
    'desc',
  ),
  (p) => p.category,
);
```

### Function Utilities

```ts
import { debounce, throttle, memo, retry } from '@vielzeug/toolkit';

// Debounce - delays execution
const search = debounce((query: string) => {
  console.log(`Searching for: ${query}`);
}, 300);

// Throttle - limits execution rate
const trackScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
}, 100);

// Memoize - caches results
const expensiveCalc = memo((n: number) => {
  return n * n;
});

// Retry - retries failed operations
const fetchData = retry(
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  { attempts: 3, delay: 1000 },
);
```

## Framework Integration

### React

```tsx
import { debounce, group, chunk } from '@vielzeug/toolkit';
import { useState, useMemo, useCallback } from 'react';

function ProductList({ products }: { products: Product[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Debounced search
  const handleSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
    }, 300),
    [],
  );

  // Memoized grouping
  const groupedProducts = useMemo(() => group(products, (p) => p.category), [products]);

  // Pagination with chunk
  const pages = useMemo(() => chunk(products, 20), [products]);

  return (
    <div>
      <input onChange={(e) => handleSearch(e.target.value)} />
      {/* Render grouped products */}
    </div>
  );
}
```

### Vue 3

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { group, filter, debounce } from '@vielzeug/toolkit';

const products = ref<Product[]>([]);
const searchQuery = ref('');

// Debounced search
const handleSearch = debounce((query: string) => {
  searchQuery.value = query;
}, 300);

// Computed grouped products
const groupedProducts = computed(() =>
  group(
    filter(products.value, (p) => p.name.toLowerCase().includes(searchQuery.value.toLowerCase())),
    (p) => p.category,
  ),
);
</script>

<template>
  <input @input="handleSearch($event.target.value)" />
  <!-- Render grouped products -->
</template>
```

### Node.js / Express

```ts
import express from 'express';
import { map, group, isEmpty } from '@vielzeug/toolkit';

const app = express();

app.get('/api/products', async (req, res) => {
  const products = await fetchProducts();

  // Group by category
  const grouped = group(products, (p) => p.category);

  // Transform response
  const response = await map(Object.entries(grouped), async ([category, items]) => ({
    category,
    count: items.length,
    items: items.slice(0, 10), // First 10 items
  }));

  res.json(response);
});
```

## TypeScript Configuration

For optimal TypeScript support, configure your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler", // or "node16"
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true
  }
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
const names = map(users, (u) => u.name); // string[]
```

❌ **Bad**: Manual type assertions

```ts
const names = map(users, (u) => u.name) as string[];
```

### 3. Use Type Guards

✅ **Good**: Type-safe runtime checks

```ts
if (isString(value)) {
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
const result = group(filter(items, isValid), (item) => item.category);
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

✅ **Good**: Use built-in async support

```ts
const users = await map(ids, async (id) => fetchUser(id));
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

## Next Steps

- Explore the [API Reference](./api.md) for a complete list of utilities
- Check out [Examples](./examples/array.md) for category-specific guides
- Try utilities in the [REPL](/repl) without any setup

---

Need help? Visit our [GitHub Discussions](https://github.com/helmuthdu/vielzeug/discussions) or [open an issue](https://github.com/helmuthdu/vielzeug/issues).
