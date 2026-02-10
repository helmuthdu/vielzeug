<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-~1.2KB-success" alt="Size">
</div>

# attempt

Execute a function with advanced error handling and retry logic.

## Signature

```typescript
function attempt<T extends Fn, R = Awaited<ReturnType<T>>>(
  fn: T,
  options?: {
    identifier?: string;
    retries?: number;
    silent?: boolean;
    timeout?: number;
  },
): Promise<R | undefined>;
```

## Parameters

- `fn` - The function to be executed
- `options.identifier` - Custom identifier for logging purposes
- `options.retries` - Number of retry attempts if the function fails (default: 0)
- `options.silent` - If true, suppresses error logging (default: false)
- `options.timeout` - Timeout in milliseconds for function execution (default: 7000)

## Returns

Promise resolving to the function result or `undefined` if all attempts failed.

## Examples

### Basic Usage

```typescript
import { attempt } from '@vielzeug/toolkit';
const unreliableFunction = async () => {
  if (Math.random() < 0.7) throw new Error('Random failure');
  return 'Success!';
};
const result = await attempt(unreliableFunction, {
  retries: 3,
  timeout: 5000,
  silent: false,
});
console.log(result); // 'Success!' or undefined
```

### With Custom Identifier

```typescript
import { attempt } from '@vielzeug/toolkit';
async function fetchUserData(userId: string) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}
const userData = await attempt(() => fetchUserData('123'), {
  identifier: 'fetchUserData',
  retries: 5,
  timeout: 10000,
});
```

### Silent Mode

```typescript
import { attempt } from '@vielzeug/toolkit';
// Don't log errors
const result = await attempt(riskyOperation, { silent: true, retries: 2 });
if (!result) {
  console.log('Operation failed after all attempts');
}
```

## Related

- [retry](./retry.md) - Retry operations with exponential backoff
- [predict](./predict.md) - Add timeout with AbortSignal
