# runAll

Runs all functions in an array, collecting errors. If one function throws, the rest still run. Throws a single `Error` or `AggregateError` at the end.

## Signature

```ts
type RunAllOptions = {
  context?: string;
  reverse?: boolean;
};

function runAll(fns: Array<() => void>, options?: RunAllOptions): void;
```

## Parameters

- `fns` — Array of functions to run.
- `options.reverse` — If `true`, runs in reverse order (useful for teardown stacks).
- `options.context` — Optional prefix included in the `AggregateError` message.

## Examples

### Cleanup handlers

```ts
import { runAll } from '@vielzeug/arsenal';

const cleanups: Array<() => void> = [];

cleanups.push(() => console.log('close db'));
cleanups.push(() => {
  throw new Error('close socket failed');
});
cleanups.push(() => console.log('clear timers'));

// All three run; the error is collected and thrown at the end
try {
  runAll(cleanups, { reverse: true, context: 'teardown' });
} catch (err) {
  console.error(err); // AggregateError or Error
}
```

### Event listeners cleanup

```ts
import { runAll } from '@vielzeug/arsenal';

function createSubscription() {
  const unsubscribers: Array<() => void> = [];

  unsubscribers.push(addEventListener('click', handler1));
  unsubscribers.push(addEventListener('resize', handler2));

  return () => runAll(unsubscribers);
}
```

### Single failure re-thrown directly

```ts
import { runAll } from '@vielzeug/arsenal';

const err = new Error('oops');
try {
  runAll([
    () => {
      throw err;
    },
    () => console.log('still runs'),
  ]);
} catch (e) {
  console.log(e === err); // true — single error re-thrown directly
}
```

## Related

- [once](./once.md) — Run a function only once
- [tap](./tap.md) — Side-effect passthrough
