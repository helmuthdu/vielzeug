---
title: 'Toolkit — String Examples'
description: 'String utility examples for Toolkit.'
---

## String Utilities

String utilities provide essential tools to transform, compare, and format strings in a type-safe, ergonomic way. Use these helpers for case conversion, similarity checks, truncation, and more.

## 📚 Quick Reference

## Problem

Implement 📚 quick reference in a production-friendly way with `@vielzeug/toolkit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/toolkit` installed.

| Method                                 | Description                                                  |
| :------------------------------------- | :----------------------------------------------------------- |
| [`camelCase`](./string/camelCase.md)   | Convert a string to `camelCase`.                             |
| [`endsWith`](./string/endsWith.md)     | Type-safe suffix check.                                      |
| [`escape`](./string/escape.md)         | Escape HTML entities.                                        |
| [`kebabCase`](./string/kebabCase.md)   | Convert a string to `kebab-case`.                            |
| [`pad`](./string/pad.md)               | Pad text to a target length.                                 |
| [`pascalCase`](./string/pascalCase.md) | Convert a string to `PascalCase`.                            |
| [`snakeCase`](./string/snakeCase.md)   | Convert a string to `snake_case`.                            |
| [`startsWith`](./string/startsWith.md) | Type-safe prefix check.                                      |
| [`titleCase`](./string/titleCase.md)   | Convert text to title case.                                  |
| [`truncate`](./string/truncate.md)     | Truncate a string to a given length with an optional suffix. |
| [`unescape`](./string/unescape.md)     | Unescape HTML entities.                                      |
| [`words`](./string/words.md)           | Split text into normalized words.                            |
| [`similarity`](./string/similarity.md) | Compute the similarity score (0 to 1) between two strings.   |

## 💡 Practical Examples

### Case Conversion

```ts
import { camelCase, kebabCase, pascalCase, snakeCase } from '@vielzeug/toolkit';

const input = 'Hello World-from Vielzeug';

camelCase(input); // 'helloWorldFromVielzeug'
kebabCase(input); // 'hello-world-from-vielzeug'
pascalCase(input); // 'HelloWorldFromVielzeug'
snakeCase(input); // 'hello_world_from_vielzeug'
```

### Formatting & Comparison

```ts
import { endsWith, escape, pad, similarity, startsWith, titleCase, truncate, unescape, words } from '@vielzeug/toolkit';

// Truncate
const longText = 'Vielzeug is a Swiss-army knife for TypeScript developers.';
truncate(longText, 20); // 'Vielzeug is a Swi...'

// Similarity
similarity('apple', 'apply'); // 0.8
similarity('hello', 'world'); // 0.2

startsWith('vielzeug', 'viel'); // true
endsWith('vielzeug', 'zeug'); // true
pad('hi', 6, '.'); // '..hi..'
titleCase('helloWorld-test_case'); // 'Hello World Test Case'
words('helloWorld-test_case'); // ['hello', 'World', 'test', 'case']
const html = escape('<b>Hi</b>'); // '&lt;b&gt;Hi&lt;/b&gt;'
unescape(html); // '<b>Hi</b>'
```

## 🔗 All String Utilities

- [camelCase](./string/camelCase.md)
- [endsWith](./string/endsWith.md)
- [escape](./string/escape.md)
- [kebabCase](./string/kebabCase.md)
- [pad](./string/pad.md)
- [pascalCase](./string/pascalCase.md)
- [similarity](./string/similarity.md)
- [snakeCase](./string/snakeCase.md)
- [startsWith](./string/startsWith.md)
- [titleCase](./string/titleCase.md)
- [truncate](./string/truncate.md)
- [unescape](./string/unescape.md)
- [words](./string/words.md)

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Array Examples](./array.md)
- [Async Examples](./async.md)
- [Date Examples](./date.md)
