# isPromise

Checks if a value is a Promise.

## API

```ts
isPromise(value: unknown): value is Promise<unknown>
```

- `value`: Value to check.
- Returns: `true` if value is a Promise, else `false`.

## Example

```ts
import { isPromise } from '@vielzeug/toolkit';

isPromise(Promise.resolve(42)); // true
isPromise(42); // false
```

## Notes

- Useful for type guards and async code.

## Related

- [isFunction](./isFunction.md)
- [isObject](./isObject.md)
