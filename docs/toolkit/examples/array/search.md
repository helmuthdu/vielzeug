<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1253_B-success" alt="Size">
</div>

# search

The `search` utility performs a fuzzy search across an array of objects. It checks all string properties of each object and returns a filtered list of items that match the query based on a similarity threshold (tone).

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/search.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Fuzzy Matching**: Finds results even with partial or slightly misspelled queries.
- **Auto-Scanning**: Automatically searches through all string properties of objects in the array.
- **Configurable Sensitivity**: Adjust the "tone" to control how strict or loose the matching should be.

## API

```ts
function search<T>(array: T[], query: string, tone?: number): T[]
```

### Parameters

- `array`: The array of objects to search through.
- `query`: The search string (case-insensitive).
- `tone`: Optional. A similarity threshold between `0` and `1` (defaults to `0.25`). Higher values require a closer match.

### Returns

- A new array containing only the objects that match the search query.

## Examples

### Basic String Search

```ts
import { search } from '@vielzeug/toolkit';

const users = [
  { name: 'John Doe', city: 'New York' },
  { name: 'Jane Smith', city: 'London' },
  { name: 'Alice Jones', city: 'Paris' },
];

// Searches across both 'name' and 'city'
search(users, 'doe'); // [{ name: 'John Doe', ... }]
search(users, 'london'); // [{ name: 'Jane Smith', ... }]
```

### Adjusting Similarity (Tone)

```ts
import { search } from '@vielzeug/toolkit';

const products = [{ name: 'iPhone 15' }, { name: 'Pixel 8' }];

// Strict match
search(products, 'phone', 0.8); // []

// Loose match (default)
search(products, 'phone', 0.25); // [{ name: 'iPhone 15' }]
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array or if `query` is not a string.
- Returns an empty array immediately if the query is an empty string.
- Internally leverages the `similarity` string utility to calculate match scores.
- Only considers properties that are currently of type `string` for matching.

## See Also

- [filter](./filter.md): Filter items based on exact conditions.
- [similarity](../string/similarity.md): The underlying string comparison helper.
- [contains](./contains.md): Check for existence using deep equality.
