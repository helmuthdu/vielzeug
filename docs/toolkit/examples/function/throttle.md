<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-244_B-success" alt="Size">
</div>

# throttle

The `throttle` utility ensures that a function is called at most once in a specified time interval. It is perfect for limiting the execution rate of heavy handlers like scroll, mouse movement, or continuous API polling.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/throttle.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Performance Optimized**: Reduces CPU usage by dropping redundant intermediate calls.
- **Type-safe**: Preserves the argument types of the original function.

## API

```ts
interface ThrottledFunction {
  (...args: any[]): void;
  cancel: () => void;
  flush: () => void;
}

interface ThrottleFunction {
  <T extends (...args: any[]) => any>(fn: T, limit?: number): ThrottledFunction;
}
```

### Parameters

- `fn`: The function you want to throttle.
- `limit`: The minimum time (in milliseconds) that must pass between successive calls to `fn` (defaults to `700`).

### Returns

- A throttled function with two additional methods:
  - `cancel()`: Resets the throttle timer and cancels any pending execution.
  - `flush()`: Immediately executes any pending call.

## Examples

### Scroll Event Handling

```ts
import { throttle } from '@vielzeug/toolkit';

const handleScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
  // Perform heavy calculation or UI update
}, 100);

window.addEventListener('scroll', handleScroll);
```

### Rate-limited Search

```ts
import { throttle } from '@vielzeug/toolkit';

const rateLimitedSearch = throttle((query: string) => {
  console.log('Fetching results for:', query);
}, 1000);

// Only one call will execute per second even if called faster
rateLimitedSearch('a');
rateLimitedSearch('ap');
rateLimitedSearch('app');
```

### Using Cancel and Flush

```ts
import { throttle } from '@vielzeug/toolkit';

const trackEvent = throttle((event) => {
  console.log('Tracking:', event);
}, 2000);

trackEvent('click'); // Executes immediately
trackEvent('click'); // Queued
trackEvent('click'); // Replaces queued

// Reset and cancel pending
trackEvent.cancel();

// Or execute pending immediately
trackEvent('scroll');
trackEvent.flush(); // Executes 'scroll' immediately
```

## Implementation Notes

- The throttled function does not return the result of the original `fn`.
- The first call to the throttled function executes immediately.
- Subsequent calls within the `limit` period are ignored until the timer expires.

## See Also

- [debounce](./debounce.md): Delay execution until a period of inactivity.
- [delay](./delay.md): Pause execution for a specified duration.
- [once](./once.md): Ensure a function is only ever called once.
