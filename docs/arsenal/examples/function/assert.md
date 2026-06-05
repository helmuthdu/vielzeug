---
title: 'Arsenal Examples — assert'
description: 'assert example for @vielzeug/arsenal.'
---

## assert

### Problem

You need to validate a runtime condition and have TypeScript narrow the type when it passes — for example asserting a parsed value matches an expected shape.

### Solution

Use `assert(condition, message?, options?)` to throw if the condition is falsy. TypeScript narrows the type after the assertion via `asserts condition`.

```ts
import { assert } from '@vielzeug/arsenal';

function process(id: string | undefined) {
  assert(id !== undefined, 'id is required');
  id; // string — undefined narrowed away
}
```

#### Custom error class

```ts
import { assert } from '@vielzeug/arsenal';

assert(value >= 0, 'value must be non-negative', { type: RangeError });
// throws RangeError('value must be non-negative') when condition is false
```

### Pitfalls

- `assert` throws synchronously — it cannot be used inside async validators as a replacement for `await`.
- The `type` option accepts any `ErrorConstructor`; it does not wrap the error.

### Related

- [attempt](../async/attempt.md)
- [isMatch](../typed/isMatch.md)
