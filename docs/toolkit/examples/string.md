# 🔤 String Utilities

String utilities provide essential tools to transform, compare, and format strings in a type-safe, ergonomic way. Use these helpers for case conversion, similarity checks, truncation, and more.

## 📚 Quick Reference

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

<style>
.grid-links ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
  list-style: none !important;
  padding: 0 !important;
}
.grid-links li {
  margin: 0 !important;
}
</style>
