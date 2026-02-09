<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-132_B-success" alt="Size">
</div>

# random

The `random` utility generates a pseudo-random integer between two specified values (inclusive). It simplifies common randomization tasks like picking a range, rolling dice, or generating random offsets.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/random/random.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Inclusive Range**: Includes both the minimum and maximum values in the potential output.
- **Robust**: Automatically handles cases where `min` is greater than `max` by swapping them.
- **Integer Output**: Always returns a whole number.

## API

```ts
function random(min?: number, max?: number): number;
```

### Parameters

- `min`: Optional. The lower bound of the range (defaults to `0`).
- `max`: Optional. The upper bound of the range (defaults to `100`).

### Returns

- A random integer between `min` and `max` (inclusive).

## Examples

### Basic Usage

```ts
import { random } from '@vielzeug/toolkit';

// Random number between 0 and 100
random();

// Random number between 1 and 10
random(1, 10);
```

### Die Roll Example

```ts
import { random } from '@vielzeug/toolkit';

function rollDie() {
  return random(1, 6);
}

console.log(`You rolled a ${rollDie()}`);
```

## Implementation Notes

- Performance-optimized using `Math.random()`.
- Swaps `min` and `max` internally if `min > max` to prevent errors.
- Uses `Math.floor` to ensure integer results.

## See Also

- [draw](./draw.md): Pick a random element from an array.
- [shuffle](./shuffle.md): Randomly reorder an entire array.
- [uuid](./uuid.md): Generate a unique identifier.
