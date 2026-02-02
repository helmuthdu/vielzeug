# group

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1258_B-success" alt="Size">
</div>

The `group` utility partitions an array into an object of collections, based on a provided key or selection function.

## Problem Statement

**Without group**: Grouping requires verbose `reduce` logic that's error-prone and hard to read.

```ts
// Manual grouping - verbose and error-prone
const byRole = users.reduce((acc, user) => {
  const role = user.role;
  if (!acc[role]) {
    acc[role] = [];
  }
  acc[role].push(user);
  return acc;
}, {} as Record<string, User[]>);
```

**With group**: Clean, type-safe grouping in one line.

```ts
// Simple and clear
const byRole = group(users, u => u.role);
// or even simpler
const byRole = group(users, 'role');
```

## Features

- **Isomorphic**: Works in both Browser and Node.js
- **Type-safe**: Properly infers keys and value types
- **Flexible Selection**: Group by direct property key (string) or custom selection function
- **Full Type Inference**: Return type is automatically inferred as `Record<K, T[]>`

## API

```ts
function group<T, K extends PropertyKey>(
  array: T[], 
  selector: (item: T, index: number, array: T[]) => K
): Record<K, T[]>;

function group<T, K extends keyof T>(
  array: T[], 
  selector: K
): Record<string, T[]>;
```

### Parameters

- `array` (T[]): The array to group
- `selector`: Either:
  - **Property key** (string): Direct property name of the objects in the array
  - **Function**: Returns the group key for each element. Receives:
    - `item` (T): The current element
    - `index` (number): The index of the current element
    - `array` (T[]): The original array

### Returns

- `Record<K, T[]>`: An object where each key corresponds to a group, and the value is an array of elements belonging to that group

### Throws

- `TypeError`: If the first argument is not an array

## Examples

### Grouping by Function

```ts
import { group } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5, 6];

// Group by parity
const byParity = group(numbers, n => n % 2 === 0 ? 'even' : 'odd');
// { odd: [1, 3, 5], even: [2, 4, 6] }

// Group by range
const byRange = group(numbers, n => {
  if (n <= 2) return 'low';
  if (n <= 4) return 'medium';
  return 'high';
});
// { low: [1, 2], medium: [3, 4], high: [5, 6] }
```

### Grouping by Property Key

```ts
import { group } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Charlie', role: 'user' },
];

// Simple property grouping
const byRole = group(users, 'role');
/*
{
  admin: [{ id: 1, name: 'Alice', role: 'admin' }],
  user: [
    { id: 2, name: 'Bob', role: 'user' },
    { id: 3, name: 'Charlie', role: 'user' }
  ]
}
*/
```

### Real-World Example: E-commerce

```ts
import { group, map } from '@vielzeug/toolkit';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

const products: Product[] = [
  { id: 1, name: 'Laptop', category: 'electronics', price: 999, inStock: true },
  { id: 2, name: 'Mouse', category: 'electronics', price: 29, inStock: true },
  { id: 3, name: 'Desk', category: 'furniture', price: 299, inStock: false },
  { id: 4, name: 'Chair', category: 'furniture', price: 199, inStock: true },
];

// Group by category
const byCategory = group(products, 'category');

// Group by availability
const byAvailability = group(products, p => p.inStock ? 'available' : 'unavailable');

// Group by price range
const byPriceRange = group(products, p => {
  if (p.price < 50) return 'budget';
  if (p.price < 500) return 'mid-range';
  return 'premium';
});
/*
{
  budget: [{ name: 'Mouse', ... }],
  'mid-range': [{ name: 'Desk', ... }, { name: 'Chair', ... }],
  premium: [{ name: 'Laptop', ... }]
}
*/
```

### Using Index

```ts
import { group } from '@vielzeug/toolkit';

const items = ['a', 'b', 'c', 'd', 'e', 'f'];

// Group by position (first half vs second half)
const byPosition = group(items, (item, index, array) => 
  index < array.length / 2 ? 'first-half' : 'second-half'
);
// { 'first-half': ['a', 'b', 'c'], 'second-half': ['d', 'e', 'f'] }
```

### Nested Grouping

