# sleep

Creates a Promise that resolves after a specified amount of time.

## API

```ts
sleep(timeout: number): Promise<void>
```

- `timeout`: Number of milliseconds to wait before resolving.
- Returns: Promise that resolves after the specified time.

## Example

```ts
import { sleep } from '@vielzeug/toolkit';

await sleep(1000); // waits 1 second
```

## Notes

- Use with async/await for delays in async code.
- Useful for testing, polling, or artificial delays.

## Related

- [retry](./retry.md)
- [predict](./predict.md)
