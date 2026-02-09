<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-256_B-success" alt="Size">
</div>

# debounce

The `debounce` utility creates a version of a function that delays its execution until a specified amount of time has passed since it was last called. This is ideal for handling rapid-fire events like window resizing, scrolling, or keystrokes.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/debounce.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Efficient**: Prevents unnecessary processing by grouping multiple calls into one.
- **Type-safe**: Preserves the argument types of the original function.

## API

```ts
type DebouncedFunction = {
  (...args: any[]): void;
  cancel: () => void;
  flush: () => void;
};

function debounce<T extends (...args: any[]) => any>(fn: T, wait?: number): DebouncedFunction;
```

### Parameters

- `fn`: The function you want to debounce.
- `wait`: The number of milliseconds to wait for "silence" before actually calling `fn` (defaults to `300`).

### Returns

- A debounced function with two additional methods:
  - `cancel()`: Cancels any pending execution.
  - `flush()`: Immediately executes any pending call and cancels the timer.

## Examples

### Search Input Handling

```ts
import { debounce } from '@vielzeug/toolkit';

const search = debounce((query: string) => {
  console.log('Searching for:', query);
  // Perform API call here
}, 300);

// Only the last call will execute after 300ms of inactivity
search('a');
search('ap');
search('app');
search('apple');
```

### Window Resize

```ts
import { debounce } from '@vielzeug/toolkit';

const handleResize = debounce(() => {
  console.log('Window resized!');
  // Recalculate layout
}, 250);

window.addEventListener('resize', handleResize);
```

### Using Cancel and Flush

```ts
import { debounce } from '@vielzeug/toolkit';

const saveData = debounce((data) => {
  console.log('Saving:', data);
}, 1000);

saveData({ name: 'Alice' });
saveData({ name: 'Bob' });

// Cancel pending save
saveData.cancel();

// Or immediately execute pending save
saveData({ name: 'Charlie' });
saveData.flush(); // Saves 'Charlie' immediately
```

## Implementation Notes

- The debounced function does not return the result of the original `fn`, as execution is asynchronous.
- Each call to the debounced function clears any existing timer and starts a new one.
- In a Node.js environment, it uses `setTimeout` under the hood.

## See Also

- [throttle](./throttle.md): Execute a function at most once in a specified interval.
- [delay](./delay.md): Pause execution for a specified duration.
- [retry](./retry.md): Automatically retry an asynchronous operation.
