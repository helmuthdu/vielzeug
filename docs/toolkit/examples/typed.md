---
title: Toolkit — Typed Examples
description: Runtime type-checking examples for Toolkit's is namespace.
---

# Typed Utilities

Use the `is` namespace for runtime checks with TypeScript narrowing.

```ts
import { is } from '@vielzeug/toolkit';
```

## Available Methods

- `is.array`
- `is.boolean`
- `is.date`
- `is.defined`
- `is.empty`
- `is.equal`
- `is.fn`
- `is.match`
- `is.nil`
- `is.number`
- `is.object`
- `is.primitive`
- `is.promise`
- `is.regex`
- `is.string`
- `is.typeOf`

## Example

```ts
import { is } from '@vielzeug/toolkit';

function normalize(value: unknown) {
  if (is.string(value)) return value.trim();
  if (is.number(value)) return value.toFixed(2);
  if (is.array(value)) return value.length;
  if (is.nil(value)) return null;
  return value;
}

const ok = is.equal({ a: 1 }, { a: 1 });
const match = is.match({ a: 1, b: 2 }, { a: 1 });
const tag = is.typeOf(new Date()); // 'date'

console.log(normalize('  hi  '), ok, match, tag);
```
