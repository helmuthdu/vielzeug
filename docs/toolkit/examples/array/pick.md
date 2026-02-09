<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1344_B-success" alt="Size">
</div>

# pick

The `pick` utility finds the first element in an array that satisfies a condition and then transforms it using a callback function. It is a more powerful version of `find` that includes a built-in transformation step and support for asynchronous operations.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/array/pick.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Efficient**: Stops searching as soon as the first match is found.
- **Integrated Transformation**: Combined search and map for single elements.
- **Async Support**: Handle asynchronous transformation callbacks seamlessly.

## API

```ts
function pick<T, R>(
  array: T[],
  callback: (item: T, index: number, array: T[]) => R | Promise<R>,
  predicate?: (item: T, index: number, array: T[]) => boolean,
): R | Promise<R> | undefined;
```

### Parameters

- `array`: The array to search through.
- `callback`: A function that transforms the matched element. Can be synchronous or asynchronous.
- `predicate`: Optional. A function that tests each element. Defaults to a check that excludes `null` or `undefined` items.

### Returns

- The transformed result of the first matching element.
- A `Promise<R>` if the callback is asynchronous.
- `undefined` if no element matches the predicate.

## Examples

### Synchronous Picking

```ts
import { pick } from '@vielzeug/toolkit';

const products = [
  { id: 1, price: 100, name: 'Basic' },
  { id: 2, price: 200, name: 'Pro' },
  { id: 3, price: 300, name: 'Enterprise' },
];

// Pick the name of the first product over 150
const result = pick(
  products,
  (p) => p.name,
  (p) => p.price > 150,
);
// 'Pro'
```

### Asynchronous Picking

```ts
import { pick, delay } from '@vielzeug/toolkit';

const ids = [1, 2, 3, 4, 5];

// Fetch and return data for the first valid ID
const data = await pick(
  ids,
  async (id) => {
    await delay(100);
    return { id, data: 'fetched' };
  },
  (id) => id % 2 === 0,
);
// { id: 2, data: 'fetched' }
```

## Implementation Notes

- Throws `TypeError` if the first argument is not an array.
- Short-circuiting: The callback is only executed _once_ for the first item that passes the predicate.
- If no predicate is provided, it returns the result of the callback for the first non-nil element in the array.

## See Also

- [select](./select.md): Transform and filter _multiple_ elements.
- [find](./find.md): Find an element without transforming it.
- [compact](./compact.md): Remove falsy values from an array.
