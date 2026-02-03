<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1.2_KB-success" alt="Size">
</div>

# is

The `is` utility is a highly flexible and unified type-checking engine. It acts as a single entry point for nearly all type guards and comparison helpers available in the toolkit, supporting a wide range of string-based predicates and constructor-based checks.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/typed/is.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Unified API**: One function to rule them all — primitives, objects, comparisons, and ranges.
- **Predicate Strings**: Use intuitive strings like `'empty'`, `'even'`, `'nil'`, or `'match'`.
- **Constructor Support**: Check against native constructors like `Array`, `Date`, or custom classes.
- **Type Guard**: Provides type narrowing for standard types when using string predicates.

## API

```ts
interface IsFunction {
  // Common type guards
  (type: 'string', value: unknown): value is string;
  (type: 'number', value: unknown): value is number;
  (type: 'array', value: unknown): value is any[];
  (type: 'object', value: unknown): value is object;
  (type: 'nil', value: unknown): value is null | undefined;

  // Logical predicates
  (type: 'empty', value: unknown): boolean;
  (type: 'match', value: any, pattern: any): boolean;
  (type: 'within', value: number, min: number, max: number): boolean;

  // Comparisons
  (type: 'gt', a: any, b: any): boolean;
  (type: 'ge', a: any, b: any): boolean;

  // ... and many more
}
```

### Parameters

- `type`: A string identifier for the check, or a constructor (e.g., `Date`).
- `...args`: The values to be checked or compared.

### Returns

- `true` if the condition is met; otherwise, `false`.

## Examples

### String-based Type Checks

```ts
import { is } from '@vielzeug/toolkit';

is('array', []); // true
is('string', 'hello'); // true
is('nil', null); // true
is('primitive', true); // true
```

### Using Predicates & Comparisons

```ts
import { is } from '@vielzeug/toolkit';

is('empty', {}); // true
is('even', 42); // true
is('within', 5, 0, 10); // true
is('gt', 10, 5); // true
is('match', { a: 1 }, { a: 1 }); // true
```

### Constructor-based Checks

```ts
import { is } from '@vielzeug/toolkit';

is(new Date(), Date); // true
is([], Array); // true

class MyClass {}
is(new MyClass(), MyClass); // true
```

## Implementation Notes

- Performance-optimized registry of predicates.
- String predicates are case-insensitive.
- Throws an error if an invalid or unknown `type` is provided.
- Internally dispatches to specific utilities like `isEmpty`, `isWithin`, `isArray`, etc.

## See Also

- [isEqual](./isEqual.md): Deep equality checking.
- [isMatch](./isMatch.md): Pattern matching helper.
- [isArray](./isArray.md): Dedicated array type guard.
