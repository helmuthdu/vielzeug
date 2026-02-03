<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-212_B-success" alt="Size">
</div>

# curry

The `curry` utility transforms a function that takes multiple arguments into a sequence of functions, each taking a single argument. It is a fundamental tool for functional programming, enabling easy partial application and better logic reuse.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/curry.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Dynamic Arity**: Automatically determines how many arguments to wait for based on the original function's length.
- **Type-safe**: Properly infers the return types and argument types through the currying chain.

## API

```ts
interface CurryFunction {
  <T extends (...args: any[]) => any>(fn: T): (...args: any[]) => any
}
```

### Parameters

- `fn`: The function to curry.

### Returns

- A curried version of the input function.

## Examples

### Basic Currying

```ts
import { curry } from '@vielzeug/toolkit';

const add = (a: number, b: number, c: number) => a + b + c;
const curriedAdd = curry(add);

curriedAdd(1)(2)(3); // 6
```

### Partial Application

```ts
import { curry, map } from '@vielzeug/toolkit';

const multiply = curry((a: number, b: number) => a * b);

// Create a reusable 'double' function
const double = multiply(2);

double(10); // 20
map([1, 2, 3], double); // [2, 4, 6]
```

## Implementation Notes

- Performance-optimized using a recursive wrapper.
- Does not support functions with variadic arguments (`...args`) effectively, as it relies on `fn.length`.
- Throws `TypeError` if the argument is not a function.

## See Also

- [compose](./compose.md): Functional composition from right to left.
- [pipe](./pipe.md): Functional composition from left to right.
- [fp](./fp.md): Wrap functions for functional programming styles.