<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1420_B-success" alt="Size">
</div>

# select

The `select` utility is a high-performance combined transformation and filtering tool. It allows you to simultaneously map and filter an array in a single pass, and it provides built-in support for asynchronous operations.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/select.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Combined Operation**: Map and filter in one step for better readability and performance.
- **Async Support**: Handle asynchronous mapping functions seamlessly.
- **Intelligent Defaults**: Automatically filters out `null` or `undefined` results by default.

## API

```ts
interface SelectFunction {
  <T, R>(
    array: T[], 
    callback: (item: T, index: number, array: T[]) => R | Promise<R>, 
    predicate?: (item: T, index: number, array: T[]) => boolean
  ): R[] | Promise<R[]>
}
```

### Parameters

- `array`: The array to process.
- `callback`: A transformation function that receives each element and returns a new value (or a Promise for one).
- `predicate`: Optional. A function that decides which elements from the *original* array should be processed by the callback. Defaults to a check that excludes `null` or `undefined` items.

### Returns

- A new array of transformed elements.
- A `Promise<R[]>` if the callback is asynchronous.

## Examples

### Synchronous Selection

```ts
import { select } from '@vielzeug/toolkit';

const numbers = [10, 20, 30, 40];

// Double only the numbers greater than 20
const result = select(numbers, x => x * 2, x => x > 20); 
// [60, 80]
```

### Asynchronous Selection

```ts
import { select, delay } from '@vielzeug/toolkit';

const ids = [1, 2, 3];

// Fetch data for specific IDs
const details = await select(ids, async (id) => {
  await delay(50); // Simulate API latency
  return { id, status: 'ok' };
}, id => id !== 2);
// [{ id: 1, ... }, { id: 3, ... }]
```

### Default Filtering

```ts
import { select } from '@vielzeug/toolkit';

const data = [1, null, 2, undefined, 3];

// Automatically skips the null/undefined values
const doubled = select(data, x => x * 2);
// [2, 4, 6]
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- When using async callbacks, all transformations are initiated concurrently.
- If no predicate is provided, it uses a standard "is defined" check on the input elements.

## See Also

- [map](./map.md): Standard array transformation.
- [filter](./filter.md): Standard array filtering.
- [compact](./compact.md): Remove falsy values from an array.
- [pick](./pick.md): Extract specific properties from an array of objects.