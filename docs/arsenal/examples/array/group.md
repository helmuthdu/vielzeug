<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1258_B-success" alt="Size">
</div>

## groupBy

The `groupBy` utility groups array items by a selector function and returns a record of arrays.

## Source Code

::: details View Source Code
<<< @/../packages/arsenal/src/array/groupBy.ts
:::

## API

```ts
function groupBy<T>(
  array: T[],
  selector: (item: T, index: number, array: T[]) => string | number | boolean,
): Record<string, T[]>;
```

## Example

```ts
import { groupBy } from '@vielzeug/arsenal';



const users = [
```
