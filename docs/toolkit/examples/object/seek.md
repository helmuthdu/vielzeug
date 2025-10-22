# seek

Finds the first value in an object that matches a predicate, searching deeply.

## API

```ts
seek<T = unknown>(obj: object, predicate: (value: unknown, key: string | number, obj: object) => boolean): T | undefined
```

- `obj`: The object to search.
- `predicate`: Function to test each value.
- Returns: The first matching value, or undefined if not found.

## Example

```ts
import { seek } from '@vielzeug/toolkit';

const obj = { a: 1, b: { c: 2, d: 3 } };
seek(obj, v => v === 3); // 3
```

## Notes

- Searches deeply through nested objects.
- Returns the first value that matches the predicate.

## Related

- [path](./path.md)
- [values](./values.md)
