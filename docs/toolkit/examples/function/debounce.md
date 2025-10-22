# debounce

Creates a debounced version of a function, delaying its execution until after a specified wait time has elapsed since the last call.

## API

```ts
debounce<T extends (...args: any[]) => any>(fn: T, wait: number): (...args: Parameters<T>) => void
```

- `fn`: Function to debounce.
- `wait`: Time in milliseconds to wait before invoking the function.
- Returns: Debounced function.

## Example

```ts
import { debounce } from '@vielzeug/toolkit';

const log = debounce((msg: string) => console.log(msg), 200);
log('Hello');
log('World'); // Only 'World' will be logged after 200ms
```

## Notes

- Useful for limiting the rate of function calls (e.g., in event handlers).
- Only the last call within the wait period is executed.

## Related

- [delay](./delay.md)
- [throttle](./throttle.md)
