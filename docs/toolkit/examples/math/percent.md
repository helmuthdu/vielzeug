<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# percent

The `percent` utility calculates what percentage `value` is of `total`, returning a number on the 0–100 scale. Returns `0` when `total` is `0` to avoid division-by-zero errors.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/math/percent.ts
:::

## Features

- **Zero-safe**: Returns `0` when `total` is `0` instead of `Infinity` or `NaN`.
- **0–100 scale**: Standard percentage output, not a 0–1 fraction.
- **Composable**: Pair with `round` for display formatting.

## API

```ts
function percent(value: number, total: number): number;
```

### Parameters

- `value`: The partial value.
- `total`: The whole or reference total.

### Returns

- The percentage as a number on the 0–100 scale.

## Examples

### Basic Usage

```ts
import { percent } from '@vielzeug/toolkit';

percent(25, 100); // 25
percent(1, 3); // 33.333...
percent(50, 200); // 25
percent(0, 100); // 0
percent(5, 0); // 0  — zero-safe
```

### With Rounding

```ts
import { percent, round } from '@vielzeug/toolkit';

round(percent(1, 3), 2); // 33.33
round(percent(2, 3), 1); // 66.7
```

### Progress Bar

```ts
import { percent, clamp, round } from '@vielzeug/toolkit';

function progressBar(current: number, total: number): string {
  const pct = round(clamp(percent(current, total), 0, 100), 1);
  return `${pct}%`;
}

progressBar(45, 200); // '22.5%'
progressBar(200, 200); // '100%'
```

### Completion Stats

```ts
import { percent, round } from '@vielzeug/toolkit';

const tasks = [{ done: true }, { done: false }, { done: true }, { done: true }, { done: false }];

const completed = tasks.filter((t) => t.done).length;
round(percent(completed, tasks.length), 0); // 60
```

## See Also

- [round](./round.md): Round a number to a specific decimal precision.
- [clamp](./clamp.md): Constrain a value between a minimum and maximum.
- [linspace](./linspace.md): Generate evenly-spaced values across a range.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>
