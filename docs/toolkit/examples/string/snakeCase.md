# snakeCase

Converts a string to snake_case format.

## API

```ts
snakeCase(input: string): string
```

- `input`: The string to convert.
- Returns: The snake_cased string.

## Example

```ts
import { snakeCase } from '@vielzeug/toolkit';

snakeCase('hello world'); // 'hello_world'
snakeCase('fooBarBaz'); // 'foo_bar_baz'
```

## Notes

- Handles spaces, dashes, and mixed cases.
- Useful for database and file names.

## Related

- [camelCase](./camelCase.md)
- [kebabCase](./kebabCase.md)
