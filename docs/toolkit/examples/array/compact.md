# compact

Removes falsy values from an array (false, 0, '', null, undefined, NaN).

## API

```ts
compact<T>(array: T[]): T[]
```

- `array`: The array to compact.

### Returns

- A new array with all falsy values removed (`false`, `0`, `''`, `null`, `undefined`, `NaN`).

## Example

```ts
import { compact } from '@vielzeug/toolkit';

const arr = [0, 1, false, 2, '', 3, null, undefined, NaN];
const compacted = compact(arr); // [1, 2, 3]
```

## Notes

- Throws `TypeError` if the input is not an array.
- Useful for cleaning up data before processing or display.

## See also

- [filter](./filter.md)
