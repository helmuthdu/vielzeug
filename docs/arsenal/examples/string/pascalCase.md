---
title: 'Arsenal Examples — pascalCase'
description: 'pascalCase example for @vielzeug/arsenal.'
---

## pascalCase

### Problem

You need to convert a string to PascalCase — for example generating component or class names from data.

### Solution

Use `pascalCase(str)` to convert any case to PascalCase (each word capitalized, no separator).

```ts
import { pascalCase } from '@vielzeug/arsenal';

pascalCase('hello_world'); // 'HelloWorld'
pascalCase('hello-world'); // 'HelloWorld'
pascalCase('hello world'); // 'HelloWorld'
```

### Related

- [camelCase](./camelCase.md)
- [titleCase](./titleCase.md)
