---
title: is
description: Unified namespace of type-checking and comparison helpers.
---

# is

`is` is a namespace object that groups the core type and comparison helpers under a single import.

## Signature

```ts
const is: {
  array(value: unknown): value is unknown[];
  boolean(value: unknown): value is boolean;
  date(value: unknown): value is Date;
  defined<T>(value: T | undefined): value is T;
  empty(value: unknown): boolean;
  equal<T>(a: T, b: T): boolean;
  fn(value: unknown): value is (...args: any[]) => unknown;
  match<T extends object>(object: unknown, source: Partial<T>): object is T;
  nil(value: unknown): value is null | undefined;
  number(value: unknown): value is number;
  object(value: unknown): value is Record<string, unknown>;
  primitive(value: unknown): value is string | number | boolean;
  promise<T = unknown>(value: unknown): value is Promise<T>;
  regex(value: unknown): value is RegExp;
  string(value: unknown): value is string;
  typeOf(value: unknown): string;
};
```

## Examples

### Common checks

```ts
import { is } from '@vielzeug/toolkit';

is.string('hello'); // true
is.number(42); // true
is.array([1, 2, 3]); // true
is.nil(undefined); // true
is.defined('x'); // true
is.empty({}); // true
```

### Equality and pattern matching

```ts
import { is } from '@vielzeug/toolkit';

is.equal({ a: 1 }, { a: 1 }); // true
is.match({ a: 1, b: 2 }, { a: 1 }); // true
```

### Runtime type tags

```ts
import { is } from '@vielzeug/toolkit';

is.typeOf('hello'); // 'string'
is.typeOf([1, 2]); // 'array'
is.typeOf(new Date()); // 'date'
```

## Related

- [isEqual](./isEqual.md)
- [isMatch](./isMatch.md)
- [typeOf](./typeOf.md)
