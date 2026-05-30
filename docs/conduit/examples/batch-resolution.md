---
title: 'Conduit Examples — Batch Resolution'
description: 'Batch resolution example for @vielzeug/conduit.'
---

## Batch Resolution

### Problem

Application startup requires several independent services to be initialized in parallel. Resolving them sequentially wastes time when the services have no interdependency.

### Solution

Use `Promise.all()` with multiple `container.resolve()` calls to initialize independent providers concurrently. Use `container.resolveMany()` only when one token intentionally has multiple providers.

#### Parallel resolution of independent tokens

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface Logger { log(msg: string): void }
interface Config { apiUrl: string }
interface Metrics { record(event: string): void }

const Logger = createToken<Logger>('Logger');
const Config = createToken<Config>('Config');
const Metrics = createToken<Metrics>('Metrics');

const container = createContainer();

container.value(Logger, console);
container.factory(Config, async () => fetch('/config.json').then((r) => r.json()));
container.factory(Metrics, async () => initMetrics());

// All three initialize concurrently
const [logger, config, metrics] = await Promise.all([
  container.resolve(Logger),
  container.resolve(Config),
  container.resolve(Metrics),
]);
```

#### Resolving multiple providers for one token

```ts
import { createContainer, createToken } from '@vielzeug/conduit';

interface Plugin { name: string; activate(): void }

const Plugin = createToken<Plugin>('Plugin');
const container = createContainer();

container.value(Plugin, { name: 'analytics', activate() {} }, { multi: true });
container.value(Plugin, { name: 'logger', activate() {} }, { multi: true });
container.value(Plugin, { name: 'devtools', activate() {} }, { multi: true });

const plugins = await container.resolveMany(Plugin);
plugins.forEach((p) => p.activate());
```

### Pitfalls

- `Promise.all()` fails fast — if any one factory rejects, the entire call rejects. Wrap individual calls in `resolveOptional()` when partial failure is acceptable.
- Calling `resolveMany()` on a token with a single non-multi provider throws `MultipleProvidersError`. Use `resolve()` for tokens that should have exactly one provider.

### Related

- [Multi Providers](./multi-providers.md)
- [Async Providers](./async-providers.md)
- [Basic Setup](./basic-setup.md)
