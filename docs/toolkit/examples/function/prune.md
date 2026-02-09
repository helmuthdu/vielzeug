<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.15-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2035_B-success" alt="Size">
</div>

# prune

Removes all nullable and empty values from strings, arrays, or objects. This utility recursively processes data structures to eliminate null, undefined, empty strings, empty arrays, and empty objects.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/prune.ts
:::

## Features

- **Multi-Type Support**: Works with strings, arrays, objects, and primitives
- **Recursive Cleaning**: Deep prunes nested structures
- **String Trimming**: Automatically trims whitespace from strings
- **Empty Detection**: Removes empty arrays and objects
- **Type Preservation**: Maintains proper TypeScript types
- **Isomorphic**: Works in both Browser and Node.js

## API

```ts
function prune<T>(value: T): T | undefined;
```

### Parameters

- `value`: The value to prune (can be string, array, object, or any other type)

### Returns

- The pruneed value with all nullable and empty values removed, or `undefined` if the result would be empty

## Examples

### String Cleaning

```ts
import { prune } from '@vielzeug/toolkit';

prune('  hello  '); // 'hello'
prune('   '); // undefined
prune('  world  '); // 'world'
prune(''); // undefined
```

### Array Cleaning

```ts
import { prune } from '@vielzeug/toolkit';

// Remove null and undefined
prune([1, null, 2, undefined, 3]); // [1, 2, 3]

// Remove empty strings
prune(['hello', '', 'world', '  ']); // ['hello', 'world']

// Remove empty arrays and objects
prune([1, [], {}, 2]); // [1, 2]

// Trim strings in arrays
prune(['  hello  ', '  world  ']); // ['hello', 'world']

// Nested arrays
prune([1, [2, null, 3], 4]); // [1, [2, 3], 4]
```

### Object Cleaning

```ts
import { prune } from '@vielzeug/toolkit';

// Remove null and undefined properties
prune({ a: 1, b: null, c: 2, d: undefined }); // { a: 1, c: 2 }

// Remove empty strings
prune({ name: 'Alice', email: '', age: 30 }); // { name: 'Alice', age: 30 }

// Trim string values
prune({ first: '  John  ', last: '  Doe  ' }); // { first: 'John', last: 'Doe' }

// Remove empty arrays and objects
prune({ a: 1, b: [], c: {}, d: 2 }); // { a: 1, d: 2 }

// Nested objects
prune({
  a: 1,
  b: { c: null, d: 2 },
  e: 3,
}); // { a: 1, b: { d: 2 }, e: 3 }
```

### Complex Nested Structures

```ts
import { prune } from '@vielzeug/toolkit';

const data = {
  name: 'Alice',
  email: '  alice@example.com  ',
  age: 30,
  address: {
    street: '',
    city: 'New York',
    country: null,
  },
  hobbies: ['reading', '', null, 'coding'],
  metadata: {
    created: '2024-01-01',
    tags: [],
    notes: null,
  },
};

prune(data);
/*
{
  name: 'Alice',
  email: 'alice@example.com',
  age: 30,
  address: {
    city: 'New York'
  },
  hobbies: ['reading', 'coding'],
  metadata: {
    created: '2024-01-01'
  }
}
*/
```

### Form Data Sanitization

```ts
import { prune } from '@vielzeug/toolkit';

// Clean user input from forms
const formData = {
  username: '  john_doe  ',
  email: 'john@example.com',
  phone: '',
  bio: '   ',
  preferences: {
    newsletter: true,
    notifications: null,
    theme: '',
  },
};

const sanitized = prune(formData);
/*
{
  username: 'john_doe',
  email: 'john@example.com',
  preferences: {
    newsletter: true
  }
}
*/
```

### API Response Cleaning

```ts
import { prune } from '@vielzeug/toolkit';

// Clean API responses with optional fields
const apiResponse = {
  id: 123,
  name: 'Product',
  description: null,
  price: 99.99,
  images: [],
  tags: ['electronics', '', null, 'gadgets'],
  metadata: {
    created: '2024-01-01',
    updated: null,
    notes: '',
  },
};

const pruneed = prune(apiResponse);
/*
{
  id: 123,
  name: 'Product',
  price: 99.99,
  tags: ['electronics', 'gadgets'],
  metadata: {
    created: '2024-01-01'
  }
}
*/
```

### Primitive Types

```ts
import { prune } from '@vielzeug/toolkit';

// Primitives are preserved
prune(42); // 42
prune(0); // 0
prune(true); // true
prune(false); // false

// Null and undefined become undefined
prune(null); // undefined
prune(undefined); // undefined
```

## Implementation Notes

- **String Handling**: Trims leading/trailing whitespace and returns `undefined` for empty strings
- **Zero Preservation**: Numeric `0` and boolean `false` are preserved (only null/undefined/empty strings are removed)
- **Deep Recursion**: Processes nested structures at any depth
- **Empty Results**: Returns `undefined` if the pruneed result would be an empty array or object
- **Immutability**: Creates new objects/arrays; does not modify input
- **Object Properties**: Only removes properties with truly empty values (not `0` or `false`)
- **Performance**: Uses efficient iteration; suitable for moderate-sized data structures

## See Also

- [compact](../array/compact.md): Remove null/undefined from arrays
- [isEmpty](./isEmpty.md): Check if a value is empty
- [isDefined](./isDefined.md): Check if value is not null/undefined
- [isNil](./isNil.md): Check if value is null or undefined
- [trim](../string/truncate.md): String trimming utilities

<style>
.badges {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.badges img {
  height: 20px;
}
</style>
