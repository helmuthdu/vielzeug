---
title: partial
description: Preconfigure leading arguments for composition-friendly functions.
---

# partial

`partial` pre-fills leading arguments and returns a new function.

## Signature

```ts
partial<F extends Fn>(fn: F, ...args: unknown[]): (...rest: unknown[]) => ReturnType<F>
```

## Example

```ts
import { partial } from '@vielzeug/arsenal';

const add = (a: number, b: number) => a + b;
const addTwo = partial(add, 2);

const result = addTwo(3);
// 5
```

## Why Use It?

- Great for `pipe`/`compose` flows where partially applied functions are easiest to chain.
- Keeps call sites clear when reusing callbacks with the same fixed arguments.
