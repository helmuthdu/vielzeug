# 🎲 Random Utilities Examples

Random utilities help you generate random values, shuffle arrays, and create unique IDs in a type-safe, ergonomic way.
Use these helpers for randomness, sampling, and unique identifiers.

## 📚 Quick Reference

| Method  | Description                         |
| ------- | ----------------------------------- |
| draw    | Draw a random item from an array    |
| random  | Generate a random number            |
| shuffle | Shuffle an array                    |
| uuid    | Generate a unique identifier (UUID) |

## 🔗 Granular Examples

- [draw](./random/draw.md)
- [random](./random/random.md)
- [shuffle](./random/shuffle.md)
- [uuid](./random/uuid.md)

## 💡 Example Usage

```ts
import { random, shuffle, uuid, draw } from '@vielzeug/toolkit';

// Generate a random number between 1 and 10
random(1, 10); // e.g. 7

// Shuffle an array
shuffle([1, 2, 3]); // e.g. [2,1,3]

// Generate a UUID
uuid(); // e.g. 'b7e23e6c-...'

// Draw a random item from an array
draw([1, 2, 3]); // e.g. 2
```

## 🔎 See Also

- [Array Utilities](./array.md)
- [Math Utilities](./math.md)
- [Typed Utilities](./typed.md)
