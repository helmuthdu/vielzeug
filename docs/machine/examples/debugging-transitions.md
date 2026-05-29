---
title: 'Machine Examples — Debugging Transitions'
description: Debugging transitions example for @vielzeug/machine.
---

## Debugging Transitions

### Problem

You need visibility into which guards pass or fail, when invokes start and abort, and a history of recent transitions to diagnose unexpected machine behaviour during development.

### Solution

Pass `debug` hooks and a non-zero `traceLimit` to `interpret()`. All hooks receive typed payloads — only provide the hooks you need.

```ts
import { defineMachine, interpret } from '@vielzeug/machine';
import { machine } from './machine'; // your defineMachine() result

const m = interpret(machine, {
  debug: {
    onEvaluateGuard: ({ from, passed, target }) =>
      console.debug(`[guard] ${from} → ${target}: ${passed ? 'pass' : 'fail'}`),
    onInvokeAbort: ({ invokeId, state }) =>
      console.debug(`[invoke #${invokeId}] aborted in ${state}`),
    onInvokeDone: ({ invokeId, result }) =>
      console.debug(`[invoke #${invokeId}] done`, result),
    onInvokeError: ({ error, invokeId }) =>
      console.error(`[invoke #${invokeId}] error`, error),
    onTransitionSkipped: ({ event, from }) =>
      console.debug(`[skip] ${event.type} in ${from}`),
  },
  onTransition: ({ event, from, to }) =>
    console.info(`[transition] ${from} → ${to} via ${event.type}`),
  traceLimit: 200,
});

// Read the trace ring buffer at any time
const trace = m.getTrace();
console.table(trace.map(({ event, from, timestamp, to }) => ({
  event: event.type,
  from,
  ms: timestamp,
  to,
})));
```

### Pitfalls

- **`can()` does not fire `onEvaluateGuard`.** Guard hooks only fire during `send()`. Use `can()` freely for UI-driven enablement — it adds no debug noise.
- **`traceLimit: 0` disables tracing.** `getTrace()` returns an empty array when tracing is off. The default is `0`, so set a positive limit explicitly if you need trace data.
- **Trace is a ring buffer.** Once the ring is full, new entries overwrite the oldest. Set `traceLimit` large enough to cover the transition sequences you need to inspect.
- **Remove debug hooks in production.** `debug` hooks add per-`send()` overhead. Either omit the `debug` option or gate it behind `import.meta.env.DEV`.

### Related

- [Unit Testing with `resolveTransition()`](./unit-testing.md) — Pure guard testing without a live machine
- [API Reference — `DebugHooks`](/machine/api#debughooksstate-ctx-ev)
- [API Reference — `getTrace()`](/machine/api#machineinstancestate-ctx-ev)
