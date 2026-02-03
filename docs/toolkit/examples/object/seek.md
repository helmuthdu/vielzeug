<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1608_B-success" alt="Size">
</div>

# seek

The `seek` utility performs a deep fuzzy search within an object or array. It recursively scans all properties and values to determine if any of them match the search query based on a similarity threshold (tone).

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/seek.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Deep Scanning**: Recursively searches through nested objects and arrays.
- **Fuzzy Matching**: Matches values even with partial strings or slight variations.
- **Configurable Sensitivity**: Adjust the "tone" to control how strict or loose the matching should be.

## API

```ts
interface SeekFunction {
  <T>(item: T, query: string, tone?: number): boolean;
}
```

### Parameters

- `item`: The object, array, or value to search within.
- `query`: The search string (case-insensitive).
- `tone`: Optional. A similarity threshold between `0` and `1` (defaults to `1` for exact-like matching).

### Returns

- `true` if a matching value is found anywhere within the structure; otherwise, `false`.

## Examples

### Deep Value Searching

```ts
import { seek } from '@vielzeug/toolkit';

const data = {
  id: 1,
  meta: {
    title: 'Hello World',
    author: { name: 'Alice' },
  },
  tags: ['coding', 'typescript'],
};

seek(data, 'hello'); // true (matches title)
seek(data, 'alice'); // true (matches nested author name)
seek(data, 'type'); // true (matches tag)
seek(data, 'missing'); // false
```

### Using Similarity (Tone)

```ts
import { seek } from '@vielzeug/toolkit';

const item = { label: 'Vielzeug Toolkit' };

// Loose match
seek(item, 'viel', 0.5); // true

// Strict match
seek(item, 'viel', 1.0); // false
```

## Implementation Notes

- Throws `TypeError` if `tone` is not between `0` and `1`.
- Scans all enumerable properties and values.
- Case-insensitive comparison is used for string values.
- Internally leverages the `similarity` utility.

## See Also

- [path](./path.md): Safely retrieve a value at a specific known path.
- [similarity](../string/similarity.md): The underlying string comparison helper.
- [isEqual](../typed/isEqual.md): Check for exact deep equality.
