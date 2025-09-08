# delay

Delays the execution of a function by a specified number of milliseconds.

## API

```ts
delay<T>(fn: () => T, wait: number): Promise<T>
```

- `fn`: Function to execute after the delay.
- `wait`: Time in milliseconds to wait before executing the function.
- Returns: Promise resolving to the result of the function.

## Example

```ts
import { delay } from '@vielzeug/toolkit';

async function main() {
  await delay(() => console.log('Hello after 500ms'), 500);
}
main();
```

## Notes

- Useful for scheduling tasks or adding artificial delays.
- Returns a Promise, so can be used with async/await.

## Related

- [debounce](./debounce.md)
- [sleep](./sleep.md)
