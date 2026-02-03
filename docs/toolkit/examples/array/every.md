<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-929_B-success" alt="Size">
</div>

# every

The `every` utility checks if all elements in an array pass the provided test function. It returns `true` only if the predicate returns truthy for every single element. It short-circuits and returns `false` as soon as a non-matching element is found.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/every.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Short-circuiting**: Stops execution as soon as a failure is found for better performance.
- **Type-safe**: Properly typed predicate support.

## API

```ts
interface EveryFunction {
  <T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): boolean
}
```

### Parameters

- `array`: The array to check.
- `predicate`: The function to test each element. It receives:
  - `item`: The current element.
  - `index`: The index of the current element.
  - `array`: The original array.

### Returns

- `true` if the predicate returns truthy for every element; otherwise, `false`.

## Examples

### Basic Validation

```ts
import { every } from '@vielzeug/toolkit';

const numbers = [2, 4, 6, 8];

// Check if all numbers are even
const allEven = every(numbers, x => x % 2 === 0); // true
```

### Checking Object Collections

```ts
import { every } from '@vielzeug/toolkit';

const tasks = [
  { id: 1, completed: true },
  { id: 2, completed: true },
  { id: 3, completed: false }
];

// Check if all tasks are finished
const allDone = every(tasks, t => t.completed); // false
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Returns `true` for an empty array (vacuous truth).
- Does not modify the original array.

## See Also

- [some](./some.md): Check if *any* element satisfies a condition.
- [filter](./filter.md): Get all elements that satisfy a condition.
- [find](./find.md): Get the first element that satisfies a condition.