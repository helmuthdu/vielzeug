---
title: 'Arsenal Examples — snakeCase'
description: 'snakeCase example for @vielzeug/arsenal.'
---

## snakeCase

### Problem

You need to convert a string to snake_case — for example transforming display names to database column names.

### Solution

Use `snakeCase(str)` to convert any case to lowercase underscore-separated form.

```ts
import { snakeCase } from '@vielzeug/arsenal';

snakeCase('helloWorld'); // 'hello_world'
snakeCase('hello-world'); // 'hello_world'
snakeCase('Hello World'); // 'hello_world'
```

### Related

- [camelCase](./camelCase.md)
- [kebabCase](./kebabCase.md)
