# 🛠️ Function Utilities Examples

Function utilities help you compose, control, and enhance functions in a type-safe, ergonomic way. Use these helpers for
composing, currying, debouncing, memoizing, and more.

## 📚 Quick Reference

| Method    | Description                          |
| --------- | ------------------------------------ |
| assert       | Assert a condition, throw if false          |
| assertParams | Assert required object keys are non-empty   |
| attempt      | Try/catch wrapper for function calls        |
| compare   | Compare two values                   |
| compareBy | Compare by a selector function       |
| compose   | Compose multiple functions           |
| curry     | Curry a function                     |
| debounce  | Debounce a function                  |
| delay     | Delay function execution             |
| fp        | Functional programming helpers       |
| memo      | Memoize a function                   |
| once      | Run a function only once             |
| pipe      | Pipe value through functions         |
| predict   | Predict value by function            |
| proxy     | Create a proxy for a function/object |
| retry     | Retry a function on failure          |
| sleep     | Sleep for a given time               |
| throttle  | Throttle a function                  |
| worker    | Run a function in a web worker       |

## 🔗 Granular Examples

- [assert](./function/assert.md)
- [assertParams](./function/assertParams.md)
- [attempt](./function/attempt.md)
- [compare](./function/compare.md)
- [compareBy](./function/compareBy.md)
- [compose](./function/compose.md)
- [curry](./function/curry.md)
- [debounce](./function/debounce.md)
- [delay](./function/delay.md)
- [fp](./function/fp.md)
- [memo](./function/memo.md)
- [once](./function/once.md)
- [pipe](./function/pipe.md)
- [predict](./function/predict.md)
- [proxy](./function/proxy.md)
- [retry](./function/retry.md)
- [sleep](./function/sleep.md)
- [throttle](./function/throttle.md)
- [worker](./function/worker.md)

## 💡 Example Usage

```ts
import { debounce, throttle, memo, once, compose, curry } from '@vielzeug/toolkit';

// Debounce a function
const debounced = debounce(() => console.log('debounced'), 100);

// Throttle a function
const throttled = throttle(() => console.log('throttled'), 100);

// Memoize a function
const memoized = memo((x: number) => x * 2);
memoized(2); // 4

// Run a function only once
const onceFn = once(() => Math.random());
onceFn(); // always same value

// Compose functions
const composed = compose(
  (x: number) => x + 1,
  (x: number) => x * 2,
);
composed(2); // 5

// Curry a function
const curried = curry((a: number, b: number) => a + b);
curried(1)(2); // 3
```

## 🔎 See Also

- [Array Utilities](./array.md)
- [Object Utilities](./object.md)
- [Typed Utilities](./typed.md)
