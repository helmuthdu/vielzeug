# @vielzeug/herald

> Typed synchronous event bus with wildcard subscriptions, one-shot waits, and lifecycle tracing

## Installation

```sh
pnpm add @vielzeug/herald
npm install @vielzeug/herald
yarn add @vielzeug/herald
```

## Quick Start

```ts
import { createBus } from '@vielzeug/herald';

interface AppEvents {
  'user:login': { userId: string };
  'user:logout': void;
}

using bus = createBus<AppEvents>({ name: 'app' });
const stop = bus.on('user:login', ({ userId }) => console.log(userId));

bus.emit('user:login', { userId: '42' });
bus.emit('user:logout');
stop();
```

## Documentation

- [Overview](https://vielzeug.dev/herald/)
- [Usage Guide](https://vielzeug.dev/herald/usage)
- [API Reference](https://vielzeug.dev/herald/api)
- [Examples](https://vielzeug.dev/herald/examples)
- [Migration Guide](https://vielzeug.dev/herald/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
