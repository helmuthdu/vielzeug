# assert

Asserts that a condition (or array of conditions) is true. Throws an error or logs a warning if the assertion fails, with support for custom error types, debugging info, and bypass mode.

## API

```ts
assert(
  condition: boolean | boolean[],
  message?: string,
  options?: {
    type?: ErrorConstructor;
    args?: Obj;
    bypass?: boolean;
  }
): void
```

- `condition`: Boolean or array of booleans to assert. If any are false, the assertion fails.
- `message`: Optional error message (default: 'Assertion failed').
- `options.type`: Error class to throw (default: `Error`).
- `options.args`: Object with debugging info (included in error message).
- `options.bypass`: If true, logs a warning instead of throwing.
- Throws: Error (or custom error type) if assertion fails and `bypass` is not set.

## Example

```ts
import { assert } from '@vielzeug/toolkit';

assert(Array.isArray([])); // Passes, does nothing
assert(typeof 'foo' === 'string', 'Must be string'); // Passes
assert(false, 'This will throw'); // Throws Error: This will throw

assert([true, false], 'Some failed'); // Throws Error: Some failed

assert(1 > 2, 'Should fail', { type: TypeError }); // Throws TypeError
assert(1 > 2, 'Debug info', { args: { value: 1 } }); // Error includes args
assert(false, 'Soft fail', { bypass: true }); // Logs warning instead of throwing
```

## Notes

- Supports multiple conditions via array.
- Use `args` to include variable values for debugging.
- Use `bypass` for soft assertions (logs warning).
- Custom error types supported via `type`.

## Related

- [attempt](./attempt.md)
- [compare](./compare.md)
