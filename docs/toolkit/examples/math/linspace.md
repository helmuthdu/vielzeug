<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# linspace

The `linspace` utility generates an array of `steps` evenly-spaced numbers from `start` to `end` (inclusive on both ends), similar to NumPy's `linspace`.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/math/linspace.ts
:::

## Features

- **Inclusive endpoints**: Both `start` and `end` are always included.
- **Configurable count**: Control exactly how many points to generate.
- **Descending support**: Works correctly when `start > end`.

## API

```ts
function linspace(start: number, end: number, steps?: number): number[];
```

### Parameters

- `start`: The first value in the output array.
- `end`: The last value in the output array.
- `steps`: Number of evenly-spaced points to generate (default: `5`).

### Returns

- An array of `steps` numbers, linearly interpolated from `start` to `end`.
- Returns `[]` when `steps <= 0`, and `[start]` when `steps === 1`.

## Examples

### Basic Usage

```ts
import { linspace } from '@vielzeug/toolkit';

linspace(0, 10); // [0, 2.5, 5, 7.5, 10]
linspace(0, 10, 3); // [0, 5, 10]
linspace(0, 10, 11); // [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```

### Descending Range

```ts
import { linspace } from '@vielzeug/toolkit';

linspace(10, 0, 5); // [10, 7.5, 5, 2.5, 0]
```

### Edge Cases

```ts
import { linspace } from '@vielzeug/toolkit';

linspace(5, 5, 4); // [5, 5, 5, 5]  — start equals end
linspace(0, 10, 1); // [0]
linspace(0, 10, 0); // []
```

### Chart Axis Ticks

```ts
import { linspace } from '@vielzeug/toolkit';

// Generate 6 evenly-spaced tick labels for a y-axis from 0 to 100
const ticks = linspace(0, 100, 6); // [0, 20, 40, 60, 80, 100]
```

## See Also

- [range](./range.md): Generate an integer range with a step increment.
- [percent](./percent.md): Calculate what percentage a value is of a total.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>
