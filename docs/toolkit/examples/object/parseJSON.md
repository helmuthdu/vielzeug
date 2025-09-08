# parseJSON

Parses a JSON string and returns the resulting value, with support for default values, reviver, validation, and silent error handling.

## API

```ts
parseJSON<T>(
  json: unknown,
  options?: {
    defaultValue?: T;
    reviver?: (key: string, value: any) => any;
    validator?: (value: any) => boolean;
    silent?: boolean;
  }
): T | undefined
```

- `json`: The JSON string to parse. If not a string, returns as is or defaultValue if null/undefined.
- `options.defaultValue`: Value to return if parsing fails or validation fails.
- `options.reviver`: Function for custom parsing (see `JSON.parse`).
- `options.validator`: Function to validate the parsed value.
- `options.silent`: If true, suppresses error logging (default: false).
- Returns: Parsed value, or `defaultValue` if parsing/validation fails.

## Example

```ts
import { parseJSON } from '@vielzeug/toolkit';

parseJSON('{"foo": 42}'); // { foo: 42 }
parseJSON('invalid', { defaultValue: { foo: 0 } }); // { foo: 0 }
parseJSON('{"foo": "bar"}', {
  validator: v => typeof v.foo === 'string',
  defaultValue: { foo: '' },
}); // { foo: 'bar' }
parseJSON('{"foo": 42}', {
  reviver: (k, v) => (typeof v === 'number' ? v * 2 : v),
}); // { foo: 84 }
```

## Notes

- Returns `defaultValue` if parsing fails or validation fails.
- If `json` is not a string, returns it as is (unless null/undefined, then returns `defaultValue`).
- Use `silent: true` to suppress error logs.
- Useful for robust and safe JSON parsing in applications.

## Related

- [clone](./clone.md)
- [diff](./diff.md)
