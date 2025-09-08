# uuid

Generates a random RFC4122 v4 UUID string.

## API

```ts
uuid(): string
```

- Returns: A random UUID string.

## Example

```ts
import { uuid } from '@vielzeug/toolkit';

uuid(); // e.g. 'b8a1c2e0-3c4d-4e2a-9f1a-2b3c4d5e6f7a'
```

## Notes

- Uses cryptographically secure random values if available.
- Useful for unique IDs in databases, DOM, etc.

## Related

- [random](./random.md)
- [shuffle](./shuffle.md)
