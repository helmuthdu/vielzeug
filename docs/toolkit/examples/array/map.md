# map

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

The `map` utility transforms an array by applying a callback function to each of its elements. It creates a new array with the results, leaving the original array unchanged.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type-safe**: Properly infers the resulting array type from the callback return value.
- **Async Support**: If the callback returns a Promise, `map` will return a Promise that resolves to the new array once all elements are processed.

## API

```ts
interface MapFunction {
  <T, R>(array: T[], callback: (item: T, index: number, array: T[]) => R | Promise<R>): R[] | Promise<R[]>
}
```

### Parameters

- `array`: The array to transform.
- `callback`: The function called for every element. It receives:
  - `item`: The current element.
  - `index`: The index of the current element.
  - `array`: The original array.

### Returns

- A new array with transformed elements.
- A `Promise<R[]>` if the callback is asynchronous.

## Examples

### Basic Transformation

```ts
import { map } from '@vielzeug/toolkit';

const numbers = [1, 2, 3];
const doubled = map(numbers, x => x * 2); // [2, 4, 6]
```

### Mapping Objects

```ts
import { map } from '@vielzeug/toolkit';

const users = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
const names = map(users, u => u.name); // ['Alice', 'Bob']
```

### Asynchronous Mapping

```ts
import { map, delay } from '@vielzeug/toolkit';

const ids = [1, 2, 3];
const data = await map(ids, async (id) => {
  await delay(100); // Simulate API call
  return { id, status: 'fetched' };
});
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- When using async callbacks, all transformations are initiated concurrently.

## See Also

- [filter](./filter.md): Create a subset of an array.
- [reduce](./reduce.md): Reduce an array to a single value.
- [forEach (native)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach): If you only need side effects.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
