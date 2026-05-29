---
title: Rune — Structured logging for TypeScript
description: Browser/Node logger with levels, namespaces, timing helpers, and optional remote transport.
package: rune
category: logging
keywords: [logging, console, structured, scoped, remote-logging, levels, namespaces]
related: [courier, relay, worker]
exports: [createLogger]
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

**Related:** [Courier](/courier/) · [Relay](/relay/) · [Worker](/worker/)

</details>

`@vielzeug/rune` is a zero-dependency logger that augments the native console with level filtering, namespace scopes, styled badges, and optional remote forwarding.


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
import { createLogger, Rune } from '@vielzeug/rune';

Rune.info('Boot complete');
Rune.warn('Cache stale');
Rune.fatal(new Error('unrecoverable')); // auto-serializes Error

const api = Rune.scope('api');
api.info({ method: 'GET', path: '/users' }, 'request');

// pin fields to every call — ideal for per-request context
const reqLog = api.withBindings({ requestId: 'abc-123' });
reqLog.info('processing');

const workerLog = createLogger({ logLevel: 'warn', namespace: 'worker' });

await workerLog.groupCollapsed('Job', async () => {
  await workerLog.time('process', () => runJob());
  workerLog.info('Done');
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
import { Rune } from '@vielzeug/rune';
const api = Rune.scope('api');
api.info({ data }, 'GET /users'); // filtered by log level, styled, optionally remote
```

| Feature           | Rune                                       | Winston       | Pino       | console |
| ----------------- | ------------------------------------------- | ------------- | ---------- | ------- |
| Bundle size       | <PackageInfo package="rune" type="size" /> | ~44 kB        | ~4 kB      | 0 kB    |
| Browser support   | ✅                                          | ❌            | ❌         | ✅      |
| Scoped loggers    | ✅                                          | Manual        | Child      | ❌      |
| Remote logging    | ✅ Built-in                                 | ✅ Transports | ✅ Streams | ❌      |
| Styled output     | ✅ CSS badges                               | Text only     | Text only  | Manual  |
| Zero dependencies | ✅                                          | ❌ (15+)      | ❌ (5+)    | N/A     |

**Use Rune when** you need isomorphic logging (browser + Node.js), namespaced module loggers, or remote error delivery without a heavy dependency chain.

**Consider alternatives when** you need high-throughput file-based logging (Pino), file rotation (Winston), or your team already uses a logging framework.

## Features

- Level filtering (`debug` to `off`) with `enabled()` checks, including `fatal` above `error`
- Structured call signature: `log.info('msg')`, `log.info({ key }, 'msg')`, `log.error(new Error())`
- Auto-serializes `Error` objects into `{ message, name, stack }` — survives JSON.stringify
- Pinned context bindings via `withBindings({ requestId })` — fields on every line
- Namespace composition (`scope`) and isolated clones (`child`)
- Styled browser output (`symbol`, `icon`, `text`)
- `time()`, `group()`, and `groupCollapsed()` wrappers that auto-close on throw/reject
- Structured remote payload: `{ level, message, context, env, namespace?, timestamp? }`
- Non-blocking remote forwarding with separate remote level threshold
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
- [Relay](/relay/)
- [Worker](/worker/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
