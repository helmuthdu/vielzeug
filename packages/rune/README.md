---
description: Browser/Node logger with levels, namespaces, timing helpers, and optional remote transport.
package: rune
category: logging
keywords: [logging, console, structured, scoped, remote-logging, levels, namespaces]
related: [courier, relay, worker]
exports: [createLogger]
---

# /rune

> Browser/Node logger with levels, namespaces, timing helpers, and optional remote transport.

[![npm version](https://img.shields.io/npm/v//rune)](https://www.npmjs.com/package//rune) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `/rune` &nbsp;·&nbsp; **Category:** Logging

**Key exports:** `createLogger`

**When to use:** Browser/Node logger with levels, namespaces, timing helpers, and optional remote transport.

**Related:** [@vielzeug/courier](https://vielzeug.dev/courier/) · [@vielzeug/relay](https://vielzeug.dev/relay/) · [@vielzeug/worker](https://vielzeug.dev/worker/)

</details>

`/rune` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add /rune
npm install /rune
yarn add /rune
```

## Quick Start

```ts
import { createLogger, Rune } from '/rune';

Rune.info({ port: 3000 }, 'Server started');
Rune.warn('High memory usage');
Rune.error(new Error('connection lost')); // auto-serializes Error
Rune.fatal('unrecoverable state');

const api = Rune.scope('api');
api.info({ method: 'GET', path: '/users' }, 'incoming request');

// pin fields to every call in a request context
const reqLog = api.withBindings({ requestId: 'abc-123' });
reqLog.info('processing');
reqLog.warn('slow query');

const log = createLogger({ logLevel: 'warn', namespace: 'Worker' });

if (log.enabled('debug')) {
  log.debug({ diagnostics: buildDiagnostics() }, 'diagnostics');
}

await log.time('sync-task', async () => {
  await runTask();
});
```

## Documentation

- [Overview](https://vielzeug.dev/rune/)
- [Usage Guide](https://vielzeug.dev/rune/usage)
- [API Reference](https://vielzeug.dev/rune/api)
- [Examples](https://vielzeug.dev/rune/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
