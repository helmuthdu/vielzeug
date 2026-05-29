---
description: Structured browser/Node logger with levels, namespaces, pluggable transports, lazy bindings, and timing helpers.
package: rune
category: logging
keywords: [logging, console, structured, scoped, transports, remote-logging, levels, namespaces, lazy-bindings]
related: [courier, relay, worker]
exports: [createLogger, Rune, lazy, consoleTransport, remoteTransport, jsonTransport, batchTransport, sampleTransport, redactTransport]
---

# @vielzeug/rune

> Structured browser/Node logger with levels, namespaces, pluggable transports, lazy bindings, and timing helpers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/rune)](https://www.npmjs.com/package/@vielzeug/rune) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/rune` &nbsp;·&nbsp; **Category:** Logging

**Key exports:** `createLogger`, `Rune`, `lazy`, `consoleTransport`, `remoteTransport`, `jsonTransport`, `batchTransport`, `sampleTransport`, `redactTransport`

**When to use:** Structured browser/Node logging with log levels, namespaced scopes, lazy bindings, and a pluggable transport pipeline.

**Related:** [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/relay](https://vielzeug.dev/relay/) · [@vielzeug/worker](https://vielzeug.dev/worker/)

</details>

`@vielzeug/rune` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/rune
npm install @vielzeug/rune
yarn add @vielzeug/rune
```

## Quick Start

```ts
import { Rune, createLogger, lazy } from '@vielzeug/rune';
import { consoleTransport, jsonTransport, remoteTransport } from '@vielzeug/rune';

// Default singleton — uses consoleTransport() automatically
Rune.info({ port: 3000 }, 'server started');
Rune.warn('cache stale');
Rune.error(new Error('connection lost')); // auto-serializes Error

// Namespaced scopes
const api = Rune.scope('api');
api.info({ method: 'GET', path: '/users' }, 'request');

// Pinned bindings — lazy() evaluates only when the level passes
const reqLog = api.withBindings({
  requestId: 'abc-123',
  diagnostics: lazy(() => buildDiagnostics()),
});
reqLog.debug('processing'); // diagnostics() called only here

// Structured timing — emits { duration_ms } as a debug entry
const users = await reqLog.time('db.query', () => db.query('SELECT * FROM users'));

// Custom transport pipeline
const log = createLogger({
  logLevel: 'info',
  namespace: 'server',
  transports: [
    consoleTransport({ variant: 'symbol', timestamp: true }),
    remoteTransport(async (type, data) => {
      await fetch('/api/logs', { body: JSON.stringify(data), method: 'POST' });
    }, { level: 'error' }),
  ],
});

// Node.js: NDJSON for log aggregation (ELK, Datadog, etc.)
const nodeLog = createLogger({
  transports: [jsonTransport({ level: 'warn' })],
});
```

## Documentation

- [Overview](https://vielzeug.dev/rune/)
- [Usage Guide](https://vielzeug.dev/rune/usage)
- [API Reference](https://vielzeug.dev/rune/api)
- [Examples](https://vielzeug.dev/rune/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
