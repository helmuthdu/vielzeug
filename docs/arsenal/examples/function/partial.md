---
title: 'Arsenal Examples — partial'
description: 'partial example for @vielzeug/arsenal.'
---

## partial

### Problem

You need to pre-fill the leading arguments of a function to create a more specific version — for example binding a fixed multiplier or a known resource prefix.

### Solution

Use `partial(fn, ...args)` to bind leading arguments and return a new function expecting only the remaining parameters.

```ts
import { partial } from '@vielzeug/arsenal';

const multiply = (factor: number, value: number) => value * factor;
const double = partial(multiply, 2);
const triple = partial(multiply, 3);

double(5); // 10
triple(5); // 15

// Works well in pipelines
const addPrefix = partial((prefix: string, str: string) => `${prefix}${str}`, 'api/');
['users', 'posts'].map(addPrefix); // ['api/users', 'api/posts']
```

### Pitfalls

- Only binds leading arguments. Use `curry` for argument-at-a-time application at any position.

### Related

- [curry](./curry.md)
- [compose](./compose.md)
