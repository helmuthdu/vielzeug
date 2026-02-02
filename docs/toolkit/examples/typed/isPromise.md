# isPromise

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-528_B-success" alt="Size">
</div>

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

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>
