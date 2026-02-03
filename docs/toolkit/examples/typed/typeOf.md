<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-148_B-success" alt="Size">
</div>

# typeOf

The `typeOf` utility returns a lowercase string representing the precise type of a value. It provides more detailed and accurate results than the native `typeof` operator, correctly identifying arrays, `null`, and other built-in objects.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/typeOf.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Precise Detection**: Distinguishes between `'object'`, `'array'`, `'null'`, and other specific types.
- **Consistent Output**: Returns lowercase strings for all recognized types.

## API

```ts
interface TypeOfFunction {
  (value: unknown): string
}
```

### Parameters

- `value`: The value whose type needs to be determined.

### Returns

- A string representing the type (e.g., `'string'`, `'number'`, `'array'`, `'object'`, `'null'`, `'undefined'`, `'regexp'`, `'date'`).

## Examples

### Basic Usage

```ts
import { typeOf } from '@vielzeug/toolkit';

typeOf('hello');   // 'string'
typeOf(123);       // 'number'
typeOf([]);        // 'array'
typeOf({});        // 'object'
typeOf(null);      // 'null'
typeOf(undefined); // 'undefined'
typeOf(/abc/);     // 'regexp'
typeOf(new Date()); // 'date'
```

## Implementation Notes

- Internally uses `Object.prototype.toString.call(value)` to extract the internal `[[Class]]` property.
- Performance-optimized for frequent type checking.
- Throws nothing; safe for any input value.

## See Also

- [is](./is.md): The unified type-checking engine.
- [isObject](./isObject.md): Dedicated object type guard.
- [isArray](./isArray.md): Dedicated array type guard.