<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-361_B-success" alt="Size">
</div>

# uuid

The `uuid` utility generates a cryptographically strong Universally Unique Identifier (UUID) version 4, as specified in RFC 4122.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/random/uuid.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Secure**: Uses `crypto.getRandomValues()` in the browser and `crypto.randomUUID()` or `crypto.randomBytes()` in Node.js for high-quality randomness.
- **Collision-Resistant**: Provides 122 bits of randomness, making collisions practically impossible for most applications.

## API

```ts
function uuid(): string
```

### Returns

- A string representing a randomly generated UUID v4 (e.g., `'f47ac10b-58cc-4372-a567-0e02b2c3d479'`).

## Examples

### Generating a Unique ID

```ts
import { uuid } from '@vielzeug/toolkit';

const userId = uuid();
const orderId = uuid();

console.log('User ID:', userId);
console.log('Order ID:', orderId);
```

### Usage in Objects

```ts
import { uuid } from '@vielzeug/toolkit';

const items = [
  { id: uuid(), name: 'Item 1' },
  { id: uuid(), name: 'Item 2' },
];
```

## Implementation Notes

- The function ensures that the version bit is set to `4` and the variant bit is set to `10xx` (as per the RFC 4122 spec).
- In environments where a cryptographically secure RNG is not available (though rare in modern environments), it may fall back to `Math.random()`, but this is not recommended for security-sensitive applications.

## See Also

- [random](./random.md): Generate random numbers in a range.
- [draw](./draw.md): Pick a random element from an array.
- [shuffle](./shuffle.md): Randomly reorder an array.
