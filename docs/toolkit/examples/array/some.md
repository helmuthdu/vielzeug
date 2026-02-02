# some

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-957_B-success" alt="Size">
</div>

The `some` utility checks if at least one element in an array passes the provided test function. It returns `true` as soon as it finds a matching element (short-circuiting), otherwise it returns `false`.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Short-circuiting**: Stops execution as soon as a match is found for better performance.
- **Type-safe**: Properly typed predicate support.

## API

```ts
interface SomeFunction {
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

- `true` if the predicate returns truthy for any element; otherwise, `false`.

## Examples

### Basic Validation

```ts
import { some } from '@vielzeug/toolkit';

const numbers = [1, 3, 5, 7, 8];

// Check for even numbers
const hasEven = some(numbers, x => x % 2 === 0); // true
```

### Checking Object Properties

```ts
import { some } from '@vielzeug/toolkit';

const users = [
  { id: 1, role: 'user' },
  { id: 2, role: 'editor' },
  { id: 3, role: 'user' }
];

// Check if any admin exists
const hasAdmin = some(users, u => u.role === 'admin'); // false
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Returns `false` for an empty array, regardless of the predicate.
- Does not modify the original array.

## See Also

- [every](./every.md): Check if *all* elements satisfy a condition.
- [filter](./filter.md): Get all elements that satisfy a condition.
- [find](./find.md): Get the first element that satisfies a condition.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
