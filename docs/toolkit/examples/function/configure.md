---
title: configure
description: Preconfigure all arguments except the first for composition-friendly unary functions.
---

# configure

`configure` adapts a multi-argument function into a unary function by pre-filling every argument except the first.

## Signature

```ts
configure<F extends Fn>(callback: F, ...args: RemoveFirstParameter<F>): (collection: FirstParameter<F>) => ReturnType<F>
```

## Example

```ts
import { configure, select } from '@vielzeug/toolkit';

const doubleAll = configure(select, (n: number) => n * 2);

const result = doubleAll([1, 2, 3]);
// [2, 4, 6]
```

## Why Use It?

- Great for `pipe`/`compose` flows where unary functions are easiest to chain.
- Keeps call sites clear when reusing callbacks with the same fixed arguments.
