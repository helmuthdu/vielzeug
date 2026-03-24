---
title: Logit — Structured logging for TypeScript
description: Browser/Node logger with levels, namespaces, timing helpers, and optional remote transport.
---

<PackageBadges package="logit" />

<img src="/logo-logit.svg" alt="Logit logo" width="156" class="logo-highlight"/>

# Logit

`@vielzeug/logit` is a zero-dependency logger that augments the native console with level filtering, namespace scopes, styled badges, and optional remote forwarding.

<!-- Search keywords: structured logging, logger namespaces, browser node logging. -->

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/logit
```

```sh [npm]
npm install @vielzeug/logit
```

```sh [yarn]
yarn add @vielzeug/logit
```

:::

## Quick Start

```ts
import { createLogger, Logit } from '@vielzeug/logit';

Logit.info('Boot complete');
Logit.warn('Cache stale');

const api = Logit.scope('api');
api.info('GET /users');

const workerLog = createLogger({ logLevel: 'warn', namespace: 'worker' });

await workerLog.group(
  'Job',
  async () => {
    await workerLog.time('process', () => runJob());
    workerLog.success('Done');
  },
  true,
);
```

## Why Logit?

Plain `console.log` lacks structure: no log levels, no namespacing, no remote delivery, no way to silence logs in production.

```ts
// Before — manual approach
if (process.env.NODE_ENV !== 'production') {
  console.log('[api] GET /users', data);
}
fetch('/api/logs', { method: 'POST', body: JSON.stringify({ level: 'error', msg }) });

// After — Logit
import { Logit } from '@vielzeug/logit';
const api = Logit.scope('api');
api.info('GET /users', data); // filtered by log level, styled, optionally remote
```

| Feature           | Logit                                       | Winston       | Pino       | console |
| ----------------- | ------------------------------------------- | ------------- | ---------- | ------- |
| Bundle size       | <PackageInfo package="logit" type="size" /> | ~44 kB        | ~4 kB      | 0 kB    |
| Browser support   | ✅                                          | ❌            | ❌         | ✅      |
| Scoped loggers    | ✅                                          | Manual        | Child      | ❌      |
| Remote logging    | ✅ Built-in                                 | ✅ Transports | ✅ Streams | ❌      |
| Styled output     | ✅ CSS badges                               | Text only     | Text only  | Manual  |
| Zero dependencies | ✅                                          | ❌ (15+)      | ❌ (5+)    | N/A     |

**Use Logit when** you need isomorphic logging (browser + Node.js), namespaced module loggers, or remote error delivery without a heavy dependency chain.

**Consider alternatives when** you need high-throughput file-based logging (Pino), file rotation (Winston), or your team already uses a logging framework.

## Features

- Level filtering (`debug` to `off`) with `enabled()` checks
- Namespace composition (`scope`) and isolated clones (`child`)
- Styled browser output (`symbol`, `icon`, `text`)
- `time()` and `group()` wrappers that auto-close on throw/reject
- Non-blocking remote forwarding with separate remote level threshold
- `assert()` and `table()` passthrough helpers
- Zero dependencies — <PackageInfo package="logit" type="size" /> gzipped

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Fetchit](/fetchit/)
- [Eventit](/eventit/)
- [Workit](/workit/)
