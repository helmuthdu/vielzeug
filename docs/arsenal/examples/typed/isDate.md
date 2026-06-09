---
title: 'Arsenal Examples — isDate'
description: 'isDate example for @vielzeug/arsenal.'
---

## isDate

### Problem

You need to check whether a value is a `Date` instance — for example validating serialized form inputs before date math.

### Solution

Use `isDate(value)` to narrow the type to `Date`.

```ts
import { isDate } from '@vielzeug/arsenal';

isDate(new Date()); // true
isDate('2024-01-01'); // false
isDate(1704067200000); // false
```

### Related

- [isDefined](./isDefined.md)
