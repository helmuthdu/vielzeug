<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-248_B-success" alt="Size">
</div>

# similarity

The `similarity` utility calculates a score between `0` and `1` representing how similar two strings are. A score of `1` means the strings are identical, while `0` means they have nothing in common.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/string/similarity.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Normalized Output**: Returns a float between `0` and `1`.
- **Case-Insensitive (Optional)**: Can be easily combined with `.toLowerCase()` for case-insensitive matching.

## API

```ts
interface SimilarityFunction {
  (a: string, b: string): number;
}
```

### Parameters

- `a`: The first string to compare.
- `b`: The second string to compare.

### Returns

- A similarity score between `0` and `1`.

## Examples

### Basic Comparison

```ts
import { similarity } from '@vielzeug/toolkit';

similarity('apple', 'apply'); // 0.8
similarity('kitten', 'sitting'); // ~0.57
similarity('hello', 'world'); // 0.2
similarity('same', 'same'); // 1
```

### Case-Insensitive Matching

```ts
import { similarity } from '@vielzeug/toolkit';

const s1 = 'Vielzeug';
const s2 = 'vielzeug';

similarity(s1, s2); // Lower than 1 due to case difference
similarity(s1.toLowerCase(), s2.toLowerCase()); // 1
```

## Implementation Notes

- Internally uses the Levenshtein distance algorithm to determine the number of single-character edits required to change one string into another.
- The score is normalized by dividing the distance by the length of the longer string and subtracting from 1.
- Throws `TypeError` if either argument is not a string.

## See Also

- [search](../array/search.md): Use similarity to perform fuzzy searches in arrays.
- [seek](../object/seek.md): Use similarity to find values in deep objects.
- [truncate](./truncate.md): Shorten long strings.
