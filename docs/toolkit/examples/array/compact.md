---
title: compact
---

## compact

Removes falsy values from an array.

## Example

```ts
import { compact } from '@vielzeug/toolkit';

const values = [0, 1, false, 2, '', 3, null, undefined];
const result = compact(values);

// [1, 2, 3]
```

## Signature

```ts
function compact<T>(array: T[]): Array<Exclude<T, false | '' | 0 | 0n | null | undefined>>;
```
