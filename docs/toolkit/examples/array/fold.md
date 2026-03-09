<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# fold

The `fold` utility reduces an array down to a single value by applying a callback to each pair of adjacent elements — like `reduce` but without an initial accumulator.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/fold.ts
:::

## Features

- **No initial value required**: Works directly on the element type.
- **Empty-safe**: Returns `undefined` for empty arrays instead of throwing.
- **Single-element shortcut**: Returns the single element directly.

## API

```ts
function fold<T>(array: readonly T[], callback: (a: T, b: T) => T): T | undefined;
```

### Parameters

- `array`: The array to fold.
- `callback`: A function applied to each pair `(accumulator, current)`.

### Returns

- The folded result, or `undefined` if the array is empty.

### Throws

- `TypeError`: If the first argument is not an array.

## Examples

### Summing Numbers

```ts
import { fold } from '@vielzeug/toolkit';

fold([1, 2, 3, 4, 5], (a, b) => a + b); // 15
```

### Finding the Maximum

```ts
import { fold } from '@vielzeug/toolkit';

fold([3, 1, 4, 1, 5, 9], (a, b) => (a > b ? a : b)); // 9
```

### Merging Objects

```ts
import { fold } from '@vielzeug/toolkit';

fold([{ a: 1 }, { b: 2 }, { c: 3 }], (acc, cur) => ({ ...acc, ...cur }));
// { a: 1, b: 2, c: 3 }
```

### Edge Cases

```ts
import { fold } from '@vielzeug/toolkit';

fold([], (a, b) => a + b);   // undefined
fold([42], (a, b) => a + b); // 42
```

## See Also

- [group](./group.md): Group array elements by a criterion.
- [select](./select.md): Filter elements by a predicate.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>
