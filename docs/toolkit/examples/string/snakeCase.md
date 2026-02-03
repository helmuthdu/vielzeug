<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-124_B-success" alt="Size">
</div>

# snakeCase

The `snake_case` utility transforms a string into `snake_case` format (all lower case with words separated by underscores). It is commonly used for database column names, file naming conventions, or environment variables.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/string/snakeCase.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Durable Parsing**: Handles spaces, dashes, and dots as separators.
- **Case Boundary Detection**: Correctly splits strings based on transitions between lower and upper case (e.g., from `camelCase`).

## API

```ts
interface SnakeCaseFunction {
  (input: string): string
}
```

### Parameters

- `input`: The string to transform.

### Returns

- The transformed string in `snake_case`.

## Examples

### Basic Conversion

```ts
import { snakeCase } from '@vielzeug/toolkit';

snakeCase('hello world');   // 'hello_world'
snakeCase('fooBar');       // 'foo_bar'
snakeCase('Kebab-Case');   // 'kebab_case'
snakeCase('data.meta.id');  // 'data_meta_id'
```

### Advanced Scenarios

```ts
import { snakeCase } from '@vielzeug/toolkit';

snakeCase('  leading trailing  '); // 'leading_trailing'
snakeCase('XMLHttpRequest');       // 'xml_http_request'
snakeCase('multiple---dashes');    // 'multiple_dashes'
```

## Implementation Notes

- Trims input and removes leading/trailing separators.
- Collapses consecutive separators into a single underscore.
- Throws `TypeError` if the input is not a string.

## See Also

- [camelCase](./camelCase.md): Convert strings to `camelCase`.
- [kebabCase](./kebabCase.md): Convert strings to `kebab-case`.
- [pascalCase](./pascalCase.md): Convert strings to `PascalCase`.