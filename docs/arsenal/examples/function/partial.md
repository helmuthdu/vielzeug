# partial

Bind one or more leading arguments to a function, returning a new function that accepts the remaining arguments.

## Signature

```ts
function partial<Args extends unknown[], BoundArgs extends Partial<Args>, R>(
  fn: (...args: Args) => R,
  ...bound: BoundArgs
): (...rest: RemainingArgs<Args, BoundArgs>) => R;
```

## Examples

### Basic usage

```ts
import { partial } from '@vielzeug/arsenal';

const add = (a: number, b: number) => a + b;
const add10 = partial(add, 10);

add10(5); // 15
add10(20); // 30
```

### Bind multiple arguments

```ts
import { partial } from '@vielzeug/arsenal';

const greet = (greeting: string, name: string, punctuation: string) => `${greeting}, ${name}${punctuation}`;

const hello = partial(greet, 'Hello');
hello('Alice', '!'); // 'Hello, Alice!'

const helloAlice = partial(greet, 'Hello', 'Alice');
helloAlice('?'); // 'Hello, Alice?'
```

### With array callbacks

```ts
import { partial } from '@vielzeug/arsenal';

const multiply = (factor: number, values: number[]) => values.map((n) => n * factor);
const double = partial(multiply, 2);

double([1, 2, 3]); // [2, 4, 6]
```

## Related

- [curry](./curry.md) — Auto-curried wrapper for any function
- [compose](./compose.md) — Right-to-left function composition
- [pipe](./pipe.md) — Left-to-right function composition
