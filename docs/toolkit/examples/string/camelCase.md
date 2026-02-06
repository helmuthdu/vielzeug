<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-487_B-success" alt="Size">
</div>

# camelCase

The `camelCase` utility transforms a string into `camelCase` format (lower case first letter, with subsequent words capitalized and no separators). It is ideal for normalizing user input or converting string keys into standard JavaScript property names.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/string/camelCase.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Versatile Parsing**: Handles spaces, dashes, underscores, and dots as word separators.
- **Smart Capitalization**: Properly handles mixed-case strings and acronyms.

## API

```ts
function camelCase(input: string): string
```

### Parameters

- `input`: The string to transform.

### Returns

- The transformed string in `camelCase`.

## Examples

### Basic Conversion

```ts
import { camelCase } from '@vielzeug/toolkit';

camelCase('hello world'); // 'helloWorld'
camelCase('foo-bar'); // 'fooBar'
camelCase('USER_PROFILE'); // 'userProfile'
camelCase('data.meta.id'); // 'dataMetaId'
```

### Handling Complex Strings

```ts
import { camelCase } from '@vielzeug/toolkit';

camelCase('  multiple   spaces  '); // 'multipleSpaces'
camelCase('--kebab--case--'); // 'kebabCase'
camelCase('mixed_Case-string'); // 'mixedCaseString'
```

## Implementation Notes

- Trims leading and trailing whitespace before processing.
- All non-alphanumeric characters are treated as potential word separators.
- Throws `TypeError` if the input is not a string.

## See Also

- [snakeCase](./snakeCase.md): Convert strings to `snake_case`.
- [kebabCase](./kebabCase.md): Convert strings to `kebab-case`.
- [pascalCase](./pascalCase.md): Convert strings to `PascalCase`.
