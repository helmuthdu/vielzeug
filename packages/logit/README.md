---
description: Browser/Node logger with levels, namespaces, timing helpers, and optional remote transport.
package: logit
category: logging
keywords: [logging, console, structured, scoped, remote-logging, levels, namespaces]
related: [fetchit, eventit, workit]
exports: [createLogger]
---

# @vielzeug/logit

> Browser/Node logger with levels, namespaces, timing helpers, and optional remote transport.

[![npm version](https://img.shields.io/npm/v/@vielzeug/logit)](https://www.npmjs.com/package/@vielzeug/logit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/logit` &nbsp;·&nbsp; **Category:** Logging

**Key exports:** `createLogger`

**When to use:** Browser/Node logger with levels, namespaces, timing helpers, and optional remote transport.

**Related:** [@vielzeug/fetchit](https://vielzeug.dev/fetchit/) · [@vielzeug/eventit](https://vielzeug.dev/eventit/) · [@vielzeug/workit](https://vielzeug.dev/workit/)

</details>

`@vielzeug/logit` is part of Vielzeug and ships as a zero-dependency TypeScript package with ESM+CJS output.

## Installation

```sh
pnpm add @vielzeug/logit
npm install @vielzeug/logit
yarn add @vielzeug/logit
```

## Quick Start

```ts
import { createLogger, Logit } from '@vielzeug/logit';

Logit.info({ port: 3000 }, 'Server started');
Logit.warn('High memory usage');
Logit.error(new Error('connection lost')); // auto-serializes Error
Logit.fatal('unrecoverable state');

const api = Logit.scope('api');
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

- [Overview](https://vielzeug.dev/logit/)
- [Usage Guide](https://vielzeug.dev/logit/usage)
- [API Reference](https://vielzeug.dev/logit/api)
- [Examples](https://vielzeug.dev/logit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
