<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-284_B-success" alt="Size">
</div>

# compose

The `compose` utility performs functional composition from right to left. It takes multiple functions and returns a single function that passes its result from one call to the previous one, following standard mathematical notation $f(g(x))$.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/compose.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Async Support**: Automatically handles Promises. If any function in the chain returns a Promise, the final result will be a Promise.
- **Type-safe**: Properly infers input and output types through the entire chain.
- **Right-to-Left**: Executes functions in reverse order of provided arguments.

## API

```ts
function compose<T extends any[], R>(
  ...fns: [(arg: any) => R, ...Array<(arg: any) => any>, (...args: T) => any]
): (...args: T) => R | Promise<R>
```

### Parameters

- `...fns`: A sequence of functions to be composed.

### Returns

- A new function that represents the composition.

## Examples

### Synchronous Composition

```ts
import { compose } from '@vielzeug/toolkit';

const addTwo = (n: number) => n + 2;
const double = (n: number) => n * 2;

// result = addTwo(double(x))
const calculate = compose(addTwo, double);

calculate(5); // (5 * 2) + 2 = 12
```

### Asynchronous Composition

```ts
import { compose, delay } from '@vielzeug/toolkit';

const saveToDb = async (data: string) => {
  await delay(10);
  return { success: true, data };
};

const format = (s: string) => s.trim().toUpperCase();

const processAndSave = compose(saveToDb, format);

await processAndSave('  hello  '); // { success: true, data: 'HELLO' }
```

## Implementation Notes

- If only one function is provided, it is returned as-is.
- Uses `reduceRight` internally to chain function calls.
- Throws `TypeError` if any provided argument is not a function.

## See Also

- [pipe](./pipe.md): Functional composition from left to right.
- [curry](./curry.md): Transform a function into a sequence of unary functions.
- [fp](./fp.md): Wrap functions for functional programming styles.
