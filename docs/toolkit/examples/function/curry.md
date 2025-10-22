# curry

Transforms a function into a curried version, allowing arguments to be provided one at a time.

## API

```ts
curry<F extends (...args: any[]) => any>(fn: F): Curried<F>
```

- `fn`: Function to curry.
- Returns: Curried version of the function, accepting arguments one at a time.

## Example

```ts
import { curry } from '@vielzeug/toolkit';

function add(a: number, b: number, c: number) {
  return a + b + c;
}

const curriedAdd = curry(add);
curriedAdd(1)(2)(3); // 6
```

## Notes

- Useful for partial application and functional programming.
- Works with functions of any arity.

## Related

- [compose](./compose.md)
- [fp](./fp.md)
