# truncate

Truncates a string to a specified length, optionally adding an ellipsis or custom ending.

## API

```ts
truncate(input: string, length: number, ending?: string): string
```

- `input`: The string to truncate.
- `length`: Maximum length of the result string.
- `ending`: String to append if truncated (default: '...').
- Returns: Truncated string.

## Example

```ts
import { truncate } from '@vielzeug/toolkit';

truncate('Hello, world!', 5); // 'Hello...'
truncate('Hello, world!', 8, '--'); // 'Hello, w--'
```

## Notes

- Does not truncate if input is shorter than or equal to length.
- Useful for UI display and summaries.

## Related

- [similarity](./similarity.md)
- [snakeCase](./snakeCase.md)
