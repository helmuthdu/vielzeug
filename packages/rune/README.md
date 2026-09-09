# @vielzeug/rune

> Structured scoped logger with remote transport

## Installation

```sh
pnpm add @vielzeug/rune
npm install @vielzeug/rune
yarn add @vielzeug/rune
```

## Quick Start

```ts
import { consoleTransport, createLogger, jsonTransport, lazy } from '@vielzeug/rune';

const log = createLogger({
  logLevel: 'debug',
  namespace: 'server',
  transports: [
    consoleTransport({ timestamp: true }),
    jsonTransport({ level: 'error' }),
  ],
});

const requestLog = log.withBindings({
  diagnostics: lazy(() => ({ queueDepth: 0 })),
  requestId: 'abc-123',
});

requestLog.info('request started');
const users = await requestLog.time('load users', () => Promise.resolve(['user-1']));
console.log(users);
```

## Documentation

- [Overview](https://vielzeug.dev/rune/)
- [Usage Guide](https://vielzeug.dev/rune/usage)
- [API Reference](https://vielzeug.dev/rune/api)
- [Examples](https://vielzeug.dev/rune/examples)
- [Migration Guide](https://vielzeug.dev/rune/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
