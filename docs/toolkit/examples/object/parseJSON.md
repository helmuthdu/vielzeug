<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1856_B-success" alt="Size">
</div>

# parseJSON

The `parseJSON` utility provides a safe and robust way to parse JSON strings. It includes built-in error handling, support for default values, optional validation, and a customizable reviver function, ensuring that your application doesn't crash on malformed input.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/object/parseJSON.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Safe Parsing**: Automatically catches and handles syntax errors silently or with logging.
- **Fallback Support**: Specify a default value to return if parsing fails.
- **Integrated Validation**: Pass a validator function to ensure the parsed data meets your requirements.
- **Reviver Support**: Full compatibility with the native `JSON.parse` reviver parameter.

## API

::: details Type Definitions
<<< @/../packages/toolkit/src/object/parseJSON.ts#ParseJSONOptions
:::

```ts
function parseJSON<T>(json: unknown, options?: ParseJSONOptions<T>): T | undefined
```

### Parameters

- `json`: The data to parse. If it's not a string, it will be returned as-is (if it's already an object/array) or substituted with the `defaultValue`.
- `options`: Optional configuration:
  - `defaultValue`: The value to return if parsing fails or validation fails.
  - `reviver`: A function that transforms the results as they are parsed.
  - `validator`: A function that receives the parsed value and must return `true` for the result to be considered valid.
  - `silent`: If `true`, suppresses error logging to the console when parsing fails (defaults to `false`).

### Returns

- The parsed value, or the `defaultValue` if parsing or validation fails.

## Examples

### Basic Safe Parsing

```ts
import { parseJSON } from '@vielzeug/toolkit';

// Valid JSON
parseJSON('{"active": true}'); // { active: true }

// Invalid JSON with fallback
parseJSON('invalid { json', { defaultValue: { active: false } });
// { active: false }
```

### Parsing with Validation

```ts
import { parseJSON } from '@vielzeug/toolkit';

const raw = '{"id": 123, "name": "Alice"}';

// Validate that 'id' is a number
const user = parseJSON(raw, {
  validator: (v) => typeof v.id === 'number',
  defaultValue: { id: 0, name: 'Guest' },
});
```

### Using a Reviver

```ts
import { parseJSON } from '@vielzeug/toolkit';

const raw = '{"amount": 42}';

// Double all numbers during parsing
const doubled = parseJSON(raw, {
  reviver: (k, v) => (typeof v === 'number' ? v * 2 : v),
});
// { amount: 84 }
```

## Implementation Notes

- If the input `json` is already an object or array (not `null`), it skips the `JSON.parse` step but still runs the `validator` if provided.
- If `null` or `undefined` is passed as the input, it immediately returns the `defaultValue`.
- Throws nothing by default; all errors are caught and handled based on the `silent` option.

## See Also

- [clone](./clone.md): Create a copy of a parsed object.
- [path](./path.md): Safely access nested properties of the parsed object.
- [merge](./merge.md): Combine the parsed object with default settings.
