# 🎲 Random Utilities

Random utilities provide tools to generate random values, shuffle data, and create unique identifiers. These helpers are designed for everyday tasks like sampling, randomization, and unique key generation.

## 📚 Quick Reference

| Method | Description |
| :--- | :--- |
| [`random`](./random/random.md) | Generate a random integer between a minimum and maximum value. |
| [`draw`](./random/draw.md) | Pick a random element from an array. |
| [`shuffle`](./random/shuffle.md) | Create a new array with the elements of the original array in random order. |
| [`uuid`](./random/uuid.md) | Generate a cryptographically strong unique identifier (v4). |

## 💡 Practical Examples

### Sampling & Randomization

```ts
import { random, draw, shuffle } from '@vielzeug/toolkit';

// 1. Random number in range
const dieRoll = random(1, 6);

// 2. Pick a winner from an array
const contestants = ['Alice', 'Bob', 'Charlie', 'David'];
const winner = draw(contestants);

// 3. Randomize a list (original array is not modified)
const deck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const shuffledDeck = shuffle(deck);
```

### Unique Identifiers

```ts
import { uuid } from '@vielzeug/toolkit';

// Generate a unique ID for a new record
const newUserId = uuid(); 
// "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

## 🔗 All Random Utilities

<div class="grid-links">

- [draw](./random/draw.md)
- [random](./random/random.md)
- [shuffle](./random/shuffle.md)
- [uuid](./random/uuid.md)

</div>

<style>
.grid-links ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.5rem;
  list-style: none !important;
  padding: 0 !important;
}
.grid-links li {
  margin: 0 !important;
}
</style>
