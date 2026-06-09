---
title: 'Arsenal Examples — words'
description: 'words example for @vielzeug/arsenal.'
---

## words

### Problem

You need to split a string into its component words, handling camelCase, kebab-case, snake_case, and whitespace-separated strings uniformly.

### Solution

Use `words(str)` to extract words as a `string[]`.

```ts
import { words } from '@vielzeug/arsenal';

words('hello world'); // ['hello', 'world']
words('helloWorld'); // ['hello', 'World']
words('hello-world'); // ['hello', 'world']
words('hello_world'); // ['hello', 'world']
words('FOO_BAR_BAZ'); // ['FOO', 'BAR', 'BAZ']
```

### Related

- [camelCase](./camelCase.md)
- [kebabCase](./kebabCase.md)
- [truncate](./truncate.md)
