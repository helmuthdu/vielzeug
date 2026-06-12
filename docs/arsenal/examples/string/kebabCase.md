---
title: 'Arsenal Examples — kebabCase'
description: 'kebabCase example for @vielzeug/arsenal.'
---

## kebabCase

### Problem

You need to convert a string to kebab-case — for example generating URL slugs or CSS class names from data.

### Solution

Use `kebabCase(str)` to convert any case to lowercase kebab-case.

```ts
import { kebabCase } from '@vielzeug/arsenal';

kebabCase('helloWorld'); // 'hello-world'
kebabCase('hello_world'); // 'hello-world'
kebabCase('Hello World'); // 'hello-world'
```

### Related

- [camelCase](./camelCase.md)
- [snakeCase](./snakeCase.md)
