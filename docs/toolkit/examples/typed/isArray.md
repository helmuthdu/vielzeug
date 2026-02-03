<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-84_B-success" alt="Size">
</div>

# isArray

The `isArray` utility is a type guard that checks if a given value is an array. It provides reliable detection across different execution environments.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/isArray.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Type Guard**: Automatically narrows the type of the checked value to `any[]` or `unknown[]` within conditional blocks.
- **Reliable**: Correctly identifies arrays even when they originate from different iframes or windows.

## API

```ts
interface IsArrayFunction {
  (value: unknown): value is any[];
}
```

### Parameters

- `value`: The value to check.

### Returns

- `true` if the value is an array; otherwise, `false`.

## Examples

### Basic Usage

```ts
import { isArray } from '@vielzeug/toolkit';

isArray([1, 2, 3]); // true
isArray('hello'); // false
isArray({}); // false
```

### Type Narrowing

```ts
import { isArray } from '@vielzeug/toolkit';

function process(data: unknown) {
  if (isArray(data)) {
    // data is now typed as any[]
    return data.length;
  }
  return 0;
}
```

## Implementation Notes

- Internally uses the native `Array.isArray()` method.
- Throws nothing; safely handles `null`, `undefined`, and all other primitive or object types.

## See Also

- [isObject](./isObject.md): Check if a value is a plain object.
- [isEmpty](./isEmpty.md): Check if an array (or object/string) is empty.
- [isDefined](./isDefined.md): Check if a value is not `null` or `undefined`.
