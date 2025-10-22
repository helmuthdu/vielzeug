# worker

Creates a function that runs the provided callback in a web worker with optional dependencies.

## API

```ts
worker<T extends (...args: any) => any, R = Awaited<ReturnType<T>>>(
  callback: (self: any) => T,
  dependencies?: string[]
): (...args: Parameters<T>) => Promise<R>
```

- `callback`: Function that receives the worker's `self` and returns a function to run in the worker.
- `dependencies`: Array of script URLs to import in the worker (optional).
- Returns: Function that runs in a web worker and returns a Promise with the result.

## Example

```ts
import { worker } from '@vielzeug/toolkit';

const sum = worker(
  ({ _ }) =>
    (...args) =>
      _.sum([...args]),
  ['https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js'],
);
await sum(1, 2); // 3
```

## Notes

- Use for offloading heavy computations to a separate thread.
- Dependencies are loaded via importScripts in the worker.
- Returns a Promise for async usage.

## Related

- [predict](./predict.md)
- [sleep](./sleep.md)
