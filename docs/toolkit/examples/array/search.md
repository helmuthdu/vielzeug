# search

Searches for elements in an array of objects that match a query string, using fuzzy matching and similarity.

## API

```ts
search<T>(array: T[], query: string, tone?: number): T[]
```

- `array`: The array of objects to search.
- `query`: The string to search for (case-insensitive, fuzzy).
- `tone`: Optional degree of similarity between 0 and 1 (default: 0.25).

### Returns

- The filtered array of objects that match the search string.

## Example

```ts
import { search } from '@vielzeug/toolkit';

const data = [
  { name: 'John Doe', age: 25 },
  { name: 'Jane Doe', age: 30 },
  { name: 'Alice', age: 22 }
];
search(data, 'doe'); // [{ name: 'John Doe', age: 25 }, { name: 'Jane Doe', age: 30 }]
search(data, 'ali', 0.5); // [{ name: 'Alice', age: 22 }]
```

## Notes

- Throws `TypeError` if query is not a string or tone is not between 0 and 1.
- Returns an empty array if query is empty.
- Useful for fuzzy search, filtering, or autocomplete.

## See also

- [filter](./filter.md)
