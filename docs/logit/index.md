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
import { Logit } from '@vielzeug/logit';

// Log at different levels
Logit.debug('Debugging info', { userId: '123' });
Logit.info('Server started', { port: 3000 });
Logit.success('User created');
Logit.warn('Memory usage high', { usage: '85%' });
Logit.error('Connection failed', new Error('Timeout'));

// Scoped logger (recommended for modules)
const api = Logit.scope('api');
api.info('GET /users');        // [api] GET /users
api.error('404 Not Found');    // [api] 404 Not Found

// Nest scopes
const auth = api.scope('auth');
auth.info('Token validated');  // [api.auth] Token validated

// Configure once globally
Logit.config({
  logLevel: 'warn',    // Only warn + error
  variant: 'symbol',   // Emoji badge indicators
  timestamp: true,     // HH:MM:SS.mmm
  namespace: 'MyApp',  // Prefix all global logs
});
```

## Features

- **Log levels** — `debug`, `trace`, `info`, `success`, `warn`, `error`; filter with `config({ logLevel })`
- **Scoped loggers** — namespaced child loggers that don\'t mutate global state
- **Styled output** — browser CSS badges with `symbol`, `icon`, or `text` variants
- **Remote logging** — non-blocking async handler for Sentry, Datadog, custom endpoints
- **Timing & tables** — `time/timeEnd` and `table` backed by native console APIs
- **Group collapsing** — `groupCollapsed/groupEnd` for structured log sections
- **Assertions** — `assert(condition, msg)` logs when condition is false
- **Zero dependencies** — <PackageInfo package="logit" type="size" /> gzipped, <PackageInfo package="logit" type="dependencies" /> dependencies

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Configuration, scoped loggers, remote logging, and testing |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world recipes and framework integrations |
