# merge

Merges multiple objects using a specified strategy (deep, shallow, lastWins, arrayConcat, arrayReplace, or custom function).

## API

```ts
merge<T extends object[]>(
  strategy?: 'deep' | 'shallow' | 'lastWins' | 'arrayConcat' | 'arrayReplace' | ((target: any, source: any) => any),
  ...items: T
): T[number]
```

- `strategy`: Merge strategy (default: 'deep').
  - `'deep'`: Recursively merges nested objects and arrays (default).
  - `'shallow'`: Shallow merge (like `Object.assign`).
  - `'lastWins'`: Last value wins for each property.
  - `'arrayConcat'`: Concatenates arrays.
  - `'arrayReplace'`: Replaces arrays with the last one.
  - `function`: Custom merge function `(target, source) => result`.
- `...items`: Objects to merge.
- Returns: A new merged object.

## Example

```ts
import { merge } from '@vielzeug/toolkit';

const obj1 = { a: 1, b: { x: 10, y: 'hello' }, c: [1] };
const obj2 = { b: { y: 20, z: true }, c: [2] };
const obj3 = { d: false, c: [3] };

merge('deep', obj1, obj2, obj3); // { a: 1, b: { x: 10, y: 20, z: true }, c: [1, 2, 3], d: false }
merge('shallow', obj1, obj2, obj3); // { a: 1, b: { y: 20, z: true }, c: [3], d: false }
merge('arrayConcat', obj1, obj2, obj3); // { a: 1, b: { x: 10, y: 20, z: true }, c: [1, 2, 3], d: false }
merge('arrayReplace', obj1, obj2, obj3); // { a: 1, b: { x: 10, y: 20, z: true }, c: [3], d: false }
merge('lastWins', obj1, obj2, obj3); // { a: 1, b: { y: 20, z: true }, c: [3], d: false }

// Custom strategy
merge((target, source) => Array.isArray(target) && Array.isArray(source) ? [...target, ...source] : source, obj1, obj2, obj3);
```

## Notes

- Does not mutate the original objects.
- Later sources overwrite earlier ones for the same key.
- Deep merge is the default; use other strategies for different behaviors.
- For arrays, use 'arrayConcat' to concatenate or 'arrayReplace' to replace.
- You can provide a custom merge function for advanced use cases.

## Related

- [clone](./clone.md)
- [diff](./diff.md)
- [entries](./entries.md)
