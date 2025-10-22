# diff

Computes the difference between two objects, returning the changed, added, and removed properties.

## API

```ts
diff<T extends object, U extends object>(a: T, b: U): Partial<T & U>
```

- `a`: The original object.
- `b`: The updated object.
- Returns: An object representing the difference.

## Example

```ts
import { diff } from '@vielzeug/toolkit';

diff({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 }); // { b: 3, c: 4 }
```

## Notes

- Only top-level properties are compared.
- Useful for change detection and patch generation.

## Related

- [clone](./clone.md)
- [merge](./merge.md)
