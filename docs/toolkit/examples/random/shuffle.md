<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-196_B-success" alt="Size">
</div>

# shuffle

The `shuffle` utility creates a new array with the elements of the original array in a randomized order. It uses the efficient Fisher-Yates algorithm to ensure a truly uniform shuffle.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/random/shuffle.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Uniform Distribution**: Every possible permutation of the array has an equal probability.
- **Immutable**: Returns a new array, leaving the original array unchanged.
- **Type-safe**: Preserves the type of the array elements.

## API

```ts
interface ShuffleFunction {
  <T>(array: T[]): T[];
}
```

### Parameters

- `array`: The array to shuffle.

### Returns

- A new array containing the same elements in a random order.

## Examples

### Shuffling a Deck

```ts
import { shuffle } from '@vielzeug/toolkit';

const deck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const shuffled = shuffle(deck);

console.log('Original:', deck);
console.log('Shuffled:', shuffled);
```

### Randomizing a List of Users

```ts
import { shuffle } from '@vielzeug/toolkit';

const players = ['Alice', 'Bob', 'Charlie', 'David'];
const randomOrder = shuffle(players);
```

## Implementation Notes

- Uses the Fisher-Yates (also known as Knuth) shuffle algorithm.
- Complexity is $O(n)$ where $n$ is the length of the array.
- Throws `TypeError` if the input is not an array.

## See Also

- [draw](./draw.md): Pick a single random element from an array.
- [random](./random.md): Generate a random number in a range.
- [sort](../array/sort.md): Sort an array based on a specific criteria.
