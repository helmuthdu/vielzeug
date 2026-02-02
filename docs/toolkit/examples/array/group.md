# group

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1258_B-success" alt="Size">
</div>

The `group` utility partitions an array into an object of collections, based on a provided key or selection function.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: Properly infers keys and value types.
- **Flexible Selection**: Group by a direct property key (string) or a custom selection function.

## API

```ts
interface GroupFunction {
  <T, K extends PropertyKey>(
    array: T[], 
    selector: (item: T, index: number, array: T[]) => K
  ): Record<K, T[]>;
  
  <T, K extends keyof T>(
    array: T[], 
    selector: K
  ): Record<string, T[]>;
}
```

### Parameters

- `array`: The array to group.
- `selector`: Either a property key of the objects in the array, or a function that returns the group key for each element.

### Returns

- An object where each key corresponds to a group, and the value is an array of elements belonging to that group.

## Examples

### Grouping by Function

```ts
import { group } from '@vielzeug/toolkit';

const numbers = [1, 2, 3, 4, 5, 6];

const byParity = group(numbers, n => n % 2 === 0 ? 'even' : 'odd');
// { odd: [1, 3, 5], even: [2, 4, 6] }
```

### Grouping by Property Key

```ts
import { group } from '@vielzeug/toolkit';

const users = [
  { id: 1, name: 'Alice', role: 'admin' },
  { id: 2, name: 'Bob', role: 'user' },
  { id: 3, name: 'Charlie', role: 'user' },
];

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

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- If the selector function returns a value that is not a valid `PropertyKey` (string, number, or symbol), it will be coerced to a string.
- Elements that result in an `undefined` or `null` key are grouped under the string representation of that value (e.g., `'undefined'`).

## See Also

- [map](./map.md): Transform elements of an array.
- [filter](./filter.md): Subset an array.
- [aggregate](./aggregate.md): For more complex grouping and reduction patterns.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>


