---
title: Logit — Structured logging for TypeScript
description: Zero-dependency logging utility with log levels, scoped loggers, styled output, and remote logging. Works in both browser and Node.js.
---

<PackageBadges package="logit" />

<img src="/logo-logit.svg" alt="Logit Logo" width="156" class="logo-highlight"/>

# Logit

**Logit** is a zero-dependency logging utility with log levels, scoped loggers, styled output, and remote logging. Works in both browser and Node.js.

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

// Log at different levels
Logit.debug('Debugging info', { userId: '123' });
Logit.info('Server started', { port: 3000 });
Logit.success('User created');
Logit.warn('Memory usage high', { usage: '85%' });
Logit.error('Connection failed', new Error('Timeout'));

// Scoped logger — namespaced child, never mutates the parent
const api = Logit.scope('api');
api.info('GET /users'); // [api] GET /users
api.error('404 Not Found'); // [api] 404 Not Found

// Nest scopes (dot-separated)
const auth = api.scope('auth');
auth.info('Token validated'); // [api.auth] Token validated

// Create a fully isolated instance
const log = createLogger({ namespace: 'Worker', logLevel: 'warn' });

// Check whether a level passes the current filter
if (log.enabled('debug')) log.debug('verbose', buildDiagnostics());

// setConfig returns the logger for fluent chaining
Logit.setConfig({
  logLevel: 'warn', // Only warn + error
  variant: 'symbol', // Emoji badge indicators
  timestamp: true, // HH:MM:SS.mmm
  namespace: 'MyApp', // Prefix all global logs
});
```

## Features

- **Log levels** — `debug`, `trace`, `info`, `success`, `warn`, `error`; filter with `setConfig({ logLevel })`
- **Level query** — `enabled(type)` checks whether a level passes the current filter
- **Scoped loggers** — `scope(name)` and `child(overrides?)` return isolated instances that never mutate the parent
- **Styled output** — browser CSS badges with `symbol`, `icon`, or `text` variants
- **Remote logging** — non-blocking async handler for Sentry, Datadog, custom endpoints
- **Timing** — `time<T>(label, fn)` wraps `console.time/timeEnd`; returns `T`, fires `timeEnd` on throw/reject too
- **Groups** — `group<T>(label, fn, collapsed?)` wraps `console.group/groupEnd`; returns `T`, fires `groupEnd` on throw/reject too
- **Tables** — `table(data, properties?)` forwards to `console.table`
- **Assertions** — `assert(condition, ...args)` forwards to `console.assert`
- **Zero dependencies** — <PackageInfo package="logit" type="size" /> gzipped, <PackageInfo package="logit" type="dependencies" /> dependencies

## Next Steps

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| [Usage Guide](./usage.md) | Configuration, scoped loggers, remote logging, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation          |
| [Examples](./examples.md) | Real-world recipes and framework integrations              |
