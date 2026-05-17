# @vielzeug/logit

> Zero-dependency logger with levels, scoped namespaces, timing/group helpers, and optional remote transport.

[![npm version](https://img.shields.io/npm/v/@vielzeug/logit)](https://www.npmjs.com/package/@vielzeug/logit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`@vielzeug/logit` provides a browser/Node-friendly logger that wraps native console APIs with level filtering, namespacing, styled output, and non-blocking remote forwarding.

## Installation

```sh
pnpm add @vielzeug/logit
# npm install @vielzeug/logit
# yarn add @vielzeug/logit
```

## Entry Point

| Entry | Purpose |
| --- | --- |
| `@vielzeug/logit` | `createLogger`, `Logit`, and logger types |

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

## Features

- Log levels: `debug`, `info`, `warn`, `error`, `fatal`, `off`
- Structured call signature: `log.info('msg')`, `log.info({ key }, 'msg')`, `log.error(new Error())`
- Auto-serializes `Error` objects into `{ message, name, stack }` — survives `JSON.stringify`
- Pinned context bindings via `withBindings({ requestId })` — merged into every log call
- `enabled(level)` guard for expensive payload computation
- Scoped logger composition via `scope(name)`
- Independent logger cloning via `child(overrides?)`
- Browser badge variants: `symbol`, `icon`, `text`
- Callback wrappers: `time(label, fn)`, `group(label, fn)`, and `groupCollapsed(label, fn)`
- Structured remote payload: `{ level, message, context, env, namespace?, timestamp? }`
- Remote log forwarding with independent threshold (`remote.logLevel`)
- Zero runtime dependencies

## Configuration

```ts
const Log = Logit.child({
  logLevel: 'warn',
  namespace: 'App',
  timestamp: true,
  variant: 'symbol',
  remote: {
    logLevel: 'error',
    handler: (type, data) => {
      // data: { level, message, context, env, namespace?, timestamp? }
      void fetch('/api/logs', {
        body: JSON.stringify(data),
        method: 'POST',
      });
    },
  },
});

const cfg = Log.config; // snapshot copy
```

## API At a Glance

- `createLogger(initial?) => Logger`
- `Logit` (default logger instance)
- `logger.scope(name) => Logger`
- `logger.child(overrides?) => Logger`
- `logger.withBindings(bindings) => Logger`
- `logger.bindings` (readonly snapshot)
- `logger.time(label, fn)`
- `logger.group(label, fn)`
- `logger.groupCollapsed(label, fn)`

Structured context is always passed first: `logger.info({ userId: 42 }, 'signed in')`. String-first calls accept only a single message argument.

## Documentation

- [Overview](https://vielzeug.dev/logit/)
- [Usage Guide](https://vielzeug.dev/logit/usage)
- [API Reference](https://vielzeug.dev/logit/api)
- [Examples](https://vielzeug.dev/logit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
