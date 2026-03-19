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

Logit.info('Server started', { port: 3000 });
Logit.warn('High memory usage');

const api = Logit.scope('api');
api.info('GET /users');

const log = createLogger({ logLevel: 'warn', namespace: 'Worker' });

if (log.enabled('debug')) {
  log.debug('Expensive diagnostics', buildDiagnostics());
}

await log.time('sync-task', async () => {
  await runTask();
});
```

## Features

- Log levels: `debug`, `trace`, `info`, `success`, `warn`, `error`, `off`
- `enabled(level)` guard for expensive payload computation
- Scoped logger composition via `scope(name)`
- Independent logger cloning via `child(overrides?)`
- Browser badge variants: `symbol`, `icon`, `text`
- Callback wrappers: `time(label, fn)` and `group(label, fn, collapsed?)`
- Console passthrough helpers: `assert`, `table`
- Remote log forwarding with independent threshold (`remote.logLevel`)
- Zero runtime dependencies

## Configuration

```ts
Logit.setConfig({
  environment: true,
  logLevel: 'warn',
  namespace: 'App',
  timestamp: true,
  variant: 'symbol',
  remote: {
    logLevel: 'error',
    handler: (type, data) => {
      void fetch('/api/logs', {
        body: JSON.stringify({ level: type, ...data }),
        method: 'POST',
      });
    },
  },
});

const cfg = Logit.config; // snapshot copy
```

## API At a Glance

- `createLogger(initial?) => Logger`
- `Logit` (default logger instance)
- `logger.setConfig(opts) => Logger`
- `logger.scope(name) => Logger`
- `logger.child(overrides?) => Logger`
- `logger.time(label, fn)`
- `logger.group(label, fn, collapsed?)`

## Documentation

- [Overview](https://vielzeug.dev/logit/)
- [Usage Guide](https://vielzeug.dev/logit/usage)
- [API Reference](https://vielzeug.dev/logit/api)
- [Examples](https://vielzeug.dev/logit/examples)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
