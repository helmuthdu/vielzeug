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
    defaultLogger,
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
    PRIORITY,
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="rune" />

## Why Rune?

Plain `console.log` lacks structure: no log levels, no namespacing, no remote delivery, no way to silence logs in production.

```ts
// Before — manual approach
const path = '/users';
console.log(`[api] GET ${path}`);
fetch('/api/logs', { body: JSON.stringify({ level: 'error', path }), method: 'POST' });

// After — Rune
import { consoleTransport, createLogger, remoteTransport } from '@vielzeug/rune';

const api = createLogger({
  namespace: 'api',
  transports: [
    consoleTransport({ level: 'debug' }),
    remoteTransport({
      handler: (_type, data) => console.debug('remote log', data),
      level: 'error',
    }),
  ],
});

api.info({ method: 'GET', path }, 'request');
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
import { batchTransport, consoleTransport, createLogger, lazy, remoteTransport } from '@vielzeug/rune';

const log = createLogger({
  logLevel: 'debug',
  namespace: 'server',
  transports: [
    consoleTransport({ timestamp: true }),
    remoteTransport({
      handler: (_type, data) => console.debug('remote log', data),
      level: 'error',
    }),
  ],
});

const requestLog = log.withBindings({
  diagnostics: lazy(() => ({ queueDepth: 0 })),
  requestId: 'abc-123',
});

requestLog.info({ method: 'GET', path: '/users' }, 'request');
const users = await requestLog.time('load users', () => Promise.resolve(['user-1']));
console.log(users);

const batch = batchTransport({ onFlush: (entries) => console.debug('batch', entries) });
const bufferedLog = createLogger({ transports: [batch.transport] });

bufferedLog.info('queued for delivery');
await batch.dispose();
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
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Courier](/courier/) — HTTP client with built-in request/response interception; pipe Rune as a transport to log every API call with structured context
- [Herald](/herald/) — typed event bus; emit log-level change or flush events across modules without coupling loggers directly
- [Familiar](/familiar/) — Web Worker pool; use Rune inside task functions to surface structured worker-side logs back to the main thread

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
