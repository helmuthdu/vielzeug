---
title: Rune — Structured logging for TypeScript
description: Browser/Node logger with levels, namespaces, pluggable transports, lazy bindings, and timing helpers.
package: rune
category: logging
keywords: [logging, console, structured, scoped, transports, remote-logging, levels, namespaces, lazy-bindings]
related: [courier, herald, familiar]
exports: [createLogger, consoleTransport, remoteTransport, jsonTransport, batchTransport, sampleTransport, redactTransport, pipe, lazy, isLevelEnabled]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="rune" />

<img src="/logo-rune.svg" alt="Rune logo" width="156" class="logo-highlight"/>

# Rune

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/rune` &nbsp;·&nbsp; **Category:** Logging

**Key exports:** `createLogger`

**When to use:** Structured browser/Node logging with log levels, namespaced scopes, timing helpers, and optional remote transport.

**Related:** [Courier](/courier/) · [Herald](/herald/) · [Familiar](/familiar/)

</details>

`@vielzeug/rune` is a zero-dependency logger built around a pluggable transport pipeline. It augments the native console with level filtering, namespace scopes, structured log entries, styled badges, lazy bindings, and flexible delivery via composable transport factories.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/rune
```

```sh [npm]
npm install @vielzeug/rune
```

```sh [yarn]
yarn add @vielzeug/rune
```

:::

## Quick Start

```ts
import { Rune, createLogger, lazy } from '@vielzeug/rune';
import { consoleTransport, pipe, remoteTransport, jsonTransport } from '@vielzeug/rune';

// Default logger — uses consoleTransport() automatically
Rune.info('Boot complete');
Rune.warn('Cache stale');
Rune.fatal(new Error('unrecoverable')); // Error auto-serialized

// Namespaced child loggers
const api = createLogger('api');
api.info({ method: 'GET', path: '/users' }, 'request');

// Pinned bindings — lazy() only evaluates when the level passes
const reqLog = api.withBindings({
  requestId: 'abc-123',
  diagnostics: lazy(() => buildDiagnostics()),
});
reqLog.debug('processing'); // diagnostics() called only here

// Structured timing — label is the message; emits { duration_ms } in context
await reqLog.time('db.query', () => runQuery());

// Custom transport pipeline
const serverLog = createLogger({
  logLevel: 'info',
  namespace: 'server',
  transports: [
    consoleTransport({ timestamp: true }),
    remoteTransport({
      handler: async (type, data) => {
        await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
      },
      level: 'error',
    }),
  ],
});

// Node.js: structured JSON for log aggregation
const nodeLog = createLogger({
  transports: [jsonTransport({ level: 'warn' })],
});
```

## Why Rune?

Plain `console.log` lacks structure: no log levels, no namespacing, no remote delivery, no way to silence logs in production.

```ts
// Before — manual approach
if (process.env.NODE_ENV !== 'production') {
  console.log('[api] GET /users', data);
}
fetch('/api/logs', { method: 'POST', body: JSON.stringify({ level: 'error', msg }) });

// After — Rune
import { createLogger } from '@vielzeug/rune';
import { consoleTransport, pipe, remoteTransport } from '@vielzeug/rune';

const api = createLogger({
  namespace: 'api',
  transports: [pipe(
    consoleTransport({ level: 'debug' }),
    remoteTransport({ handler: sendToCollector, level: 'error' }),
  )],
});
api.info({ data }, 'GET /users');
```

| Feature               | Rune                                        | Winston       | Pino       | console |
| --------------------- | ------------------------------------------- | ------------- | ---------- | ------- |
| Bundle size           | <PackageInfo package="rune" type="size" />  | ~44 kB        | ~4 kB      | 0 kB    |
| Browser support       | ✅                                          | ❌            | ❌         | ✅      |
| Scoped loggers        | ✅                                          | Manual        | Child      | ❌      |
| Pluggable transports  | ✅ Built-in factories                       | ✅ Transports | ✅ Streams | ❌      |
| Structured log entry  | ✅ `LogEntry` type                          | Partial       | ✅          | ❌      |
| Lazy bindings         | ✅ `lazy(fn)`                               | ❌            | ❌         | ❌      |
| Styled output         | ✅ CSS badges                               | Text only     | Text only  | Manual  |
| Zero dependencies     | ✅                                          | ❌ (15+)      | ❌ (5+)    | N/A     |

**Use Rune when** you need isomorphic logging (browser + Node.js), namespaced module loggers, or remote error delivery without a heavy dependency chain.

**Consider alternatives when** you need high-throughput file-based logging (Pino), file rotation (Winston), or your team already uses a logging framework.

## Features

- Level filtering (`debug` to `off`) with `enabled()` checks, including `fatal` above `error`
- Structured call signature: `log.info('msg')`, `log.info({ key }, 'msg')`, `log.error(new Error())`
- Auto-serializes `Error` objects into `{ message, name, stack }` — survives JSON.stringify
- Pinned context bindings via `withBindings({ requestId })` — fields on every line
- Lazy bindings via `lazy(fn)` — expensive computations gated behind the level check
- Namespaced child loggers via `createLogger('name')` or `logger.child({ namespace })`
- Middleware pipeline via `use(fn)` — transform or filter entries before transport dispatch
- Logger-level sampling via `sample: 0.1` — drop entries before any transport runs
- Pluggable transport pipeline: `consoleTransport`, `remoteTransport`, `jsonTransport`, `batchTransport`, `sampleTransport`, `redactTransport`
- Fan-out via `pipe()` — dispatch to multiple transports independently, fault-tolerant
- Structured `time()` wrapper: emits the label as message with `{ duration_ms }` in context
- `group()` and `groupCollapsed()` wrappers that auto-close on throw/reject
- `LogEntry` type — the shared contract between logger and transports
- Zero dependencies — <PackageInfo package="rune" type="size" /> gzipped

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Courier](/courier/)
- [Herald](/herald/)
- [Familiar](/familiar/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
