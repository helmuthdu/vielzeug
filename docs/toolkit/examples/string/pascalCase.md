# pascalCase

Converts a string to PascalCase format.

## API

```ts
pascalCase(input: string): string
```

- `input`: The string to convert.
- Returns: The PascalCased string.

## Example

```ts
import { pascalCase } from '@vielzeug/toolkit';

pascalCase('hello world'); // 'HelloWorld'
pascalCase('foo-bar_baz'); // 'FooBarBaz'
```

## Notes

- Handles spaces, dashes, underscores, and mixed cases.
- Useful for class and type names.

## Related

- [camelCase](./camelCase.md)
- [snakeCase](./snakeCase.md)
