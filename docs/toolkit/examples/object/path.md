# path

Gets the value at a given path of an object, with optional default value.

## API

```ts
path<T = unknown, R = unknown>(obj: T, path: string | Array<string | number>, fallback?: R): R | undefined
```

- `obj`: The object to query.
- `path`: Path to the property (dot/bracket notation or array).
- `fallback`: Value to return if the path does not exist.
- Returns: Value at the path or fallback.

## Example

```ts
import { path } from '@vielzeug/toolkit';

const obj = { a: { b: { c: 42 } } };
path(obj, 'a.b.c'); // 42
path(obj, ['a', 'b', 'c']); // 42
path(obj, 'a.b.x', 0); // 0
```

## Notes

- Supports both string and array paths.
- Returns fallback if the path is not found.

## Related

- [seek](./seek.md)
- [values](./values.md)
