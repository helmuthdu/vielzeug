<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-312_B-success" alt="Size">
</div>

# assert

The `assert` utility validates conditions during runtime. If a condition (or any condition in a list) is false, it throws a customizable error. It features advanced debugging options, support for various error types, and a "bypass" mode for soft warnings.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/assert.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Multiple Conditions**: Pass a single boolean or an array of conditions.
- **Customizable Errors**: Specify the error message and the Error class to throw (e.g., `TypeError`).
- **Debugging Info**: Attach metadata to errors for easier troubleshooting.
- **Soft Assertions**: Use `bypass` mode to log warnings instead of throwing.

## API

```ts
interface AssertOptions {
  type?: ErrorConstructor;
  args?: Record<string, any>;
  bypass?: boolean;
}

interface AssertFunction {
  (condition: boolean | boolean[], message?: string, options?: AssertOptions): void;
}
```

### Parameters

- `condition`: A boolean or an array of booleans to check.
- `message`: Optional. The error message to display (defaults to `'Assertion failed'`).
- `options`: Optional configuration:
  - `type`: The constructor of the error to throw (defaults to `Error`).
  - `args`: An object containing variables or state to include in the error details.
  - `bypass`: If `true`, logs a warning to the console instead of throwing an exception.

### Returns

- `void` (Nothing) if the assertion passes.

## Examples

### Basic Validation

```ts
import { assert } from '@vielzeug/toolkit';

assert(1 + 1 === 2); // OK
assert(users.length > 0, 'Users list cannot be empty'); // Throws if empty
```

### Advanced Debugging

```ts
import { assert } from '@vielzeug/toolkit';

function process(data: any) {
  assert(data.id, 'Missing ID', {
    type: TypeError,
    args: { received: data },
  });
}
```

### Soft Assertion (Bypass)

```ts
import { assert } from '@vielzeug/toolkit';

// Logs warning instead of crashing the app
assert(isLoaded, 'Not loaded yet, continuing anyway...', { bypass: true });
```

## Implementation Notes

- If an array of conditions is provided, it returns `true` only if **every** item is truthy.
- In `bypass` mode, it uses `console.warn` to log the failure.
- Performance is optimized for minimal overhead when assertions pass.

## See Also

- [assertParams](./assertParams.md): Validate function arguments against types.
- [attempt](./attempt.md): Safely execute logic and ignore errors.
- [isDefined](../typed/isDefined.md): Common check used within assertions.
