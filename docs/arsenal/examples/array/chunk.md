---
title: 'Arsenal Examples — chunk'
description: 'chunk example for @vielzeug/arsenal.'
---

## chunk

### Problem

You have a flat array (or string) and need to split it into fixed-size pages or sliding windows — for example paginating a list or building bigram tokens.

### Solution

Use `chunk(input, size)` to split an array or string into sub-arrays of at most `size` items. The last chunk contains the remainder.

```ts
import { chunk } from '@vielzeug/arsenal';

const pages = chunk([1, 2, 3, 4, 5, 6, 7], 3);
// [[1, 2, 3], [4, 5, 6], [7]]
```

#### String input

```ts
import { chunk } from '@vielzeug/arsenal';

chunk('hello', 2); // ['he', 'll', 'o']
chunk('hello', 2, { pad: '_' }); // ['he', 'll', 'o_']
chunk('abcd', 2, { overlap: true }); // ['ab', 'bc', 'cd']
```

### Pitfalls

- Throws `RangeError` if `size` is less than 1.
- The last chunk may be shorter than `size` when the input length is not evenly divisible.
- String mode and array mode return different types: `string[]` vs `T[][]`.

### Related

- [flatten](./flatten.md)
- [take](./take.md)
- [partition](./partition.md)
