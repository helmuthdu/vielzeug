<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-368_B-success" alt="Size">
</div>

# kebabCase

The `kebabCase` utility transforms a string into `kebab-case` format (all lower case with words separated by dashes). It is perfect for generating CSS class names, URL slugs, or CLI flags.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/string/kebabCase.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Durable Parsing**: Handles spaces, underscores, and dots as separators.
- **Case Boundary Detection**: Correctly splits strings based on transitions between lower and upper case (e.g., from `camelCase`).

## API

```ts
function kebabCase(input: string): string
```

### Parameters

- `input`: The string to transform.

### Returns

- The transformed string in `kebab-case`.

## Examples

### Basic Conversion

```ts
import { kebabCase } from '@vielzeug/toolkit';

kebabCase('hello world'); // 'hello-world'
kebabCase('fooBar'); // 'foo-bar'
kebabCase('USER_PROFILE'); // 'user-profile'
kebabCase('data.meta.id'); // 'data-meta-id'
```

### Advanced Scenarios

```ts
import { kebabCase } from '@vielzeug/toolkit';

kebabCase('  leading trailing  '); // 'leading-trailing'
kebabCase('XMLHttpRequest'); // 'xml-http-request'
kebabCase('multiple___underscores'); // 'multiple-underscores'
```

## Implementation Notes

- Trims input and removes leading/trailing separators.
- Collapses consecutive separators into a single dash.
- Throws `TypeError` if the input is not a string.

## See Also

- [camelCase](./camelCase.md): Convert strings to `camelCase`.
- [snakeCase](./snakeCase.md): Convert strings to `snake_case`.
- [pascalCase](./pascalCase.md): Convert strings to `PascalCase`.
