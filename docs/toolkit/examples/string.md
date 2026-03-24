---
title: 'Toolkit — String Examples'
description: 'String utility examples for Toolkit.'
---

# String Utilities

String utilities provide essential tools to transform, compare, and format strings in a type-safe, ergonomic way. Use these helpers for case conversion, similarity checks, truncation, and more.

## 📚 Quick Reference

## Problem

Implement 📚 quick reference in a production-friendly way with `@vielzeug/toolkit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/toolkit` installed.

| Method                                 | Description                                                  |
| :------------------------------------- | :----------------------------------------------------------- |
| [`camelCase`](./string/camelCase.md)   | Convert a string to `camelCase`.                             |
| [`kebabCase`](./string/kebabCase.md)   | Convert a string to `kebab-case`.                            |
| [`pascalCase`](./string/pascalCase.md) | Convert a string to `PascalCase`.                            |
| [`snakeCase`](./string/snakeCase.md)   | Convert a string to `snake_case`.                            |
| [`truncate`](./string/truncate.md)     | Truncate a string to a given length with an optional suffix. |
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
import { truncate, similarity } from '@vielzeug/toolkit';

// Truncate
const longText = 'Vielzeug is a Swiss-army knife for TypeScript developers.';
truncate(longText, 20); // 'Vielzeug is a Swi...'

// Similarity
similarity('apple', 'apply'); // 0.8
similarity('hello', 'world'); // 0.2
```

## 🔗 All String Utilities

<div class="grid-links">

- [camelCase](./string/camelCase.md)
- [kebabCase](./string/kebabCase.md)
- [pascalCase](./string/pascalCase.md)
- [similarity](./string/similarity.md)
- [snakeCase](./string/snakeCase.md)
- [truncate](./string/truncate.md)

</div>

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
