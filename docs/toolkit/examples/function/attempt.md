# attempt

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-124_B-success" alt="Size">
</div>

The `attempt` utility safely executes a function and returns a tuple containing either the result or the error. It follows the "Go-style" error handling pattern, allowing you to handle failures without `try/catch` blocks.

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Async Support**: Automatically handles Promises. If the input function returns a Promise, `attempt` returns a Promise resolving to the result/error tuple.
- **Clean Syntax**: Encourages a consistent, flat error-handling style across your codebase.
- **Type-safe**: Correctly typed result and error positions.

## API

```ts
type AttemptResult<T> = [T, null] | [null, any];

interface AttemptFunction {
  <T>(fn: () => T): T extends Promise<infer U> 
    ? Promise<AttemptResult<U>> 
    : AttemptResult<T>
}
```

### Parameters

- `fn`: The function to execute. Can be synchronous or asynchronous.

### Returns

- A tuple: `[result, null]` on success, or `[null, error]` on failure.
- Returns a Promise resolving to this tuple if `fn` is asynchronous.

## Examples

### Synchronous Error Handling

```ts
import { attempt } from '@vielzeug/toolkit';

const [data, error] = attempt(() => JSON.parse('invalid json'));

if (error) {
  console.error('Failed to parse:', error.message);
} else {
  console.log('Parsed data:', data);
}
```

### Asynchronous Operations

```ts
import { attempt } from '@vielzeug/toolkit';

const [user, fetchError] = await attempt(() => fetch('/api/user/1').then(r => r.json()));

if (fetchError) {
  handleError(fetchError);
}
```

## Implementation Notes

- Performance-optimized with minimal overhead compared to a raw `try/catch`.
- If the argument `fn` is not a function, it returns `[null, TypeError]` (depending on implementation, usually it expects a function).
- Works perfectly with `await` for a clean, readable async flow.

## See Also

- [retry](./retry.md): Automatically re-run logic that might fail.
- [assert](./assert.md): Throw errors when conditions are not met.
- [parseJSON](../object/parseJSON.md): Specialized safe JSON parsing.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

## Related

- [assert](./assert.md)
- [retry](./retry.md)
