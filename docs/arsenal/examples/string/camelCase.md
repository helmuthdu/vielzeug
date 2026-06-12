---
title: 'Arsenal Examples — camelCase'
description: 'camelCase example for @vielzeug/arsenal.'
---

## camelCase

### Problem

You need to convert a string from any case (snake_case, kebab-case, Title Case) to camelCase — for example normalizing API keys for internal use.

### Solution

Use `camelCase(str)` to transform a string to camelCase.

```ts
import { camelCase } from '@vielzeug/arsenal';

camelCase('hello_world'); // 'helloWorld'
camelCase('hello-world'); // 'helloWorld'
camelCase('Hello World'); // 'helloWorld'
camelCase('FOO_BAR_BAZ'); // 'fooBarBaz'
```

### Related

- [pascalCase](./pascalCase.md)
- [kebabCase](./kebabCase.md)
- [snakeCase](./snakeCase.md)
