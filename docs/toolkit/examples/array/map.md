<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

# map

The `map` utility transforms an array by applying a callback function to each of its elements. It creates a new array with the results, leaving the original array unchanged.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/map.ts
:::

## Problem Statement

**Without map**: Transforming arrays requires verbose loops or native `.map()` that doesn't handle async operations well.

```ts
// Manual transformation
const doubled = [];
for (let i = 0; i < numbers.length; i++) {
  doubled.push(numbers[i] * 2);
}

// Async with native map – awkward
const promises = ids.map((id) => fetchUser(id));
const users = await Promise.all(promises);
```

**With map**: Clean, type-safe transformations with built-in async support.

```ts
// Sync transformation
const doubled = map(numbers, (x) => x * 2);

// Async transformation – automatic
const users = await map(ids, async (id) => fetchUser(id));
```

## Features

- **Isomorphic**: Works in both Browser and Node.js
- **Type-safe**: Properly infers the resulting array type from the callback return value
- **Async Support**: If the callback returns a Promise, `map` automatically handles it and returns `Promise<R[]>`
- **Index & Array Access**: Callback receives item, index, and original array

## API

```ts
function map<T, R>(array: T[], callback: (item: T, index: number, array: T[]) => R | Promise<R>): R[] | Promise<R[]>;
```

### Parameters

- `array` (T[]): The array to transform
- `callback` (Function): Function called for every element. Receives:
  - `item` (T): The current element
  - `index` (number): The index of the current element (0-based)
  - `array` (T[]): The original array

### Returns

- `R[]`: A new array with transformed elements (if callback is synchronous)
- `Promise<R[]>`: A promise resolving to the transformed array (if callback is asynchronous)

### Throws

- `TypeError`: If the first argument is not an array

## Examples

### Basic Transformation

```ts
import { map } from '@vielzeug/toolkit';

const numbers = [1, 2, 3];
const doubled = map(numbers, (x) => x * 2);
// [2, 4, 6]

const squared = map(numbers, (x) => x ** 2);
// [1, 4, 9]
```

### Mapping Objects

```ts
import { map } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

// Extract property
const names = map(users, (u) => u.name);
// ['Alice', 'Bob']

// Transform to new structure
const publicProfiles = map(users, (u) => ({
  name: u.name,
  email: u.email,
}));
```

### Using Index

```ts
import { map } from '@vielzeug/toolkit';

const letters = ['a', 'b', 'c'];
const numbered = map(letters, (letter, index) => `${index + 1}. ${letter}`);
// ['1. a', '2. b', '3. c']
```

### Asynchronous Mapping

```ts
import { map } from '@vielzeug/toolkit';

const ids = [1, 2, 3];

// All requests run in parallel
const users = await map(ids, async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
});

// users: User[]
```

### Complex Async Transformation

```ts
import { map } from '@vielzeug/toolkit';

const productIds = [101, 102, 103];

const enrichedProducts = await map(productIds, async (id, index) => {
  const [product, reviews] = await Promise.all([fetchProduct(id), fetchReviews(id)]);

  return {
    ...product,
    averageRating: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
    position: index + 1,
  };
});
```

### Framework Integration: React

```tsx
import { map } from '@vielzeug/toolkit';
import { useMemo } from 'react';

function ProductList({ products }: { products: Product[] }) {
  const enrichedProducts = useMemo(
    () =>
      map(products, (p) => ({
        ...p,
        displayPrice: `$${p.price.toFixed(2)}`,
        inStockLabel: p.quantity > 0 ? 'In Stock' : 'Out of Stock',
      })),
    [products],
  );

  return (
    <div>
      {map(enrichedProducts, (product, index) => (
        <ProductCard key={product.id} product={product} position={index} />
      ))}
    </div>
  );
}
```

### Framework Integration: Vue 3

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { map } from '@vielzeug/toolkit';

const products = ref<Product[]>([]);

const displayProducts = computed(() =>
  map(products.value, (p) => ({
    ...p,
    formattedPrice: `$${p.price.toFixed(2)}`,
  })),
);
</script>

<template>
  <div v-for="product in displayProducts" :key="product.id">{{ product.name }} – {{ product.formattedPrice }}</div>
</template>
```

## Performance

- **Time Complexity**: O(n) where n is the array length
- **Space Complexity**: O(n) for the new array
- **Async Performance**: All promises execute in parallel via `Promise.all()`

### Optimization Tips

```ts
// ✅ Good – Direct property access
const names = map(users, (u) => u.name);

// ⚠️ Slower – Additional computation in callback
const names = map(users, (u) => {
  console.log('Processing:', u); // Side effect on every iteration
  return u.name;
});

// ✅ Better – Minimize work in callback
const names = map(users, (u) => u.name);
console.log('Result:', names);
```

## Edge Cases

```ts
// Empty array
map([], (x) => x * 2); // []

// Mixed types (with proper typing)
map([1, '2', 3], (x) => String(x)); // ['1', '2', '3']

// Undefined/null in array
map([1, null, 3], (x) => (x ? x * 2 : 0)); // [2, 0, 6]

// Callback returns undefined
map([1, 2, 3], (x) => undefined); // [undefined, undefined, undefined]
```

## Common Pitfalls

### ❌ Mutating Original Array

```ts
const users = [{ name: 'Alice' }];

// ❌ Don't mutate
map(users, (u) => {
  u.name = u.name.toUpperCase(); // Mutates original!
  return u;
});

// ✅ Create new objects
map(users, (u) => ({ ...u, name: u.name.toUpperCase() }));
```

### ❌ Forgetting await with Async

```ts
// ❌ Returns Promise<User[]>, not User[]
const users = map(ids, async (id) => fetchUser(id));

// ✅ Await the result
const users = await map(ids, async (id) => fetchUser(id));
```

## Comparison with Native

| Feature         | Toolkit `map`            | Native `Array.map()`    |
| --------------- | ------------------------ | ----------------------- |
| Basic mapping   | ✅                       | ✅                      |
| Type inference  | ✅ Full                  | ✅ Full                 |
| Async support   | ✅ Built-in              | ❌ Manual `Promise.all` |
| Error handling  | `TypeError` on non-array | Silent failure          |
| Browser support | Modern (ES2020+)         | All browsers            |

## TypeScript

```ts
// Full type inference
const numbers: number[] = [1, 2, 3];
const strings = map(numbers, n => String(n));
// Type: string[]

// Explicit types (optional)
const result = map<number, string>(numbers, n => String(n));

// Generic objects
interface User { id: number; name: string; }
const users: User[] = [...];
const ids = map(users, u => u.id);
// Type: number[]
```

## See Also

- [filter](./filter.md): Create a subset of an array
- [reduce](./reduce.md): Reduce an array to a single value
- [group](./group.md): Group elements by key
- [Native Array.map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map): For basic use cases without async support
