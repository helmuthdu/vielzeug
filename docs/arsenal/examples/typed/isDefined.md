# isDefined

The `isDefined` utility is a type guard that checks if a value is NOT `undefined` or `null`. It is essential for safely handling optional values and cleaning up data sets.

## Source Code

::: details View Source Code
<<< @/../packages/arsenal/src/typed/isDefined.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type Guard**: Automatically narrows types to exclude `null` and `undefined`.
- **Durable**: Unlike a simple truthiness check, it correctly identifies `0`, `false`, and `''` as defined values.

## API

```ts
function isDefined<T>(value: T): value is NonNullable<T>;
```

### Parameters

- `value`: The value to check.

### Returns

- `true` if the value is neither `null` nor `undefined`; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isDefined } from '@vielzeug/arsenal';

isDefined('hello'); // true
isDefined(0); // true
isDefined(false); // true
isDefined(null); // false
isDefined(undefined); // false
```

### Filtering Arrays

```ts
import { isDefined } from '@vielzeug/arsenal';

const data = ['a', undefined, 'b', null, 'c'];

// TypeScript correctly infers the result as string[]
const cleanData = data.filter(isDefined);
// ['a', 'b', 'c']
```

## Implementation Notes

- Returns `true` if `value !== undefined && value !== null`.
- Throws nothing; safe for any input type.

## See Also

- [isNil](./isNil.md): The inverse check (returns true for null/undefined).
- [isEmpty](./isEmpty.md): Check if a value is empty (includes length checks).
- [filterMap](../array/select.md): Build a new array while skipping `undefined` results.
