---
title: Toolkit — Usage Guide
description: Array, async, object, string, math, and function utilities for Toolkit.
---

# Toolkit Usage Guide

::: tip New to Toolkit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Toolkit?

Lodash ships ~70 kB even tree-shaken. Toolkit provides modern, tree-shakeable utilities with full TypeScript inference at a fraction of the size.

```ts
// Before — verbose native JS
const groups = items.reduce((acc, item) => {
  const key = item.category;
  (acc[key] = acc[key] || []).push(item);
  return acc;
}, {} as Record<string, typeof items>);

// After — Toolkit
import { group } from '@vielzeug/toolkit';
const groups = group(items, item => item.category);
```

| Feature | Toolkit | Lodash | Radash |
|---|---|---|---|
| Tree-shakeable | ✅ Always | ✅ lodash-es | ✅ |
| TypeScript | ✅ First-class | ⚠️ Via @types | ✅ |
| Async utilities | ✅ | ⚠️ Limited | ✅ |
| Zero dependencies | ✅ | ✅ | ✅ |

**Use Toolkit when** you want utility functions with strong TypeScript types and minimal bundle impact.


## Import

```ts
// Named imports (recommended for tree-shaking)
import { chunk, group, debounce } from '@vielzeug/toolkit';

// Optional: Import types
import type { ChunkOptions } from '@vielzeug/toolkit';
```

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

// Async map – parallel execution
const users = await map([1, 2, 3], async (id) => {
  return await fetchUser(id);
});

// Async filter
const active = await filter(users, async (user) => {
  return (await checkStatus(user.id)) === 'active';
});
```

### Composition

Combine utilities for complex transformations:

```ts
import { filter, group, arrange } from '@vielzeug/toolkit';

// Chain operations
const result = group(
  arrange(
    filter(products, (p) => p.inStock),
    (p) => p.price,
    'desc',
  ),
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

  return (/* ... */);
}
```

### Vue 3

Use utilities with Vue composition API:

```vue
<script setup>
import { computed } from 'vue';
import { group, filter } from '@vielzeug/toolkit';

const products = ref([]);
const grouped = computed(() => group(products.value, (p) => p.category));
</script>
```

### Node.js / Express

Use utilities in server-side code:

```ts
import { map, group } from '@vielzeug/toolkit';

app.get('/api/products', async (req, res) => {
  const products = await fetchProducts();
  const grouped = group(products, (p) => p.category);
  res.json(grouped);
});
```

> **💡 Tip**: See [Examples](./examples/array.md) for complete category examples.

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

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./api">API Reference</a> – Complete API documentation</li>
      <li><a href="./examples">Examples</a> – Practical code examples</li>
      <li><a href="/repl">Interactive REPL</a> – Try it in your browser</li>
    </ul>
  </div>
</div>
