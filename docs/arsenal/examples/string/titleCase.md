---
title: 'Arsenal Examples — titleCase'
description: 'titleCase example for @vielzeug/arsenal.'
---

## titleCase

### Problem

You need to capitalize the first letter of each word in a string — for example formatting display titles from raw data.

### Solution

Use `titleCase(str)` to capitalize each word.

```ts
import { titleCase } from '@vielzeug/arsenal';

titleCase('hello world');    // 'Hello World'
titleCase('the quick fox');  // 'The Quick Fox'
titleCase('hello-world');    // 'Hello-World'
```

### Related

- [pascalCase](./pascalCase.md)
- [camelCase](./camelCase.md)
