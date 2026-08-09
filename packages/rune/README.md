# @vielzeug/rune

> Structured browser/Node logger with levels, namespaces, pluggable transports, lazy bindings, and timing helpers.

[![npm version](https://img.shields.io/npm/v/@vielzeug/rune)](https://www.npmjs.com/package/@vielzeug/rune) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<details>
<summary>Quick Reference</summary>

**Package:** `@vielzeug/rune` &nbsp;·&nbsp; **Category:** Logging

**Key exports:** `createLogger`, `defaultLogger`, `lazy`, `consoleTransport`, `remoteTransport`, `jsonTransport`, `batchTransport`, `sampleTransport`, `redactTransport`, `pipe`, `isLevelEnabled`

**When to use:** Structured browser/Node logging with log levels, namespaced scopes, lazy bindings, and pluggable transport pipelines.

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
import { batchTransport, consoleTransport, createLogger, lazy, remoteTransport } from '@vielzeug/rune';

const log = createLogger({
  logLevel: 'debug',
  namespace: 'server',
  transports: [
    consoleTransport({ timestamp: true }),
    remoteTransport({
      handler: (_type, data) => console.debug('remote log', data),
      level: 'error',
    }),
  ],
});

const requestLog = log.withBindings({
  diagnostics: lazy(() => ({ queueDepth: 0 })),
  requestId: 'abc-123',
});

requestLog.info('request started');
const users = await requestLog.time('load users', () => Promise.resolve(['user-1']));
console.log(users);

const batch = batchTransport({ onFlush: (entries) => console.debug('batch', entries) });
const bufferedLog = createLogger({ transports: [batch.transport] });

bufferedLog.info('queued for delivery');
await batch.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/rune/)
- [Usage Guide](https://vielzeug.dev/rune/usage)
- [API Reference](https://vielzeug.dev/rune/api)
- [Examples](https://vielzeug.dev/rune/examples)
- [Migration Guide](https://vielzeug.dev/rune/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
