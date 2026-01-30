# assertParams

Asserts that specified keys are present in an object and are not empty strings. Throws an error or logs a warning if any required parameter is missing, with support for custom error types, context names, and bypass mode.

## API

```ts
assertParams<T extends object, K extends keyof T>(
  params: T,
  keys: K[],
  name?: string,
  options?: {
    type?: ErrorConstructor;
    bypass?: boolean;
  }
): asserts params is T & Required<Pick<T, K>>
```

- `params`: The object containing the parameters to check.
- `keys`: An array of keys that must be present and non-empty in the `params` object.
- `name`: Optional name for the context (e.g., function name), included in the error message.
- `options.type`: Error class to throw (default: `Error`).
- `options.bypass`: If true, logs a warning instead of throwing.
- Throws: Error (or custom error type) if any required keys are missing or empty strings and `bypass` is not set.

## Example

```ts
import { assertParams } from '@vielzeug/toolkit';

const params = { id: '123', name: '', age: 25 };

// Passes, does nothing
assertParams(params, ['id', 'age']);

// Throws Error: Missing required parameter: "name"
assertParams(params, ['name']);

// Throws Error: Missing required parameter: "name" in "UserUpdate"
assertParams(params, ['name'], 'UserUpdate');

// Throws TypeError: Missing required parameters: "id", "name"
assertParams({ id: '', name: '' }, ['id', 'name'], '', { type: TypeError });

// Logs warning instead of throwing
assertParams({}, ['id'], 'SoftCheck', { bypass: true });
```

## Notes

- A parameter is considered missing if it is `undefined`, `null`, or an empty string (`''`).
- Uses `assert` internally to handle error throwing or logging.
- Includes TypeScript `asserts` signature for type narrowing.

## Related

- [assert](./assert.md)
- [isDefined](../typed/isDefined.md)
- [isEmpty](../typed/isEmpty.md)
