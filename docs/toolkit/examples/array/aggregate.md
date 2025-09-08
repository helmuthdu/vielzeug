# aggregate

Aggregates an array of objects into an object, keyed by a selector (string or function). Returns an object where each key is the result of the selector and the value is the last matching item.

## API

```ts
aggregate<T, K extends keyof T, R extends T[K] extends string ? T[K] : never>(
  array: T[],
  selector: Selector<T>,
): Record<R, T>
```

- `array`: The array of objects to aggregate.
- `selector`: A string key or a function to generate the key for each element.

### Returns

- An object with keys as generated values and values as the last element for each key.

## Example

```ts
import { aggregate } from '@vielzeug/toolkit';

const data = [
  { a: 1, name: 'foo' },
  { a: 2, name: 'bar' },
  { a: 1, name: 'baz' }
];
const result = aggregate(data, 'a');
// result: { '1': { a: 1, name: 'baz' }, '2': { a: 2, name: 'bar' } }

// Using a selector function
const byName = aggregate(data, (item) => item.name);
// result: { foo: { a: 1, name: 'foo' }, bar: { a: 2, name: 'bar' }, baz: { a: 1, name: 'baz' } }
```

## Notes

- Throws `TypeError` if the input is not an array.
- Only the last item for each key is kept.
- Useful for deduplication or grouping by key.

## See also

- [group](./group.md)
