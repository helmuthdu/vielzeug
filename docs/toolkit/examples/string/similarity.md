# similarity

Calculates the similarity between two strings as a value between 0 and 1.

## API

```ts
similarity(a: string, b: string): number
```

- `a`: First string.
- `b`: Second string.
- Returns: Similarity score (0 = no similarity, 1 = identical).

## Example

```ts
import { similarity } from '@vielzeug/toolkit';

similarity('kitten', 'sitting'); // e.g. 0.57
similarity('foo', 'foo'); // 1
```

## Notes

- Uses Levenshtein distance for similarity calculation.
- Useful for fuzzy matching and search.

## Related

- [snakeCase](./snakeCase.md)
- [truncate](./truncate.md)
