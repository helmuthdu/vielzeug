# @vielzeug/rune

> Structured browser/Node logger with levels, namespaces, pluggable transports, lazy bindings, and timing helpers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/rune)](https://www.npmjs.com/package/@vielzeug/rune) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/rune` &nbsp;·&nbsp; **Category:** Logging

**Key exports:** `createLogger`, `defaultLogger`, `lazy`, `consoleTransport`, `remoteTransport`, `jsonTransport`, `batchTransport`, `sampleTransport`, `redactTransport`, `pipe`, `isLevelEnabled`

**When to use:** Structured browser/Node logging with log levels, namespaced scopes, lazy bindings, and a pluggable transport pipeline.

**Related:** [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/herald](https://vielzeug.dev/herald/) · [@vielzeug/familiar](https://vielzeug.dev/familiar/)

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
import { createLogger, defaultLogger, lazy } from '@vielzeug/rune';
import { consoleTransport, jsonTransport, remoteTransport, sampleTransport } from '@vielzeug/rune';

// Default singleton — uses consoleTransport() automatically
defaultLogger.info({ port: 3000 }, 'server started');
defaultLogger.warn('cache stale');
defaultLogger.error(new Error('connection lost')); // auto-serializes Error

// Namespaced child loggers
const api = createLogger('api');
api.info({ method: 'GET', path: '/users' }, 'request');

// Pinned bindings — lazy() evaluates only when the level passes
const reqLog = api.withBindings({
  requestId: 'abc-123',
  diagnostics: lazy(() => buildDiagnostics()),
});
reqLog.debug('processing'); // diagnostics() called only here

// Structured timing — label is the message; emits { duration_ms } in context
const users = await reqLog.time('db.query', () => db.query('SELECT * FROM users'));

// Custom transport pipeline
const log = createLogger({
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

// Node.js: NDJSON for log aggregation (ELK, Datadog, etc.)
const nodeLog = createLogger({
  transports: [jsonTransport({ level: 'warn' })],
});

// Fan-out to multiple transports independently (errors in one don't block others)
import { pipe } from '@vielzeug/rune';
const fanout = pipe(consoleTransport(), remoteTransport({ handler, level: 'error' }));

// Sampling — drop 90 % of debug entries before they reach the downstream transport
const sampledLog = createLogger({
  logLevel: 'debug',
  transports: [sampleTransport({ rate: 0.1, transport: consoleTransport() })],
});
```

## Documentation

- [Overview](https://vielzeug.dev/rune/)
- [Usage Guide](https://vielzeug.dev/rune/usage)
- [API Reference](https://vielzeug.dev/rune/api)
- [Examples](https://vielzeug.dev/rune/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
