<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
</div>

# prune

The `prune` utility recursively removes null, undefined, empty strings, and empty objects/arrays from a value. It works on strings, arrays, and objects, returning `undefined` when the entire value would be empty after pruning.

## Source Code

::: details View Source Code
<<< @/../packages/toolkit/src/object/prune.ts
:::

## Features

- **Recursive**: Deeply cleans nested structures.
- **Multi-type**: Works on strings, arrays, and objects with the same API.
- **Edge-safe**: Returns `undefined` rather than empty containers.

## API

```ts
function prune<T>(value: T): T | undefined;
```

### Parameters

- `value`: The value to prune. Can be a string, array, object, or any other type (passthrough).

### Returns

- The pruned value, or `undefined` if the result would be entirely empty.

## Examples

### Strings

```ts
import { prune } from '@vielzeug/toolkit';

prune('  hello  '); // 'hello'
prune('   ');       // undefined
prune('');          // undefined
```

### Arrays

```ts
import { prune } from '@vielzeug/toolkit';

prune([1, null, '', 2, undefined, 3]); // [1, 2, 3]
prune([null, undefined, '']);          // undefined
```

### Objects

```ts
import { prune } from '@vielzeug/toolkit';

prune({ a: 1, b: null, c: '', d: 2 });
// { a: 1, d: 2 }

prune({ a: { b: null, c: '' }, d: 1 });
// { d: 1 }

prune({ a: null, b: undefined });
// undefined
```

### Sanitising API Payloads

```ts
import { prune } from '@vielzeug/toolkit';

const formData = {
  name: '  Alice  ',
  email: '',
  address: {
    street: '123 Main St',
    apartment: '',
    city: 'Wonderland',
  },
  tags: ['typescript', null, '', 'toolkit'],
};

prune(formData);
/*
{
  name: 'Alice',
  address: { street: '123 Main St', city: 'Wonderland' },
  tags: ['typescript', 'toolkit'],
}
*/
```

## See Also

- [diff](./diff.md): Find differences between two objects.
- [merge](./merge.md): Deep-merge cleaned objects.

<style>
.badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
</style>
