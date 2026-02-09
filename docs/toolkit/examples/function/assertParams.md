<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-384_B-success" alt="Size">
</div>

# assertParams

The `assertParams` utility ensures that specific keys are present and non-empty in a given object. It is designed for validating function arguments or API payloads, providing clear error messages and TypeScript type narrowing.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/function/assertParams.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Bulk Validation**: Check multiple required keys in a single call.
- **Smart Emptiness Check**: Considers `null`, `undefined`, and empty strings (`''`) as missing values.
- **Type Narrowing**: Uses TypeScript's `asserts` signature to guarantee property existence in subsequent code.
- **Contextual Errors**: Include the function or operation name in error messages for better traceability.

## API

```ts
function assertParams<T extends object, K extends keyof T>(
  params: T,
  keys: K[],
  name?: string,
  options?: {
    type?: ErrorConstructor;
    bypass?: boolean;
  },
): asserts params is T & Required<Pick<T, K>>;
```

### Parameters

- `params`: The object to validate.
- `keys`: An array of property names that must be present and non-empty.
- `name`: Optional. A name for the context (e.g., 'UpdateUser') to include in error messages.
- `options`: Optional configuration (see [`assert`](./assert.md)).

### Returns

- `void` (Nothing) if all parameters are valid.

## Examples

### Validating Function Inputs

```ts
import { assertParams } from '@vielzeug/toolkit';

interface User {
  id?: string;
  name?: string;
}

function saveUser(user: User) {
  // Narrow type to ensure id and name exist
  assertParams(user, ['id', 'name'], 'saveUser');

  // No need for optional chaining here
  console.log(user.id.toUpperCase());
}
```

### With Custom Error Types

```ts
import { assertParams } from '@vielzeug/toolkit';

const config = { host: 'localhost' };

// Throws TypeError if 'port' is missing
assertParams(config, ['port'], 'ConfigLoader', { type: TypeError });
```

## Implementation Notes

- Internally leverages the `assert` utility.
- Generates descriptive error messages like: `Missing required parameter: "port" in "ConfigLoader"`.
- If multiple parameters are missing, it lists all of them in the error.

## See Also

- [assert](./assert.md): The underlying generic assertion helper.
- [isEmpty](../typed/isEmpty.md): Check if a value is considered empty.
- [isDefined](../typed/isDefined.md): Check if a value is neither null nor undefined.
