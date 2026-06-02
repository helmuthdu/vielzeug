# isError

Returns `true` if the value is an instance of `Error`.

## Signature

```ts
function isError(value: unknown): value is Error
```

## Examples

### Catch-block narrowing

```ts
import { isError } from '@vielzeug/arsenal';

try {
  JSON.parse('invalid');
} catch (err) {
  if (isError(err)) {
    console.log(err.message); // 'Unexpected token i in JSON at position 0'
  }
}
```

### Filter mixed arrays

```ts
import { isError } from '@vielzeug/arsenal';

const results = [new Error('fail'), 'ok', new TypeError('bad type'), 42];
const errors = results.filter(isError);
// [Error('fail'), TypeError('bad type')]
```

### Distinguish from strings and objects

```ts
import { isError } from '@vielzeug/arsenal';

isError(new Error('oops')); // true
isError(new TypeError());   // true
isError('oops');            // false
isError({ message: 'x' }); // false
```

## Related

- [isAbortError](./isAbortError.md) — Check for `AbortError` specifically
- [assert](../function/assert.md) — Throw if a condition is falsy
