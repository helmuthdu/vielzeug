# kebabCase

Converts a string to kebab-case format.

## API

```ts
kebabCase(input: string): string
```

- `input`: The string to convert.
- Returns: The kebab-cased string.

## Example

```ts
import { kebabCase } from '@vielzeug/toolkit';

kebabCase('hello world'); // 'hello-world'
kebabCase('fooBarBaz'); // 'foo-bar-baz'
```

## Notes

- Handles spaces, underscores, and mixed cases.
- Useful for CSS class names and URLs.

## Related

- [snakeCase](./snakeCase.md)
- [camelCase](./camelCase.md)
