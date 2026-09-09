# @vielzeug/conduit

> Typed dependency injection container

## Installation

```sh
pnpm add @vielzeug/conduit
npm install @vielzeug/conduit
yarn add @vielzeug/conduit
```

## Quick Start

```ts
import { createContainer, factoryProvider, token, valueProvider } from '@vielzeug/conduit';

const Config = token<{ baseUrl: string }>('Config');
const Client = token<{ url: string }>('Client');

const container = createContainer([
  valueProvider(Config, { baseUrl: '/api' }),
  factoryProvider(Client, [Config], (config) => ({ url: `${config.baseUrl}/users` })),
]);

const services = await container.resolve({ client: Client });
console.log(services.client);
await container.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/conduit/)
- [Usage Guide](https://vielzeug.dev/conduit/usage)
- [API Reference](https://vielzeug.dev/conduit/api)
- [Examples](https://vielzeug.dev/conduit/examples)
- [Migration Guide](https://vielzeug.dev/conduit/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
