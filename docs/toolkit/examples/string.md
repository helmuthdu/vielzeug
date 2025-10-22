# 🔤 String Utilities Examples

String utilities help you transform, compare, and format strings in a type-safe, ergonomic way. Use these helpers for
case conversion, similarity checks, truncation, and more.

## 📚 Quick Reference

| Method     | Description                            |
| ---------- | -------------------------------------- |
| camelCase  | Convert string to camelCase            |
| kebabCase  | Convert string to kebab-case           |
| pascalCase | Convert string to PascalCase           |
| similarity | Compute similarity between two strings |
| snakeCase  | Convert string to snake_case           |
| truncate   | Truncate string to a given length      |

## 🔗 Granular Examples

- [camelCase](./string/camelCase.md)
- [kebabCase](./string/kebabCase.md)
- [pascalCase](./string/pascalCase.md)
- [similarity](./string/similarity.md)
- [snakeCase](./string/snakeCase.md)
- [truncate](./string/truncate.md)

## 💡 Example Usage

```ts
import { camelCase, snakeCase, truncate, similarity } from '@vielzeug/toolkit';

// Convert to camelCase
camelCase('hello world'); // 'helloWorld'

// Convert to snake_case
snakeCase('hello world'); // 'hello_world'

// Truncate a string
truncate('hello world', 5); // 'he...'

// Compute similarity
similarity('kitten', 'sitting'); // 0.57
```

## 🔎 See Also

- [Array Utilities](./array.md)
- [Object Utilities](./object.md)
- [Typed Utilities](./typed.md)
