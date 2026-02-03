<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-444_B-success" alt="Size">
</div>

# pascalCase

The `pascalCase` utility transforms a string into `PascalCase` format (every word capitalized, no separators). It is typically used for naming classes, components, or TypeScript types.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/string/pascalCase.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Robust Word Splitting**: Recognizes spaces, dashes, underscores, and dots as word boundaries.
- **Consistent Output**: Ensures the very first character is always uppercase.

## API

```ts
interface PascalCaseFunction {
  (input: string): string;
}
```

### Parameters

- `input`: The string to transform.

### Returns

- The transformed string in `PascalCase`.

## Examples

### Basic Conversion

```ts
import { pascalCase } from '@vielzeug/toolkit';

pascalCase('hello world'); // 'HelloWorld'
pascalCase('foo-bar'); // 'FooBar'
pascalCase('user_profile'); // 'UserProfile'
pascalCase('api.version'); // 'ApiVersion'
```

### Handling Case Transitions

```ts
import { pascalCase } from '@vielzeug/toolkit';

pascalCase('camelCaseString'); // 'CamelCaseString'
pascalCase('web-api-v1'); // 'WebApiV1'
pascalCase('  spaced   text '); // 'SpacedText'
```

## Implementation Notes

- Removes all non-alphanumeric separators.
- Capitalizes the first letter of every detected word and lowercases the rest (unless the word was already all caps, depending on specific heuristics).
- Throws `TypeError` if the input is not a string.

## See Also

- [camelCase](./camelCase.md): Convert strings to `camelCase`.
- [snakeCase](./snakeCase.md): Convert strings to `snake_case`.
- [kebabCase](./kebabCase.md): Convert strings to `kebab-case`.
