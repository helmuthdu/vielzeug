# is

Checks if a value matches a given type or condition. This is a flexible type-checking utility that supports many type and predicate strings, including primitives, arrays, objects, and special checks like 'empty', 'even', 'within', 'gt', ' lt', etc.

## API

```ts
is(type: 'within', ...args: Parameters<typeof isWithin>): boolean;
is(type: 'eq', ...args: Parameters<typeof isEqual>): boolean;
is(type: 'ne', ...args: Parameters<typeof isEqual>): boolean;
is(type: 'gt', ...args: Parameters<typeof gt>): boolean;
is(type: 'ge', ...args: Parameters<typeof ge>): boolean;
is(type: 'lt', ...args: Parameters<typeof lt>): boolean;
is(type: 'le', ...args: Parameters<typeof le>): boolean;
is(type: 'match', ...args: Parameters<typeof isMatch>): boolean;
is(type: 'empty', ...args: Parameters<typeof isEmpty>): boolean;
is(type: 'array', arg: unknown): arg is Array<unknown>;
is(type: 'string', arg: unknown): arg is string;
is(type: 'number', arg: unknown): arg is number;
is(type: 'object', arg: unknown): arg is object;
is(type: 'nil', arg: unknown): arg is null | undefined;
is(type: 'primitive', arg: unknown): arg is string | number | boolean;
is(type: isType, arg: unknown): boolean;
is(type: string, arg: unknown): boolean
```

## Example

```ts
import { is } from '@vielzeug/toolkit';

is('array', []); // true
is('boolean', true); // true
is('date', new Date()); // true
is('defined', 123); // true
is('empty', []); // true
is('even', 2); // true
is('function', () => {}); // true
is('match', { a: 1, b: 2 }, { a: 1 }); // true
is('nan', Number.NaN); // true
is('negative', -123); // true
is('nil', null); // true
is('null', null); // true
is('number', 123); // true
is('object', {}); // true
is('odd', 3); // true
is('positive', 123); // true
is('string', 'hello'); // true
is('symbol', Symbol('test')); // true
is('regex', /abc/); // true
is('string', 'hello world'); // true
is('undefined', undefined); // true
is('within', 2, 1, 3); // true
is('zero', 0); // true
is('eq', [1, 2, 3], [1, 2, 3]); // true
is('ne', [1, 2, 3], [1, 2]); // true
is('ge', 5, 5); // true
is('gt', 5, 3); // true
is('le', 5, 5); // true
is('lt', 3, 5); // true
```

## Notes

- Throws if no type is provided.
- Supports a wide range of type and predicate checks, including deep equality, comparison, and more.

## Related

- [isEqual](./isEqual.md)
- [isMatch](./isMatch.md)
