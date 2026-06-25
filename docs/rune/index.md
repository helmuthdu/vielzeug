---
title: Rune — Structured logging for TypeScript
description: Browser/Node logger with levels, namespaces, pluggable transports, lazy bindings, and timing helpers.
package: rune
category: logging
keywords: [logging, console, structured, scoped, transports, remote-logging, levels, namespaces, lazy-bindings]
related: [courier, herald, familiar]
exports:
  [
    createLogger,
    Rune,
    consoleTransport,
    remoteTransport,
    jsonTransport,
    batchTransport,
    sampleTransport,
    redactTransport,
    pipe,
    lazy,
    isLevelEnabled,
    resolveTheme,
    DEFAULT_THEME,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="rune" />

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
  transports: [
    pipe(consoleTransport({ level: 'debug' }), remoteTransport({ handler: sendToCollector, level: 'error' })),
  ],
});
api.info({ data }, 'GET /users');
```

| Feature              | Rune                                                          | Winston                                               | Pino                                               | console                                    |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- | ------------------------------------------ |
| Bundle size          | <PackageInfo package="rune" type="size" />                    | ~44 kB                                                | ~4 kB                                              | 0 kB                                       |
| Browser support      | <ore-icon name="check" size="16"></ore-icon>                    | <ore-icon name="x" size="16"></ore-icon>                | <ore-icon name="x" size="16"></ore-icon>             | <ore-icon name="check" size="16"></ore-icon> |
| Scoped loggers       | <ore-icon name="check" size="16"></ore-icon>                    | Manual                                                | Child                                              | <ore-icon name="x" size="16"></ore-icon>     |
| Pluggable transports | <ore-icon name="check" size="16"></ore-icon> Built-in factories | <ore-icon name="check" size="16"></ore-icon> Transports | <ore-icon name="check" size="16"></ore-icon> Streams | <ore-icon name="x" size="16"></ore-icon>     |
| Structured log entry | <ore-icon name="check" size="16"></ore-icon> `LogEntry` type    | Partial                                               | <ore-icon name="check" size="16"></ore-icon>         | <ore-icon name="x" size="16"></ore-icon>     |
| Lazy bindings        | <ore-icon name="check" size="16"></ore-icon> `lazy(fn)`         | <ore-icon name="x" size="16"></ore-icon>                | <ore-icon name="x" size="16"></ore-icon>             | <ore-icon name="x" size="16"></ore-icon>     |
| Styled output        | <ore-icon name="check" size="16"></ore-icon> CSS badges         | Text only                                             | Text only                                          | Manual                                     |
| Zero dependencies    | <ore-icon name="check" size="16"></ore-icon>                    | <ore-icon name="x" size="16"></ore-icon> (15+)          | <ore-icon name="x" size="16"></ore-icon> (5+)        | N/A                                        |

<div class="decision-callout">

**Use Rune when** you need isomorphic logging (browser + Node.js), namespaced module loggers, or remote error delivery without a heavy dependency chain.

**Consider alternatives when** you need high-throughput file-based logging (Pino), file rotation (Winston), or your team already uses a logging framework.

</div>

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
Rune.fatal({ err: new Error('unrecoverable') }, 'startup failed');

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

## Features

<div class="features-grid">

- Level filtering (`debug` to `off`) with `enabled()` checks, including `fatal` above `error`
- Immutable config after construction — use `child()` or `withBindings()` to scope
- Three call forms: `log.info('msg')`, `log.error(err, { id }, 'msg')` (Error-first), or `log.info({ key: 'val' }, 'msg')` — Error-first form auto-serializes to `data.err`
- `Error` values in context fields are also auto-serialized to `{ message, name, stack }` — survives JSON.stringify
- Pinned context bindings via `withBindings({ requestId })` — fields on every line
- Lazy bindings via `lazy(fn)` — expensive computations gated behind the level check
- Namespaced child loggers via `createLogger('name')` or `logger.child({ namespace })`
- Middleware pipeline via `use(fn)` — transform or filter entries before transport dispatch
- Pluggable transport pipeline: `consoleTransport`, `remoteTransport`, `jsonTransport`, `batchTransport`, `sampleTransport`, `redactTransport`
- Fan-out via `pipe()` — dispatch to multiple transports independently, fault-tolerant
- Structured `time()` wrapper: emits the label as message with `{ duration_ms }` in context
- `group()` and `groupCollapsed()` wrappers that auto-close on throw/reject
- `LogEntry.data` — single merged flat object for transports; no manual merging needed
- Zero dependencies — <PackageInfo package="rune" type="size" /> gzipped

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Courier](/courier/) — HTTP client with built-in request/response interception; pipe Rune as a transport to log every API call with structured context
- [Herald](/herald/) — typed event bus; emit log-level change or flush events across modules without coupling loggers directly
- [Familiar](/familiar/) — Web Worker pool; use Rune inside task functions to surface structured worker-side logs back to the main thread

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
