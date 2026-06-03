---
title: 'Clockwork Examples — Debugging Transitions'
description: Debugging transitions example for @vielzeug/clockwork.
---

## Debugging Transitions

### Problem

You need visibility into which guards pass or fail, when invokes start and abort, and a history of recent transitions to diagnose unexpected machine behaviour during development.

### Solution

Pass `debug` options to `interpret()`. The `onDebug` callback receives a discriminated union of all debug events — pattern-match on `type` to handle specific cases.

```ts
import { defineMachine, interpret } from '@vielzeug/clockwork';
import { machine } from './machine'; // your defineMachine() result

const m = interpret(machine, {
  debug: {
    onDebug: (event) => {
      switch (event.type) {
        case 'guard':
          console.debug(`[guard] ${event.from} → ${event.target}: ${event.passed ? 'pass' : 'fail'}`);
          break;
        case 'transition-skipped':
          console.debug(`[skip] ${event.event.type} in ${event.from}`);
          break;
        case 'invoke-start':
          console.debug(`[invoke #${event.invokeId}] started in ${event.state}`);
          break;
        case 'invoke-done':
          console.debug(`[invoke #${event.invokeId}] done`, event.result);
          break;
        case 'invoke-error':
          console.error(`[invoke #${event.invokeId}] error`, event.error);
          break;
        case 'invoke-abort':
          console.debug(`[invoke #${event.invokeId}] aborted in ${event.state}`);
          break;
      }
    },
    onTransition: ({ event, from, to }) => console.info(`[transition] ${from} → ${to} via ${event.type}`),
    traceLimit: 200,
  },
});

// Read the trace ring buffer at any time
const trace = m.getTrace();
console.table(
  trace.map(({ event, from, timestamp, to }) => ({
    event: event.type,
    from,
    ms: timestamp,
    to,
  })),
);
```

### Pitfalls

- **`can()` does not fire debug events.** Guard evaluation in `can()` is silent. Use `can()` freely for UI-driven enablement without adding debug noise.
- **`traceLimit: 0` disables tracing.** `getTrace()` returns an empty array when tracing is off. The default is `0`, so set a positive limit explicitly if you need trace data.
- **Trace is a ring buffer.** Once the ring is full, new entries overwrite the oldest. Set `traceLimit` large enough to cover the transition sequences you need to inspect.
- **`getTrace()` returns cloned entries.** Mutating the returned array or entries does not affect the internal buffer.
- **Remove debug hooks in production.** `debug` hooks add per-`send()` overhead. Either omit the `debug` option or gate it behind `import.meta.env.DEV`.

### Related

- [Unit Testing with `resolveTransition()`](./unit-testing.md) — Pure guard testing without a live machine
- [API Reference — `DebugEvent`](/clockwork/api#debugeventstate-ctx-ev)
- [API Reference — `MachineInstance`](/clockwork/api#machineinstancestate-ctx-ev)
