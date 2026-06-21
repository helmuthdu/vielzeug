---
title: 'Clockwork Examples — Debugging Transitions'
description: Debugging transitions example for @vielzeug/clockwork.
---

## Debugging Transitions

### Problem

You need visibility into which guards pass or fail, when invokes start and abort, and a history of recent transitions to diagnose unexpected machine behaviour during development.

### Solution

Pass `onDebug` and `traceLimit` to `createMachine().start()`. The `onDebug` callback receives a discriminated union of all debug events — pattern-match on `type` to handle specific cases.

```ts
import { createMachine } from '@vielzeug/clockwork';
import { config } from './machine'; // your machine config object

const m = createMachine(config).start({
  onDebug: (event) => {
    switch (event.type) {
      case 'guard':
        console.debug(`[guard] ${event.from} → ${event.target}: ${event.passed ? 'pass' : 'fail'}`);
        break;
      case 'transition':
        console.info(`[transition] ${event.from} → ${event.to} via ${event.event.type}`);
        break;
      case 'transition-skipped':
        console.debug(`[skip] ${event.event.type} in ${event.from}`);
        break;
      case 'invoke-start':
        console.debug(`[invoke #${event.invokeId}] started in ${event.state}`);
        break;
      case 'invoke-done':
        console.debug(`[invoke #${event.invokeId}] done`);
        break;
      case 'invoke-error':
        console.error(`[invoke #${event.invokeId}] error`, event.error);
        break;
      case 'invoke-abort':
        console.debug(`[invoke #${event.invokeId}] aborted in ${event.state}`);
        break;
    }
  },
  traceLimit: 200,
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
- **Auto-enabled tracing.** When `onDebug` is set, a 50-entry trace buffer is enabled automatically. Set `traceLimit: 0` to opt out explicitly.
- **Trace is a ring buffer.** Once the ring is full, new entries overwrite the oldest. Set `traceLimit` large enough to cover the transition sequences you need to inspect.
- **`getTrace()` returns cloned entries.** Mutating the returned array or entries does not affect the internal buffer.
- **Remove debug hooks in production.** `onDebug` adds per-`send()` overhead. Either omit it or gate behind `import.meta.env.DEV`. Use `debugMachine` from `@vielzeug/clockwork/devtools` for zero-effort development logging.

### Related

- [Unit Testing with `.resolve()`](./unit-testing.md) — Pure guard testing without a live machine
- [API Reference — `DebugEvent`](/clockwork/api#debugeventstate-ctx-ev)
- [API Reference — `MachineInstance`](/clockwork/api#machineinstancestate-ctx-ev)
