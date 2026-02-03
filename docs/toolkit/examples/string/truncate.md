<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.4-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-1004_B-success" alt="Size">
</div>

# truncate

The `truncate` utility shortens a string to a specified length and appends a customizable suffix (like an ellipsis) if the string exceeds that length.

## Implementation

::: details View Source Code
<<< @/../packages/toolkit/src/string/truncate.ts
:::

## Features

- **Isomorphic**: Works in both Browser and Node.js.
- **Configurable**: Choose the maximum length and the suffix to append.
- **Smart Truncation**: Only applies if the string is actually longer than the target length.

## API

```ts
interface TruncateFunction {
  (input: string, length: number, suffix?: string): string;
}
```

### Parameters

- `input`: The string to be truncated.
- `length`: The maximum allowed length of the resulting string, _including_ the suffix.
- `suffix`: The string to append to the end of the truncated result (default: `'...'`).

### Returns

- The truncated string if it was longer than `length`, otherwise the original string.

## Examples

### Basic Truncation

```ts
import { truncate } from '@vielzeug/toolkit';

const text = 'Vielzeug is a Swiss-army knife for TypeScript developers.';

truncate(text, 20); // 'Vielzeug is a Swi...'
```

### Custom Suffix

```ts
import { truncate } from '@vielzeug/toolkit';

truncate('Read more about this topic', 15, ' [...]');
// 'Read more [...]'
```

### Short Strings

```ts
import { truncate } from '@vielzeug/toolkit';

// String is shorter than length, returned as-is
truncate('Hello', 10); // 'Hello'
```

## Implementation Notes

- If the `length` provided is less than or equal to the length of the `suffix`, the behavior may vary depending on the implementation (usually returns just the suffix or a portion of it).
- Does not attempt to truncate at word boundaries; it cuts exactly at the specified character count.

## See Also

- [similarity](./similarity.md): Compare two strings for similarity.
- [camelCase](./camelCase.md): Convert strings to camelCase.
