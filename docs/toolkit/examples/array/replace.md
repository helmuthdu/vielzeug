<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# replace

The `replace` utility replaces the **first** element in an array that satisfies a predicate with a new value. The original array is not mutated.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/array/replace.ts
:::

## Features

- **Immutable**: Returns a new array; never mutates the original.
- **First match only**: Only the first matching element is replaced.
- **No-op safe**: Returns the original array reference if no match is found.

## API

```ts
function replace<T>(array: T[], predicate: (item: T) => boolean, value: T): T[];
```

### Parameters

- `array`: The source array.
- `predicate`: A function to test each element; replacement happens on the first `true`.
- `value`: The new value to substitute in place of the matched element.

### Returns

- A new array with the first matching element replaced, or the original array if no match.

### Throws

- `TypeError`: If the first argument is not an array.

## Examples

### Replace by Value

```ts
import { replace } from '@vielzeug/toolkit';

replace([1, 2, 3, 2], (n) => n === 2, 99);
// [1, 99, 3, 2]  — only the first 2 is replaced
```

### Replace an Object in a List

```ts
import { replace } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

const updated = replace(users, (u) => u.id === 2, { id: 2, name: 'Robert' });
// [{ id: 1, name: 'Alice' }, { id: 2, name: 'Robert' }, { id: 3, name: 'Charlie' }]
```

### No Match Returns Original

```ts
import { replace } from '@vielzeug/toolkit';

const arr = [1, 2, 3];
replace(arr, (n) => n === 99, 0) === arr; // true (same reference)
```

## See Also

- [toggle](./toggle.md): Add or remove an item based on whether it already exists.
- [select](./select.md): Filter elements by a predicate.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>
