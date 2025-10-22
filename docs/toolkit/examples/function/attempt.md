# attempt

Attempts to execute a function and returns a tuple of [result, error]. Supports both synchronous and asynchronous functions.

## API

```ts
attempt<T>(fn: () => T): [T, null] | [null, unknown]
attempt<T>(fn: () => Promise<T>): Promise<[T, null] | [null, unknown]>
```

- `fn`: Function to execute (sync or async).
- Returns: Tuple `[result, null]` if successful, or `[null, error]` if an error is thrown.
  - If `fn` is async, returns a Promise resolving to the tuple.

## Example

```ts
import { attempt } from '@vielzeug/toolkit';

// Synchronous
const [result, error] = attempt(() => JSON.parse('{"foo": 42}'));
// result: { foo: 42 }, error: null

const [fail, err] = attempt(() => JSON.parse('invalid json'));
// fail: null, err: SyntaxError

// Asynchronous
const [asyncResult, asyncError] = await attempt(async () => {
  const res = await fetch('/api/data');
  return res.json();
});
```

## Notes

- Use for safe execution of code that may throw or reject.
- Avoids the need for try/catch blocks.
- Works with both sync and async functions.

## Related

- [assert](./assert.md)
- [retry](./retry.md)
