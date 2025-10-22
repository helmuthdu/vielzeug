# camelCase

Converts a string to camelCase format.

## API

```ts
camelCase(input: string): string
```

- `input`: The string to convert.
- Returns: The camelCased string.

## Example

```ts
import { camelCase } from '@vielzeug/toolkit';

camelCase('hello world'); // 'helloWorld'
camelCase('foo-bar_baz'); // 'fooBarBaz'
```

## Notes

- Handles spaces, dashes, underscores, and mixed cases.
- Useful for variable and property names.

## Related

- [snakeCase](./snakeCase.md)
- [kebabCase](./kebabCase.md)
- [pascalCase](./pascalCase.md)
