# throttle

Creates a throttled function that only invokes the provided function at most once per every specified milliseconds.

## API

```ts
throttle<T extends Fn>(fn: T, delay?: number): (...args: Parameters<T>) => void
```

- `fn`: Function to throttle.
- `delay`: Number of ms to wait before next invocation (default: 700).
- Returns: Throttled function.

## Example

```ts
import { throttle } from '@vielzeug/toolkit';

const log = () => console.log('Hello, world!');
const throttledLog = throttle(log, 1000);
throttledLog(); // logs 'Hello, world!' immediately
throttledLog(); // does nothing if called again within 1 second
setTimeout(throttledLog, 1000); // logs after 1 second
```

## Notes

- Useful for rate-limiting event handlers.
- Only the first call in each interval is executed.
- Subsequent calls within the interval are ignored.

## Related

- [debounce](./debounce.md)
- [once](./once.md)