```ts
import { group, map } from '@vielzeug/toolkit';

const transactions = [
  { id: 1, user: 'Alice', category: 'food', amount: 50 },
  { id: 2, user: 'Alice', category: 'transport', amount: 20 },
  { id: 3, user: 'Bob', category: 'food', amount: 30 },
  { id: 4, user: 'Bob', category: 'food', amount: 40 },
];

// First group by user
const byUser = group(transactions, 'user');

// Then group each user's transactions by category
const nested = Object.fromEntries(
  map(Object.entries(byUser), ([user, txns]) => [
    user,
    group(txns, 'category')
  ])
);
/*
{
  Alice: { food: [...], transport: [...] },
  Bob: { food: [...] }
}
*/
```

### Framework Integration: React

```tsx
import { group } from '@vielzeug/toolkit';
import { useMemo } from 'react';

function ProductCatalog({ products }: { products: Product[] }) {
  const productsByCategory = useMemo(
    () => group(products, p => p.category),
    [products]
  );
  
  return (
    <div>
      {Object.entries(productsByCategory).map(([category, items]) => (
        <section key={category}>
          <h2>{category}</h2>
          <div>
            {items.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

### Framework Integration: Node.js API

```ts
import express from 'express';
import { group, map } from '@vielzeug/toolkit';

app.get('/api/analytics/by-category', async (req, res) => {
  const products = await fetchProducts();
  
  const grouped = group(products, 'category');
  
  const analytics = map(Object.entries(grouped), ([category, items]) => ({
    category,
    count: items.length,
    totalValue: items.reduce((sum, p) => sum + p.price, 0),
    avgPrice: items.reduce((sum, p) => sum + p.price, 0) / items.length,
  }));
  
  res.json(analytics);
});
```

## Performance

- **Time Complexity**: O(n) where n is the array length
- **Space Complexity**: O(n) for the result object
- **Single Pass**: Array is iterated only once

## Edge Cases

```ts
// Empty array
group([], x => x); // {}

// Single element
group([1], x => 'key'); // { key: [1] }

// All elements in one group
group([1, 2, 3], () => 'same'); // { same: [1, 2, 3] }

// Numeric keys
group([1, 2, 3], x => x % 2); // { '0': [2], '1': [1, 3] }

// Undefined/null keys - coerced to strings
group([1, 2], x => x === 1 ? undefined : null);
// { 'undefined': [1], 'null': [2] }
```

## Common Pitfalls

### ❌ Assuming Ordered Keys

```ts
const grouped = group([3, 1, 2], x => x);
// Object key order is not guaranteed in all JS environments
// Use Object.keys().sort() if order matters
```

### ❌ Using Complex Objects as Keys

```ts
// ❌ Don't use objects as keys (converted to '[object Object]')
group(items, item => ({ type: item.type }));

// ✅ Use string/number/symbol keys
group(items, item => item.type);
```

### ✅ Type-Safe Property Access

```ts
interface User { 
  id: number; 
  role: 'admin' | 'user'; 
}

const users: User[] = [...];

// ✅ Type-safe - 'role' is valid key
const byRole = group(users, 'role');

// ❌ TypeScript error - 'invalid' is not a key of User
// const invalid = group(users, 'invalid');
```

## Comparison with Native

| Feature | Toolkit `group` | Native `reduce` | `Object.groupBy` (ES2024) |
|---------|-----------------|-----------------|---------------------------|
| Clean syntax | ✅ | ❌ Verbose | ✅ |
| Type inference | ✅ Full | ⚠️ Manual | ✅ |
| Property selector | ✅ | ❌ Manual | ❌ |
| Browser support | Modern (ES2020+) | All | Very new |
| Error handling | `TypeError` | Silent | `TypeError` |

## TypeScript

```ts
// Full type inference
interface User {
  id: number;
  name: string;
  role: 'admin' | 'user';
}

const users: User[] = [...];

// Inferred as Record<string, User[]>
const byRole = group(users, 'role');

// Inferred as Record<'admin' | 'user', User[]> with function
const byRoleFunc = group(users, u => u.role);

// Inferred as Record<string, User[]>
const byName = group(users, u => u.name);
```

## See Also

- [map](./map.md): Transform elements of an array
- [filter](./filter.md): Subset an array
- [aggregate](./aggregate.md): For more complex grouping and reduction patterns
- [sortBy](./sortBy.md): Sort before/after grouping

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

