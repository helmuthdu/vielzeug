# once

Creates a function that runs only once and returns the first result. The function can be reset to allow another run.

## API

```ts
once<T extends Fn>(fn: T): T & { reset: () => void }
```

- `fn`: Function to wrap.
- Returns: Function that runs only once and has a `reset` method.

## Example

```ts
import { once } from '@vielzeug/toolkit';

const onceRandom = once(() => Math.random());
onceRandom(); // e.g. 0.3
onceRandom(); // 0.3 (same result)
onceRandom.reset();
onceRandom(); // e.g. 0.2 (new result)
```

## Notes

- Use for initialization or one-time computations.
- Call `.reset()` to allow the function to run again.

## Related

- [memo](./memo.md)
- [throttle](./throttle.md)
